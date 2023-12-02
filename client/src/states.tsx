import * as Jotai from "jotai";
import * as JotaiU from "jotai/utils";
import * as React from "react";
import * as Idb from "idb";
import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";

import * as Auth from "./auth";
import * as types from "./types";
import * as producer from "./producer";
import * as ops from "./ops";
import * as nap from "./next_action_predictor";
import * as rtk from "./rtk";
import * as reducers from "./reducers";
import * as undoable from "./undoable";
import * as queues from "./queues";
import * as retryers from "./retryers";
import * as storage from "./storage";
import * as swapper from "./swapper";
import * as utils from "./utils";
import createClient from "openapi-fetch";
import * as v2 from "src/gen/api/v2";

type TClientV2 = ReturnType<typeof createClient<v2.paths>>;

const retryer = new retryers.Retryer();

export const nodeFilterQueryState = Jotai.atom("");
export const nodeIdsState = Jotai.atom("");

const get_client_id = async (
  client_v2: TClientV2,
  db: Awaited<ReturnType<typeof storage.getDb>>,
  id_token: Auth.TIdToken,
) => {
  let client_id = await db.get("numbers", "client_id");
  if (client_id === undefined) {
    const resp = await client_v2.POST("/users/{user_id}/clients", {
      params: { path: { user_id: id_token.user_id } },
      body: { name: navigator.userAgent },
      headers: { authorization: utils.get_bearer(id_token) },
    });
    if (resp.data === undefined) {
      throw new Error("createClient returned no client_id");
    }
    client_id = resp.data.client_id;
    const tx = db.transaction("numbers", "readwrite");
    const store = tx.objectStore("numbers");
    const val = await store.get("client_id");
    if (val !== undefined) {
      client_id = val;
    } else {
      await store.put(client_id, "client_id");
    }
    await tx.done;
  }
  return client_id;
};

const get_state_and_patch = async (arg: {
  head: storage.THead;
  db: Awaited<ReturnType<typeof storage.getDb>>;
}) => {
  // Populate data.
  const t1 = performance.now();
  const loaded = await storage.get_patches_for_local_head(arg);
  let snapshot = loaded.snapshot;
  {
    for (const patch of loaded.patches) {
      snapshot = producer.apply_patch(
        snapshot,
        patch.patch,
        undefined,
        true,
      ).newDocument;
    }
    const t2 = performance.now();
    if (2000 < t2 - t1) {
      await arg.db.put("snapshots", {
        client_id: arg.head.client_id,
        session_id: arg.head.session_id,
        patch_id: arg.head.patch_id,
        snapshot: snapshot,
        created_at: new Date(),
      });
    }
  }

  // Set up the state
  let state: types.TState;
  let patch: producer.TOperation[];
  if (snapshot.data === null) {
    state = ops.emptyStateOf();
    const produced = producer.produce_with_patche(snapshot, (draft) => {
      draft.data = state.data;
    });
    patch = produced.patch;
  } else {
    const parsed_data = types.parse_data({ data: snapshot.data });
    if (!parsed_data.success) {
      throw new Error(`parse_data failed ${JSON.stringify(snapshot)}`);
    }
    const caches: types.TCaches = {};
    for (const node_id in parsed_data.data.nodes) {
      if (types.is_TNodeId(node_id)) {
        const node = parsed_data.data.nodes[node_id];
        let n_hidden_child_edges = 0;
        for (const edge_id of ops.keys_of(node.children)) {
          if (parsed_data.data.edges[edge_id].hide) {
            ++n_hidden_child_edges;
          }
        }
        caches[node_id] = ops.new_cache_of(
          n_hidden_child_edges,
          node.text_patches,
        );
      }
    }
    const todo_node_ids = [];
    const non_todo_node_ids = [];
    for (const node_id of ops.sorted_keys_of(parsed_data.data.queue)) {
      if (parsed_data.data.nodes[node_id].status === "todo") {
        todo_node_ids.push(node_id);
      } else {
        non_todo_node_ids.push(node_id);
      }
    }

    state = {
      data: parsed_data.data,
      caches,
      predicted_next_nodes: [],
      swapped_caches: swapper.swapKeys(caches),
      swapped_edges: swapper.swapKeys(parsed_data.data.edges),
      swapped_nodes: swapper.swapKeys(parsed_data.data.nodes),
      todo_node_ids,
      non_todo_node_ids,
    };
    patch = parsed_data.patch;
  }
  return { state, patch };
};

