import * as React from "react";

import * as actions from "./actions";
import * as consts from "./consts";
import { useDispatch } from "./types";
import * as types from "./types";
import * as utils from "./utils";

export const TodoToDontButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const on_click = () => dispatch(actions.todoToDont(props.node_id));

  return (
    <button
      className="btn-icon"
      onClick={on_click}
      onDoubleClick={utils.prevent_propagation}
    >
      {consts.DONT_MARK}
    </button>
  );
};
