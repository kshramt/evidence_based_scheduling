import * as React from "react";

import * as actions from "src/actions";
import * as consts from "src/consts";
import * as types from "src/types";
import * as utils from "src/utils";

const StartButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = types.useDispatch();
  const on_click = () => {
    dispatch(
      actions.start_action({ node_id: props.node_id, is_concurrent: false }),
    );
  };
  return (
    <button
      className="btn-icon"
      onClick={on_click}
      onDoubleClick={utils.prevent_propagation}
    >
      {consts.START_MARK}
    </button>
  );
};

export default StartButton;