class WeakMapV<K extends object, V> extends WeakMap<K, V> {
  get = (k: K) => {
    const res = super.get(k);
    if (res === undefined) {
      throw new Error(`get returned undefined for ${JSON.stringify(k)}`);
    }
    return res;
  };
}

export const show_mobile_atom_map = new WeakMapV<
  { user_id: string; session_id: number },
  ReturnType<typeof JotaiU.atomWithStorage<boolean>>
>();
export const show_todo_only_atom_map = new WeakMapV<
  { user_id: string; session_id: number },
  ReturnType<typeof JotaiU.atomWithStorage<boolean>>
>();
export const show_strong_edge_only_atom_map = new WeakMapV<
  { user_id: string; session_id: number },
  ReturnType<typeof JotaiU.atomWithStorage<boolean>>
>();
export const showMobileUpdatedAtAtomMap = new WeakMapV<
  { user_id: string; session_id: number },
  ReturnType<typeof JotaiU.atomWithStorage<number>>
>();
export const pinQueueAtomMap = new WeakMapV<
  { user_id: string; session_id: number },
  ReturnType<typeof JotaiU.atomWithStorage<boolean>>
>();
export const ganttZoomAtomMap = new WeakMapV<
  { user_id: string; session_id: number },
  ReturnType<typeof JotaiU.atomWithStorage<types.TGanttZoom>>
>();
export const showGanttAtomMap = new WeakMapV<
  { user_id: string; session_id: number },
  ReturnType<typeof JotaiU.atomWithStorage<boolean>>
>();

export const session_key_context = React.createContext({
  user_id: "",
  client_id: -1,
  session_id: -1,
});

// The following code involves 7 distinct heads. These are:
//
// 1. A remote head that is stored persistently on the API server.
// 2. A per-session remote head that is stored in memory.
//    This head is used to detect changes to the remote head and is written to IndexedDB upon change.
// 3. A per-session last-push head that is stored in memory.
//    This head is used to memoize the last synced patch, and should be used by the `UpdateHead` function.
// 4. A remote head that is persisted on IndexedDB.
//    This head is used as the initial value for head 2.
//    In the case of multiple sessions (tabs), the most recently written value wins.
// 5. A local head that is persisted on IndexedDB.
//    This head is used as the initial value for head 6.
//    In the case of multiple sessions (tabs), the most recently written value wins.
// 6. A per-session parent head that is stored in memory.
//    This head is used to provide `parent_client_id`, `parent_session_id`, and `parent_patch_id` for `#save_patch`.
//    The value is initialized from head 5.
// 7. A per-session next-patch head that is stored in memory.
//    This head is used to provide `client_id`, `session_id`, and `patch_id` for `#save_patch`.
//    The value is initialized with `client_id`, `session_id`, and `patch_id = 0`.
export class PersistentStateManager {
  client_v2: TClientV2;
  db: Awaited<ReturnType<typeof storage.getDb>>;
  client_id: number;
  session_id: number;
  heads: {
    remote: storage.THead;
    sync: null | storage.THead;
    parent: storage.THead;
    child: storage.THead;
  };
  id_token: Auth.TIdToken;
  session_key: { user_id: string; client_id: number; session_id: number };
  reduxStore: ReturnType<typeof this.get_redux_store>;
  #patch_queue: queues.Queue<null | storage.TPatchValue> = new queues.Queue();
  #head_queue: queues.Queue<null | storage.THead> = new queues.Queue();
  #rpc_queue: queues.Queue<null | (() => Promise<void>)> = new queues.Queue();
  #sync_store: ReturnType<typeof _get_store> = _get_store();
  constructor(
    client_v2: TClientV2,
    db: Awaited<ReturnType<typeof storage.getDb>>,
    client_id: number,
    session_id: number,
    heads: {
      remote: storage.THead;
      sync: null;
      parent: storage.THead;
      child: storage.THead;
    },
    id_token: Auth.TIdToken,
  ) {
    this.client_v2 = client_v2;
    this.db = db;
    this.client_id = client_id;
    this.session_id = session_id;
    this.heads = heads;
    this.id_token = id_token;
    this.session_key = {
      user_id: id_token.user_id,
      client_id,
      session_id,
    };
    this.reduxStore = this.get_redux_store({ ...heads.parent });
    void this.#run_rpc_loop();
    void this.#run_push_local_patches_loop();
    void this.#run_patch_saving_loop();
  }

