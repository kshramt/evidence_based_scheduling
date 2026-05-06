import * as React from "react";

import * as actions from "src/actions";
import * as types from "src/types";
import * as utils from "src/utils";

const StartConcurrentButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = types.useDispatch();
  const on_click = React.useCallback(() => {
    dispatch(
      actions.start_action({ node_id: props.node_id, is_concurrent: true }),
    );
  }, [props.node_id, dispatch]);
  return (
    <button
      className="btn-icon"
      aria-label="Start concurrently"
      title="Start concurrently"
      onClick={on_click}
      onDoubleClick={utils.prevent_propagation}
    >
      <span className="material-icons" aria-hidden="true">
        double_arrow
      </span>
    </button>
  );
};

export default StartConcurrentButton;
