import * as Jotai from "jotai";
import * as React from "react";

import * as actions from "./actions";
import * as states from "./states";
import * as types from "./types";
import * as utils from "./utils";

export const useTaskShortcutKeys = (
  node_id: null | types.TNodeId,
  prefix: string,
) => {
  const dispatch = types.useDispatch();
  const session = React.useContext(states.session_key_context);
  const show_mobile = Jotai.useAtomValue(
    states.show_mobile_atom_map.get(session),
  );
  const is_running = utils.useIsRunning(node_id);
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
        } else if (event.key === ".") {
          event.preventDefault();
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
    [node_id, is_running, show_mobile, dispatch, prefix],
  );
};

export const useQueues = () => {
  const queue = types.useSelector((state) => state.data.queue);
  const statuses = types.useSelector((state) => state.swapped_nodes.status);
  const startTimes = types.useSelector(
    (state) => state.swapped_nodes.start_time,
  );
  return React.useMemo(() => {
    return utils.getQueues(queue, statuses, startTimes);
  }, [queue, statuses, startTimes]);
};
