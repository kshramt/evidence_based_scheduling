import * as React from "react";

import * as actions from "src/actions";
import * as consts from "src/consts";
import * as types from "src/types";
import * as utils from "src/utils";

const StopButton = ({
  ref,
  ...props
}: { node_id: types.TNodeId } & {
  ref?: React.RefObject<null | HTMLButtonElement>;
}) => {
  const dispatch = types.useDispatch();
  const on_click = React.useCallback(() => {
    dispatch(actions.stop_action(props.node_id));
  }, [props.node_id, dispatch]);

  return (
    <button
      className="btn-icon"
      aria-label="Stop."
      onClick={on_click}
      ref={ref}
      onDoubleClick={utils.prevent_propagation}
    >
      {consts.STOP_MARK}
    </button>
  );
};

export default StopButton;
