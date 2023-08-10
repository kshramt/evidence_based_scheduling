import * as Jotai from "jotai";
import * as JotaiU from "jotai/utils";
import * as React from "react";
import * as Idb from "idb";
import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";
import * as Connect from "@bufbuild/connect";
import * as B from "@bufbuild/protobuf";
import { createGrpcWebTransport } from "@bufbuild/connect-web";

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
import * as C from "./gen/api/v1/api_connect";
import * as Pb from "./gen/api/v1/api_pb";
import * as pb2 from "./pb2";
import * as storage from "./storage";
import * as utils from "./utils";

const retryer = new retryers.Retryer();

export const nodeFilterQueryState = Jotai.atom("");
export const nodeIdsState = Jotai.atom("");

const get_client_id = async (
  client: Connect.PromiseClient<typeof C.ApiService>,
  db: Awaited<ReturnType<typeof storage.getDb>>,
  id_token: Auth.TIdToken,
) => {
  let client_id = await db.get("numbers", "client_id");
  if (client_id === undefined) {
    const resp = await client.createClient(
      { name: navigator.userAgent },
      {
        headers: { authorization: _get_bearer(id_token) },
      },
    );
    if (resp.clientId === undefined) {
      throw new Error("createClient returned no client_id");
    }
    client_id = Number(resp.clientId);
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
    if (1000 < t2 - t1) {
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
  let state: types.IState;
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
      throw new Error(`parse_data failed ${snapshot}`);
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
      n_unsaved_patches: 0,
      todo_node_ids,
      non_todo_node_ids,
    };
    patch = parsed_data.patch;
  }
  return { state, patch };
};

export class Loadable<T> {
  _state:
    | { status: "pending"; promise: Promise<T> }
    | { status: "resolved"; value: T }
    | { status: "rejected"; error: unknown };
  constructor(promise: Promise<T>) {
    this._state = {
      status: "pending",
      promise: promise
        .then((value) => {
          this._state = { status: "resolved", value };
          return value;
        })
        .catch((error) => {
          this._state = { status: "rejected", error };
          throw error;
        }),
    };
  }
  get = () => {
    const state = this._state;
    switch (state.status) {
      case "pending":
        throw state.promise;
      case "resolved":
        return state.value;
      case "rejected":
        throw state.error;
    }
  };
}