  stop = () => {
    this.#patch_queue.push(null);
    this.#head_queue.push(null);
    this.#rpc_queue.push(null);
  };

  get_redux_store = async (local_head: storage.THead) => {
    const { state, patch } = await get_state_and_patch({
      head: local_head,
      db: this.db,
    });

    // Try to sync `local_head` to the remote.
    this.#head_queue.push(local_head);
    // Save `patch`.
    this.#save_patch({
      patch,
    });

    // Set up the next action predictor.
    const next_action_predictor3 = new nap.TriGramPredictor<types.TNodeId>(0.9);
    const next_action_predictor2 = new nap.BiGramPredictor<types.TNodeId>(0.9);
    const n_predicted = 10;
    {
      const start_time_and_node_id_list: [number, types.TNodeId][] = [];
      for (const node_id of state.todo_node_ids) {
        const node = state.data.nodes[node_id];
        for (const range of node.ranges) {
          start_time_and_node_id_list.push([range.start, node_id]);
        }
      }
      start_time_and_node_id_list.sort((a, b) => a[0] - b[0]);
      for (const [_, node_id] of start_time_and_node_id_list) {
        next_action_predictor3.fit(node_id);
        next_action_predictor2.fit(node_id);
      }
      reducers.set_predicted_next_nodes(
        state,
        n_predicted,
        next_action_predictor2,
        next_action_predictor3,
      );
    }

    // Create the store
    const root_reducer = rtk.reducer_with_patch_of<types.TState>(
      state,
      reducers.get_root_reducer_def(
        next_action_predictor2,
        next_action_predictor3,
        n_predicted,
      ),
    );
    const store = createStore(
      reducers.reducer_of_reducer_with_patch(
        this.#with_save_patch(
          undoable.undoable_of(root_reducer, undoable.history_type_set, state),
        ),
      ),
      applyMiddleware(thunk),
    );
    return store;
  };

  #with_save_patch = (
    reducer_with_patch: (
      state: undefined | types.TState,
      action: types.TAnyPayloadAction,
    ) => {
      state: types.TState;
      patch: producer.TOperation[];
    },
  ) => {
    const patch_saver = (
      state: undefined | types.TState,
      action: types.TAnyPayloadAction,
    ) => {
      if (state === undefined) {
        return reducer_with_patch(state, action);
      }
      const reduced = reducer_with_patch(state, action);
      this.#save_patch({ patch: reduced.patch });
      return reduced;
    };
    return patch_saver;
  };

  #push_and_remove_local_pending_patches = async () => {
    const bearer = utils.get_bearer(this.id_token);
    let n_total = 0;
    while (true) {
      const heads = await this.db.getAll("pending_patches", undefined, 200);
      if (heads.length < 1) {
        return n_total;
      }
      n_total += heads.length;
      {
        const tx = this.db.transaction("patches", "readonly");
        const store = tx.objectStore("patches");
        const patches: v2.components["schemas"]["Patch"][] = [];
        for (const head of heads) {
          const p = await store.get([
            head.client_id,
            head.session_id,
            head.patch_id,
          ]);
          if (p === undefined) {
            throw new Error(`Patch not found: ${JSON.stringify(head)}`);
          }
          patches.push({
            patch_key: {
              client_id: p.client_id,
              session_id: p.session_id,
              patch_id: p.patch_id,
            },
            parent_patch_key: {
              client_id: p.parent_client_id,
              session_id: p.parent_session_id,
              patch_id: p.parent_patch_id,
            },
            created_at: p.created_at.toISOString(),
            patch: p.patch,
          });
        }
        await tx.done;
        await this.#push_rpc(() =>
          retryer.with_retry(async () => {
            await this.client_v2.POST("/users/{user_id}/patches:batch", {
              params: { path: { user_id: this.id_token.user_id } },
              body: {
                patches,
              },
              headers: { authorization: bearer },
            });
          }),
        );
      }
      {
        const tx = this.db.transaction("pending_patches", "readwrite");
        const store = tx.objectStore("pending_patches");
        for (const head of heads) {
          void store.delete([head.client_id, head.session_id, head.patch_id]);
        }
        await tx.done;
      }
    }
  };

  #save_remote_head = async (
    head: storage.THead,
    store?: Idb.IDBPObjectStore<
      storage.TDb,
      "heads"[] | ("heads" | "patches" | "pending_patches")[],
      "heads",
      "readwrite"
    >,
  ) => {
    if (store === undefined) {
      const tx = this.db.transaction("heads", "readwrite");
      store = tx.objectStore("heads");
    }
    await store.put(head, "remote");
    this.heads.remote.client_id = head.client_id;
    this.heads.remote.session_id = head.session_id;
    this.heads.remote.patch_id = head.patch_id;
  };

  #update_remote_head_if_not_modified = async () => {
    const bearer = utils.get_bearer(this.id_token);
    if (this.heads.sync === null) {
      return;
    }
    const sync_head = { ...this.heads.sync };
    if (
      sync_head.client_id === this.heads.remote.client_id &&
      sync_head.session_id === this.heads.remote.session_id &&
      sync_head.patch_id === this.heads.remote.patch_id
    ) {
      return;
    }
    const resp = await this.#push_rpc(() =>
      retryer.with_retry(async () => {
        return await this.client_v2.PUT("/users/{user_id}/head", {
          params: { path: { user_id: this.id_token.user_id } },
          headers: { authorization: bearer },
          body: {
            patch_key: {
              client_id: sync_head.client_id,
              session_id: sync_head.session_id,
              patch_id: sync_head.patch_id,
            },
            header_if_match: {
              client_id: this.heads.remote.client_id,
              session_id: this.heads.remote.session_id,
              patch_id: this.heads.remote.patch_id,
            },
          },
        });
      }),
    );
    if (resp.data === undefined) {
      throw new Error(JSON.stringify(resp.error));
    }
    if (resp.data.updated) {
      await this.#save_remote_head(sync_head);
    } else {
      const resp = await this.#push_rpc(() =>
        get_remote_head_and_save_remote_pending_patches(
          this.client_id,
          this.client_v2,
          this.id_token,
          this.db,
          retryer.with_retry,
        ),
      );
      this.#sync_store.set_state(() => {
        return {
          updated_at: resp.created_at,
          name: resp.name,
          head: {
            client_id: resp.client_id,
            session_id: resp.session_id,
            patch_id: resp.patch_id,
          },
        };
      });
    }
  };

  #push_rpc = <T,>(rpc: () => Promise<T>) => {
    return new Promise<T>((resolve, reject) => {
      this.#rpc_queue.push(() => rpc().then(resolve).catch(reject));
    });
  };

  #run_rpc_loop = async () => {
    while (true) {
      const rpc = await this.#rpc_queue.pop();
      if (rpc === null) {
        return;
      }
      try {
        await rpc();
      } catch {
        // Ignore errors.
      }
    }
  };

  #run_push_local_patches_loop = async () => {
    while (true) {
      const head = await this.#head_queue.pop();
      if (head === null) {
        return;
      }
      await this.#push_and_remove_local_pending_patches();
      if (this.heads.sync === null) {
        this.heads.sync = { ...head };
      } else {
        this.heads.sync.client_id = head.client_id;
        this.heads.sync.session_id = head.session_id;
        this.heads.sync.patch_id = head.patch_id;
      }
      await this.#update_remote_head_if_not_modified();
    }
  };

  #run_patch_saving_loop = async () => {
    while (true) {
      const patch = await this.#patch_queue.pop();
      if (patch === null) {
        return;
      }

      const head = {
        client_id: patch.client_id,
        session_id: patch.session_id,
        patch_id: patch.patch_id,
      };
      const tx = this.db.transaction(
        ["patches", "pending_patches", "heads"],
        "readwrite",
      );
      const patches_store = tx.objectStore("patches");
      const pending_patches_store = tx.objectStore("pending_patches");
      const heads_store = tx.objectStore("heads");
      await patches_store.put(patch);
      await pending_patches_store.put(head);
      await heads_store.put(head, "local");
      await tx.done;
      this.#head_queue.push(head);
    }
  };

  #save_patch = (arg: { patch: producer.TOperation[] }) => {
    const patch = arg.patch.filter((patch) => patch.path.startsWith("/data"));
    if (patch.length < 1) {
      return;
    }
    this.#patch_queue.push({
      patch: patch,
      created_at: new Date(),
      parent_client_id: this.heads.parent.client_id,
      parent_session_id: this.heads.parent.session_id,
      parent_patch_id: this.heads.parent.patch_id,
      client_id: this.heads.child.client_id,
      session_id: this.heads.child.session_id,
      patch_id: this.heads.child.patch_id,
    });
    this.heads.parent.client_id = this.heads.child.client_id;
    this.heads.parent.session_id = this.heads.child.session_id;
    this.heads.parent.patch_id = this.heads.child.patch_id;
    ++this.heads.child.patch_id;
  };

  Component = () => {
    const state = React.useSyncExternalStore(
      this.#sync_store.subscribe,
      this.#sync_store.get_state,
    );
    const use_remote = React.useCallback(async () => {
      await this.check_remote_head();
      const state = this.#sync_store.get_state();
      if (state === null) {
        return;
      }
      const tx = this.db.transaction("heads", "readwrite");
      const store = tx.objectStore("heads");
      await this.#save_remote_head(state.head, store);
      await store.put(state.head, "local");
      await tx.done;
      window.location.reload();
    }, []);
    const use_local = React.useCallback(async () => {
      await this.#push_and_remove_local_pending_patches();
      const new_head =
        this.heads.sync === null
          ? { ...this.heads.remote }
          : { ...this.heads.sync };
      await this.#push_rpc(() => {
        return this.client_v2.PUT("/users/{user_id}/head", {
          params: { path: { user_id: this.id_token.user_id } },
          body: {
            patch_key: {
              client_id: new_head.client_id,
              session_id: new_head.session_id,
              patch_id: new_head.patch_id,
            },
          },
          headers: { authorization: utils.get_bearer(this.id_token) },
        });
      });
      await this.#save_remote_head(new_head);
      this.#sync_store.set_state(() => null);
    }, []);
    if (state === null) {
      return null;
    }
    return (
      <div className="flex justify-center h-[100vh] w-full items-center fixed z-50 top-0 left-0 pt-[1em] pb-[1em]">
        <div className="w-[80vw] bg-neutral-200 dark:bg-neutral-900">
          <div className="flex justify-center">
            <button onClick={use_remote} className="btn-icon">
              Reload
            </button>
          </div>
          <div>
            The remote head have been updated by {state.name}{" "}
            {JSON.stringify(state.head)} (expected{" "}
            {JSON.stringify(this.heads.remote)}) at {state.updated_at}.
          </div>
          <div className="flex justify-center">
            <button onClick={use_local} className="btn-icon">
              Use current
            </button>
          </div>
        </div>
      </div>
    );
  };

  useCheckUpdates = () => {
    React.useEffect(() => {
      let awaited = false;
      const handle_focus = async () => {
        if (awaited) {
          return;
        }
        if (document.hidden) {
          return;
        }
        try {
          awaited = true;
          await retryers.get_online_promise();
          await this.check_remote_head();
        } finally {
          awaited = false;
        }
      };

      window.addEventListener("focus", handle_focus);
      window.addEventListener("visibilitychange", handle_focus);

      // Check for update on load.
      void handle_focus();

      return () => {
        window.removeEventListener("focus", handle_focus);
        window.removeEventListener("visibilitychange", handle_focus);
      };
    }, []);
  };
  check_remote_head = async () => {
    const resp = await this.#push_rpc(() =>
      get_remote_head_and_save_remote_pending_patches(
        this.client_id,
        this.client_v2,
        this.id_token,
        this.db,
      ),
    );
    if (
      resp.client_id !== this.heads.remote.client_id ||
      resp.session_id !== this.heads.remote.session_id ||
      resp.patch_id !== this.heads.remote.patch_id
    ) {
      this.#sync_store.set_state(() => {
        return {
          updated_at: resp.created_at,
          name: resp.name,
          head: {
            client_id: resp.client_id,
            session_id: resp.session_id,
            patch_id: resp.patch_id,
          },
        };
      });
    }
  };
}

