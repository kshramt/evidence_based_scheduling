import * as React from "react";

import * as actions from "./actions";
import { useDispatch, useSelector } from "./types";
import * as types from "./types";
import * as utils from "./utils";

export const EstimationInput = (props: { node_id: types.TNodeId }) => {
  const estimate = utils.assertV(
    useSelector((state) => state.swapped_nodes.estimate?.[props.node_id]),
  );
  const dispatch = useDispatch();
  const on_change = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        actions.set_estimate_action({
          node_id: props.node_id,
          estimate: Number(e.target.value),
        }),
      );
    },
    [props.node_id, dispatch],
  );

  return (
    <input
      type="number"
      step="any"
      min={0}
      value={estimate}
      onChange={on_change}
      onFocus={move_cursor_to_the_end}
      className="w-[3em]"
    />
  );
};

const move_cursor_to_the_end = (e: React.FocusEvent<HTMLInputElement>) => {
  const el = e.target;
  el.select();
};