class WeakMapV<K extends object, V> extends WeakMap<K, V> {
  get = (k: K) => {
    const res = super.get(k);
    if (res === undefined) {
      throw new Error(`get returned undefined for ${k}`);
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
  grpc_client: Connect.PromiseClient<typeof C.ApiService>;
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
    grpc_client: Connect.PromiseClient<typeof C.ApiService>,
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
    this.grpc_client = grpc_client;
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
    this.#run_rpc_loop();
    this.#run_push_local_patches_loop();
    this.#run_patch_saving_loop();
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
    const root_reducer = rtk.reducer_with_patch_of<types.IState>(
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
      state: undefined | types.IState,
      action: types.TAnyPayloadAction,
    ) => {
      state: types.IState;
      patch: producer.TOperation[];
    },
  ) => {
    const patch_saver = (
      state: undefined | types.IState,
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
    const bearer = _get_bearer(this.id_token);
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
        const patches: Pb.Patch[] = [];
        for (const head of heads) {
          const p = await store.get([
            head.client_id,
            head.session_id,
            head.patch_id,
          ]);
          if (p === undefined) {
            throw new Error(`Patch not found: ${head}`);
          }
          patches.push(
            new Pb.Patch({
              clientId: BigInt(p.client_id),
              sessionId: BigInt(p.session_id),
              patchId: BigInt(p.patch_id),
              patch: JSON.stringify(p.patch),
              createdAt: B.Timestamp.fromDate(p.created_at),
              parentClientId: BigInt(p.parent_client_id),
              parentSessionId: BigInt(p.parent_session_id),
              parentPatchId: BigInt(p.parent_patch_id),
            }),
          );
        }
        await tx.done;
        await this.#push_rpc(() =>
          retryer.with_retry(() => {
            return this.grpc_client.createPatches(
              { patches },
              { headers: { authorization: bearer } },
            );
          }),
        );
      }
      {
        const tx = this.db.transaction("pending_patches", "readwrite");
        const store = tx.objectStore("pending_patches");
        for (const head of heads) {
          store.delete([head.client_id, head.session_id, head.patch_id]);
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
    const bearer = _get_bearer(this.id_token);
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
      retryer.with_retry(() =>
        this.grpc_client.updateHeadIfNotModified(
          {
            clientId: BigInt(sync_head.client_id),
            sessionId: BigInt(sync_head.session_id),
            patchId: BigInt(sync_head.patch_id),
            prevClientId: BigInt(this.heads.remote.client_id),
            prevSessionId: BigInt(this.heads.remote.session_id),
            prevPatchId: BigInt(this.heads.remote.patch_id),
          },
          { headers: { authorization: bearer } },
        ),
      ),
    );
    if (resp.updated === undefined) {
      throw new Error("updated is not set");
    }
    if (resp.updated) {
      await this.#save_remote_head(sync_head);
    } else {
      const resp = await this.#push_rpc(() =>
        get_remote_head_and_save_remote_pending_patches(
          this.client_id,
          this.grpc_client,
          this.id_token,
          this.db,
          retryer.with_retry,
        ),
      );
      this.#sync_store.set_state(() => {
        return {
          updated_at: resp.created_at.toISOString(),
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
      } catch {}
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
      await this.#push_rpc(() =>
        this.grpc_client.updateHead(
          {
            clientId: BigInt(new_head.client_id),
            sessionId: BigInt(new_head.session_id),
            patchId: BigInt(new_head.patch_id),
          },
          { headers: { authorization: _get_bearer(this.id_token) } },
        ),
      );
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
      handle_focus();

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
        this.grpc_client,
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
          updated_at: resp.created_at.toISOString(),
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
  const grpc_client = Connect.createPromiseClient(
    C.ApiService,
    createGrpcWebTransport({ baseUrl: window.location.origin }),
  );

  // Set client_id
  const client_id = await get_client_id(grpc_client, db, id_token);

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
      grpc_client,
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
    grpc_client,
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

  return res;
};

const get_remote_head_and_save_remote_pending_patches = async (
  client_id: number,
  grpc_client: Connect.PromiseClient<typeof C.ApiService>,
  id_token: Auth.TIdToken,
  db: Awaited<ReturnType<typeof storage.getDb>>,
  wrapper: typeof retryer.with_retry = (fn) => {
    return fn();
  },
) => {
  const resp = pb2.decode_GetHeadResp(
    await wrapper(() =>
      grpc_client.getHead(
        { clientId: BigInt(client_id) },
        { headers: { authorization: _get_bearer(id_token) } },
      ),
    ),
  );
  await save_and_remove_remote_pending_patches(
    id_token,
    client_id,
    grpc_client,
    db,
    wrapper,
  );
  return resp;
};

const save_and_remove_remote_pending_patches = async (
  id_token: Auth.TIdToken,
  client_id: number,
  grpc_client: Connect.PromiseClient<typeof C.ApiService>,
  db: Awaited<ReturnType<typeof storage.getDb>>,
  wrapper: typeof retryer.with_retry = (fn) => {
    return fn();
  },
) => {
  const bearer = _get_bearer(id_token);
  const req = { clientId: BigInt(client_id), size: BigInt(2000) };
  const opts = { headers: { authorization: bearer } };
  while (true) {
    const resp = await wrapper(() => grpc_client.getPendingPatches(req, opts));
    if (resp.patches.length === 0) {
      return;
    }
    const ks = [];
    const tx = db.transaction("patches", "readwrite");
    const store = tx.objectStore("patches");
    for (const patch of resp.patches) {
      if (patch.clientId === undefined) {
        throw new Error(`getPendingPatches returned no client_id for ${patch}`);
      }
      if (patch.sessionId === undefined) {
        throw new Error(
          `getPendingPatches returned no session_id for ${patch}`,
        );
      }
      if (patch.patchId === undefined) {
        throw new Error(`getPendingPatches returned no patch_id for ${patch}`);
      }
      if (patch.patch === undefined) {
        throw new Error(`getPendingPatches returned no patch for ${patch}`);
      }
      if (patch.parentClientId === undefined) {
        throw new Error(
          `getPendingPatches returned no parent_client_id for ${patch}`,
        );
      }
      if (patch.parentSessionId === undefined) {
        throw new Error(
          `getPendingPatches returned no parent_session_id for ${patch}`,
        );
      }
      if (patch.parentPatchId === undefined) {
        throw new Error(
          `getPendingPatches returned no parent_patch_id for ${patch}`,
        );
      }
      if (patch.createdAt === undefined) {
        throw new Error(
          `getPendingPatches returned no created_at for ${patch}`,
        );
      }
      await store.put({
        client_id: Number(patch.clientId),
        session_id: Number(patch.sessionId),
        patch_id: Number(patch.patchId),
        patch: JSON.parse(patch.patch),
        parent_client_id: Number(patch.parentClientId),
        parent_session_id: Number(patch.parentSessionId),
        parent_patch_id: Number(patch.parentPatchId),
        created_at: patch.createdAt.toDate(),
      });
      ks.push({
        client_id: patch.clientId,
        session_id: patch.sessionId,
        patch_id: patch.patchId,
      });
    }
    await tx.done;
    {
      const ps = ks.map(
        (k) =>
          new Pb.DeletePendingPatchesRequest_Patch({
            clientId: k.client_id,
            sessionId: k.session_id,
            patchId: k.patch_id,
          }),
      );
      const req = { clientId: BigInt(client_id), patches: ps };
      const opts = { headers: { authorization: bearer } };
      await wrapper(() => grpc_client.deletePendingPatches(req, opts));
    }
  }
};

const _get_bearer = (id_token: Auth.TIdToken) => {
  return `Bearer ${btoa(JSON.stringify(id_token))}`;
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