export const getPersistentStateManager = async (
  id_token: Auth.TIdToken,
  auth: Auth.Auth,
) => {
  // Open DB
  const db = await storage.getDb(`user-${id_token.user_id}`);
  const client_v2 = createClient<v2.paths>({ baseUrl: window.location.origin });

  // Set client_id
  const client_id = await get_client_id(client_v2, db, id_token);

  // Set session_id
  const session_id = await (async () => {
    const tx = db.transaction("numbers", "readwrite");
    const store = tx.objectStore("numbers");
    const session_id = ((await store.get("session_id")) || 0) + 1;
    await store.put(session_id, "session_id");
    await tx.done;
    return session_id;
  })();

  // Check if current patch info exists.
  const tx = db.transaction("heads", "readonly");
  const heads_store = tx.objectStore("heads");
  let local_head = await heads_store.get("local");
  let remote_head = await heads_store.get("remote");
  await tx.done;
  // On the first time, fetch remote head and save it.
  if (local_head === undefined || remote_head === undefined) {
    const resp = await get_remote_head_and_save_remote_pending_patches(
      client_id,
      client_v2,
      id_token,
      db,
    );
    const remote_head_fetched = {
      client_id: resp.client_id,
      session_id: resp.session_id,
      patch_id: resp.patch_id,
    };
    const tx = db.transaction("heads", "readwrite");
    const heads_store = tx.objectStore("heads");
    let local_head2 = await heads_store.get("local");
    let remote_head2 = await heads_store.get("remote");
    if (local_head2 === undefined || remote_head2 === undefined) {
      await heads_store.put({ ...remote_head_fetched }, "local");
      await heads_store.put({ ...remote_head_fetched }, "remote");
      local_head2 = { ...remote_head_fetched };
      remote_head2 = { ...remote_head_fetched };
    }
    await tx.done;
    local_head = local_head2;
    remote_head = remote_head2;
  }

  const res = new PersistentStateManager(
    client_v2,
    db,
    client_id,
    session_id,
    {
      sync: null,
      remote: { ...remote_head },
      parent: { ...local_head },
      child: { client_id, session_id, patch_id: 0 },
    },
    id_token,
  );
  auth.on_change((idToken: null | Auth.TIdToken) => {
    if (idToken === null) {
      res.stop();
    }
  });

  // Create atoms
  if (!show_mobile_atom_map.has(res.session_key)) {
    show_mobile_atom_map.set(
      res.session_key,
      JotaiU.atomWithStorage(
        `${id_token.user_id}/show_mobile`,
        utils.get_is_mobile(),
      ),
    );
  }
  if (!show_todo_only_atom_map.has(res.session_key)) {
    show_todo_only_atom_map.set(
      res.session_key,
      JotaiU.atomWithStorage(`${id_token.user_id}/show_todo_only`, false),
    );
  }
  if (!show_strong_edge_only_atom_map.has(res.session_key)) {
    show_strong_edge_only_atom_map.set(
      res.session_key,
      JotaiU.atomWithStorage(
        `${id_token.user_id}/show_strong_edge_only`,
        false,
      ),
    );
  }
  if (!showMobileUpdatedAtAtomMap.has(res.session_key)) {
    showMobileUpdatedAtAtomMap.set(
      res.session_key,
      JotaiU.atomWithStorage(
        `${id_token.user_id}/showMobileUpdatedAt`,
        Date.now(),
      ),
    );
  }
  if (!pinQueueAtomMap.has(res.session_key)) {
    pinQueueAtomMap.set(
      res.session_key,
      JotaiU.atomWithStorage(`${id_token.user_id}/pinQueue`, true),
    );
  }
  if (!ganttZoomAtomMap.has(res.session_key)) {
    ganttZoomAtomMap.set(
      res.session_key,
      JotaiU.atomWithStorage<types.TGanttZoom>(
        `${id_token.user_id}/ganttZoom`,
        "D",
      ),
    );
  }
  if (!showGanttAtomMap.has(res.session_key)) {
    showGanttAtomMap.set(
      res.session_key,
      JotaiU.atomWithStorage(`${id_token.user_id}/showGantt`, true),
    );
  }

  return res;
};

