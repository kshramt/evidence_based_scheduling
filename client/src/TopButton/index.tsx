import * as React from "react";

import * as actions from "src/actions";
import * as consts from "src/consts";
import * as types from "src/types";
import * as utils from "src/utils";

const TopButton = (props: { node_id: types.TNodeId; disabled?: boolean }) => {
  const dispatch = types.useDispatch();
  const on_click = () => {
    dispatch(actions.top_action(props.node_id));
  };
  return (
    <button
      className="btn-icon"
      onClick={on_click}
      onDoubleClick={utils.prevent_propagation}
      disabled={props.disabled}
    >
      {consts.TOP_MARK}
    </button>
  );
};

export default TopButton;
