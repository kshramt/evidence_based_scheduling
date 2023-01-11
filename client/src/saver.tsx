import React from "react";
import * as redux from "redux";

import * as client from "./client";
import * as rate_limit from "./rate_limit";
import * as types from "./types";
import * as producer from "./producer";

let PARENT_ID = -1;
let ORIGIN_ID = -1;

const patch_queue = rate_limit.rate_limit_of(300);
const data_id_queue = rate_limit.rate_limit_of(300);
let stored_patch:
  | undefined
  | { user_id: number; patch: producer.TOperation[] } = undefined;

type TState = null | { updated_at: string } | "no-matching-parent";

const initial_state: TState = null;

const store_of = () => {
  let state: TState = initial_state;
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
        set_state((_) => initial_state);
      };
    },
    get_state: () => state,
    set_state,
  };
};

const store = store_of();

export const Component = (props: { user_id: number }) => {
  const state = React.useSyncExternalStore(store.subscribe, store.get_state);
  const force_update = React.useCallback(
    () => data_id_queue.unshift(post_data_id_of(props.user_id, true)),
    [props.user_id],
  );
  if (state === null) {
    return null;
  }
  if (state === "no-matching-parent") {
    return (
      <div className="flex justify-center h-[100vh] w-full items-center fixed z-[999999] font-bold top-0 left-0">
        <span>
          No matching parent ID found, please <a href=".">reload</a>.
        </span>
      </div>
    );
  }
  return (
    <div className="flex justify-center h-[100vh] w-full items-center fixed z-[999999] font-bold top-0 left-0">
      <span>
        Server data have been updated by another client at {state.updated_at}.
        Please <a href=".">reload</a> or continue to{" "}
        <button onClick={force_update} className="link">
          use the current state
        </button>
        .
      </span>
    </div>
  );
};

export const set_state = store.set_state;

export const set_parent_id = (parent_id: number) => {
  PARENT_ID = parent_id;
};
export const set_origin_id = (origin_id: number) => {
  ORIGIN_ID = origin_id;
};

export const push_patch = (user_id: number, patch: producer.TOperation[]) => {
  patch = patch.filter((patch) => patch.path.startsWith("/data"));
  if (!patch.length) {
    return;
  }
  patch_queue.push(post_patch_of(user_id, JSON.stringify(patch)));
};
push_patch.add_before_process_hook = patch_queue.add_before_process_hook;
push_patch.add_after_process_hook = patch_queue.add_after_process_hook;

export const patch_saver_of = (
  reducer_with_patch: (
    state: undefined | types.IState,
    action: types.TAnyPayloadAction,
  ) => {
    state: types.IState;
    patch: producer.TOperation[];
  },
  user_id: number,
) => {
  const patch_saver = (
    state: undefined | types.IState,
    action: types.TAnyPayloadAction,
  ) => {
    if (state === undefined) {
      return reducer_with_patch(state, action);
    }
    const reduced = reducer_with_patch(state, action);
    if (stored_patch !== undefined) {
      throw new Error(`stored_patch !== undefined: ${stored_patch}`);
    }
    stored_patch = { user_id, patch: reduced.patch };
    return reduced;
  };
  return patch_saver;
};

export const middleware =
  () => (next_dispatch: redux.Dispatch) => (action: redux.AnyAction) => {
    const ret = next_dispatch(action);
    if (stored_patch === undefined) {
      throw new Error(`stored_patch === undefined`);
    }
    const sp = stored_patch;
    stored_patch = undefined;
    push_patch(sp.user_id, sp.patch);
    return ret;
  };

const post_patch_of = (user_id: number, patch: string) => {
  const post_patch = async () => {
    let res;
    try {
      res = await client.client.createPatchPatchesPost({
        body: { parent_id: PARENT_ID, user_id, patch },
      });
    } catch (e: unknown) {
      console.error(e);
      return false;
    }
    const status = res.status;
    if (status === "no-matching-parent") {
      set_state(() => status);
      return false;
    }
    set_parent_id(res.etag);
    data_id_queue.push(post_data_id_of(user_id));
    return true;
  };
  return post_patch;
};

const post_data_id_of = (user_id: number, force_update: boolean = false) => {
  const post_data_id = async () => {
    if (ORIGIN_ID === PARENT_ID && !force_update) {
      return true;
    }
    let res;
    try {
      const body = { value: PARENT_ID };
      res = await client.client.putIdOfDataOfUserUsersUserIdDataIdPut(
        user_id,
        force_update
          ? {
              body,
            }
          : {
              if_match: ORIGIN_ID,
              body,
            },
      );
    } catch (e: unknown) {
      console.error(e);
      return false;
    }
    if (res.status_code === 412) {
      const updated_at = res.body.updated_at;
      set_state(() => {
        return {
          updated_at,
        };
      });
    } else {
      set_state(() => null);
      set_origin_id(res.etag);
    }
    return true;
  };
  return post_data_id;
};

export const useCheckUpdates = (user_id: number) => {
  React.useEffect(() => {
    const handle_focus = async () => {
      if (document.hidden) {
        return;
      }
      const res = await client.client.getIdOfDataOfUserUsersUserIdDataIdGet(
        user_id,
      );
      if (res.body.value !== PARENT_ID) {
        set_state(() => {
          return {
            updated_at: res.body.updated_at,
          };
        });
      }
    };

    window.document.addEventListener("focus", handle_focus);
    window.addEventListener("visibilitychange", handle_focus);

    return () => {
      window.document.removeEventListener("focus", handle_focus);
      window.removeEventListener("visibilitychange", handle_focus);
    };
  }, [user_id]);
};