const get_remote_head_and_save_remote_pending_patches = async (
  client_id: number,
  client_v2: TClientV2,
  id_token: Auth.TIdToken,
  db: Awaited<ReturnType<typeof storage.getDb>>,
  wrapper: typeof retryer.with_retry = (fn) => {
    return fn();
  },
) => {
  const resp = await wrapper(() => {
    return client_v2.GET("/users/{user_id}/head", {
      params: { path: { user_id: id_token.user_id } },
      headers: { authorization: utils.get_bearer(id_token) },
    });
  });
  if (resp.data === undefined) {
    throw new Error(JSON.stringify(resp.error));
  }
  await save_and_remove_remote_pending_patches(
    id_token,
    client_id,
    client_v2,
    db,
    wrapper,
  );
  return resp.data;
};

const save_and_remove_remote_pending_patches = async (
  id_token: Auth.TIdToken,
  client_id: number,
  client_v2: TClientV2,
  db: Awaited<ReturnType<typeof storage.getDb>>,
  wrapper: typeof retryer.with_retry = (fn) => {
    return fn();
  },
) => {
  const bearer = utils.get_bearer(id_token);
  while (true) {
    const resp = await wrapper(async () => {
      return await client_v2.GET(
        "/users/{user_id}/clients/{client_id}/pending_patches",
        {
          params: {
            path: { user_id: id_token.user_id, client_id: client_id },
            query: { limit: 2000 },
          },
          headers: { authorization: bearer },
        },
      );
      // return client_v2.getPendingPatches(req, opts);
    });
    if (resp.data === undefined) {
      throw new Error(JSON.stringify(resp.error));
    }
    if (resp.data.patches.length === 0) {
      return;
    }
    const ks: v2.components["schemas"]["PatchKey"][] = [];
    const tx = db.transaction("patches", "readwrite");
    const store = tx.objectStore("patches");
    for (const patch of resp.data.patches) {
      await store.put({
        client_id: patch.patch_key.client_id,
        session_id: patch.patch_key.session_id,
        patch_id: patch.patch_key.patch_id,
        patch: patch.patch as producer.TOperation[],
        parent_client_id: patch.parent_patch_key.client_id,
        parent_session_id: patch.parent_patch_key.session_id,
        parent_patch_id: patch.parent_patch_key.patch_id,
        created_at: new Date(patch.created_at),
      });
      ks.push({
        client_id: patch.patch_key.client_id,
        session_id: patch.patch_key.session_id,
        patch_id: patch.patch_key.patch_id,
      });
    }
    await tx.done;
    {
      await wrapper(async () => {
        return await client_v2.DELETE(
          "/users/{user_id}/clients/{client_id}/pending_patches:batch",
          {
            params: {
              path: { user_id: id_token.user_id, client_id: client_id },
            },
            headers: {
              authorization: bearer,
            },
            body: {
              patch_keys: ks,
            },
          },
        );
      });
    }
  }
};

