import * as Jotai from "jotai";
import * as React from "react";

import * as actions from "./actions";
import * as consts from "./consts";
import * as states from "./states";
import { useDispatch } from "./types";
import * as types from "./types";
import * as utils from "./utils";

export const AddButton = (props: {
  node_id: types.TNodeId;
  prefix?: undefined | string;
  id?: string;
}) => {
  const dispatch = useDispatch();
  const session = React.use(states.session_key_context);
  const show_mobile = Jotai.useAtomValue(
    states.show_mobile_atom_map.get(session),
  );
  const prefix = props.prefix || consts.TREE_PREFIX;
  const handle_click = React.useCallback(() => {
    dispatch(
      actions.add_action({ node_id: props.node_id, show_mobile: show_mobile }),
    );
    dispatch(actions.focusFirstChildTextAreaActionOf(props.node_id, prefix));
  }, [props.node_id, dispatch, show_mobile, prefix]);
  return (
    <button
      className="btn-icon"
      id={props.id}
      onClick={handle_click}
      onDoubleClick={utils.prevent_propagation}
    >
      {consts.ADD_MARK}
    </button>
  );
};
