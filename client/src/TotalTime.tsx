import * as React from "react";

import * as total_time_utils from "./total_time_utils";
import { useDispatch, useSelector } from "./types";
import * as types from "./types";
import * as utils from "./utils";

export const TotalTime = React.memo((props: { node_id: types.TNodeId }) => {
  /* ⚡ Bolt: React.memo() prevents unnecessary re-renders when parent entry wrappers re-render */
  const total_time = utils.assertV(
    useSelector((state) => state.swapped_caches.total_time?.[props.node_id]),
  );
  const dispatch = useDispatch();
  const observe = total_time_utils.observe_of(dispatch);
  const ref_cb = React.useCallback(
    (el: null | HTMLSpanElement) => {
      if (el === null) {
        return;
      }
      observe(el, props.node_id);
    },
    [observe, props.node_id],
  );

  return (
    <span ref={ref_cb}>
      {total_time < 0 ? "-" : utils.digits1(total_time / (1000 * 3600))}
    </span>
  );
});
TotalTime.displayName = "TotalTime";
