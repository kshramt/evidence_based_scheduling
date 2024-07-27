import * as React from "react";

import * as actions from "./actions";
import * as consts from "./consts";
import { useDispatch } from "./types";
import * as types from "./types";
import * as utils from "./utils";

export const TodoToDoneButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const on_click = () => dispatch(actions.todoToDone(props.node_id));

  return (
    <button
      className="btn-icon"
      onClick={on_click}
      onDoubleClick={utils.prevent_propagation}
    >
      {consts.DONE_MARK}
    </button>
  );
};
