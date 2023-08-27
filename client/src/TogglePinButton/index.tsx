import * as React from "react";

import * as actions from "src/actions";
import * as types from "src/types";
import * as utils from "src/utils";

const TogglePinButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = types.useDispatch();
  const pinned_sub_trees = types.useSelector((state) => {
    return state.data.pinned_sub_trees;
  });
  const on_click = React.useCallback(() => {
    dispatch(actions.toggle_pin_action({ node_id: props.node_id }));
  }, [props.node_id, dispatch]);
  const is_pinned = pinned_sub_trees.includes(props.node_id);
  return (
    <button
      className="btn-icon"
      onClick={on_click}
      onDoubleClick={utils.prevent_propagation}
    >
      {is_pinned ? "Unpin" : "Pin"}
    </button>
  );
};

export default TogglePinButton;
