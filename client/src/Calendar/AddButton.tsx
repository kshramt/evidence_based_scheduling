import * as Jotai from "jotai";
import * as React from "react";

import * as actions from "src/actions";
import * as consts from "src/consts";
import * as states from "src/states";
import * as types from "src/types";
import * as utils from "src/utils";

const AddButton = (props: { timeId: string }) => {
  const nodeIds = Jotai.useAtomValue(states.nodeIdsState);
  const dispatch = types.useDispatch();
  const handleClick = React.useCallback(() => {
    dispatch(
      actions.addNodesToTimeNodeAction({
        timeId: props.timeId,
        nodeIds: utils.node_ids_list_of_node_ids_string(nodeIds),
      }),
    );
  }, [dispatch, props.timeId, nodeIds]);
  return (
    <button className="btn-icon" onClick={handleClick}>
      {consts.ADD_MARK}
    </button>
  );
};

export default AddButton;
