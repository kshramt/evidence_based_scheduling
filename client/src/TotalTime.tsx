import * as React from "react";
import { useStore } from "react-redux";

import { totalTimeViewOf } from "./total_time_view";
import * as types from "./types";
import * as utils from "./utils";

export const TotalTime = (props: { node_id: types.TNodeId }) => {
  const view = totalTimeViewOf(useStore<types.TState>());
  const subscribe = React.useCallback(
    (listener: () => void) => view.subscribe(props.node_id, listener),
    [view, props.node_id],
  );
  const getSnapshot = React.useCallback(
    () => view.get(props.node_id),
    [view, props.node_id],
  );
  const total_time = React.useSyncExternalStore(subscribe, getSnapshot);
  const ref_cb = React.useCallback(
    (el: null | HTMLSpanElement) => {
      if (el === null) {
        return;
      }
      return view.observe(el, props.node_id);
    },
    [view, props.node_id],
  );

  return (
    <span ref={ref_cb}>
      {total_time < 0 ? "-" : utils.digits1(total_time / (1000 * 3600))}
    </span>
  );
};
