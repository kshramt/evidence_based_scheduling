import * as React from "react";

import * as actions from "./actions";
import * as consts from "./consts";
import { useDispatch } from "./types";
import * as types from "./types";
import * as utils from "./utils";

export const TodoToDoneButton = React.memo(
  (props: { node_id: types.TNodeId }) => {
    const dispatch = useDispatch();
    const on_click = React.useCallback(
      () => dispatch(actions.todoToDone(props.node_id)),
      [props.node_id, dispatch],
    );

    // ⚡ Bolt: Wrapped with React.memo to prevent unnecessary re-renders of this button
    // since it only depends on a primitive node_id prop and is rendered many times.
    return (
      <button
        className="btn-icon"
        onClick={on_click}
        onDoubleClick={utils.prevent_propagation}
      >
        {consts.DONE_MARK}
      </button>
    );
  },
);
TodoToDoneButton.displayName = "TodoToDoneButton";
