import { createSelector, lruMemoize } from "@reduxjs/toolkit";
import * as Jotai from "jotai";
import * as React from "react";
import { useStore } from "react-redux";

import * as actions from "./actions";
import * as states from "./states";
import * as types from "./types";
import * as utils from "./utils";

export const useTaskShortcutKeys = (
  node_id: null | types.TNodeId,
  prefix: string,
) => {
  const dispatch = types.useDispatch();
  const session = React.use(states.session_key_context);
  const show_mobile = Jotai.useAtomValue(
    states.show_mobile_atom_map.get(session),
  );
  const store = useStore<types.TState>();
  return React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (node_id === null) {
        return;
      }
      if (event.ctrlKey || event.metaKey) {
        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          dispatch(actions.add_action({ node_id, show_mobile }));
          dispatch(actions.focusFirstChildTextAreaActionOf(node_id, prefix));
          return;
        } else if (
          event.key === "." ||
          (event.shiftKey && event.code === "Period")
        ) {
          event.preventDefault();
          const ranges = store.getState().swapped_nodes.ranges?.[node_id];
          if (!ranges) return;
          const is_running = ranges.at(-1)?.end === null;
          if (is_running) {
            if (event.shiftKey) {
              dispatch(actions.stop_action(node_id));
            } else {
              dispatch(actions.stop_all_action());
            }
          } else {
            dispatch(
              actions.start_action({ node_id, is_concurrent: event.shiftKey }),
            );
          }
          return;
        }
      }
      return true;
    },
    [node_id, show_mobile, dispatch, prefix, store],
  );
};

type QueueState = {
  data: Pick<types.TState["data"], "queue">;
  swapped_nodes: Pick<types.TState["swapped_nodes"], "status" | "start_time">;
};

export const selectQueues = createSelector(
  [
    (state: QueueState) => state.data.queue,
    (state: QueueState) => state.swapped_nodes.status,
    (state: QueueState) => state.swapped_nodes.start_time,
  ],
  utils.getQueues,
  { memoize: lruMemoize, argsMemoize: lruMemoize },
);

export const useQueues = () => types.useSelector(selectQueues);