type TState = null | { updated_at: string; name: string; head: storage.THead };

const _initial_state: TState = null;

const _get_store = () => {
  let state: TState = _initial_state;
  const listeners = new Set<() => void>();
  const call = (fn: () => void) => fn();
  const set_state = (update: (state: TState) => TState) => {
    const new_state = update(state);
    if (new_state !== state) {
      state = new_state;
      listeners.forEach(call);
    }
  };
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        set_state((_) => _initial_state);
      };
    },
    get_state: () => state,
    set_state,
  };
};

export const idbContext =
  React.createContext<null | Idb.IDBPDatabase<storage.TDb>>(null);
export const useIdb = () => {
  const db = React.useContext(idbContext);
  if (db === null) {
    throw new Error("idbContext is not set");
  }
  return db;
};

export const useUiCalendarOpenSet = (id: string) => {
  const db = useIdb();
  const [isOpen, setIsOpen] = React.useState(false);
  const toggle = React.useCallback(async () => {
    const tx = db.transaction("ui_calendar_open_set", "readwrite");
    const store = tx.objectStore("ui_calendar_open_set");
    if (await store.get(id)) {
      await store.delete(id);
      setIsOpen(false);
    } else {
      await store.add({ id });
      setIsOpen(true);
    }
    await tx.done;
  }, [id, db, setIsOpen]);
  React.useEffect(() => {
    void db
      .transaction("ui_calendar_open_set", "readonly")
      .objectStore("ui_calendar_open_set")
      .get(id)
      .then((x) => {
        setIsOpen(!!x);
      });
  }, [id, db]);

  return React.useMemo(() => {
    return [isOpen, toggle] as const;
  }, [isOpen, toggle]);
};
