import * as React from "react";

import * as actions from "./actions";
import { useDispatch, useSelector } from "./types";
import * as types from "./types";
import * as utils from "./utils";

export const EntryWrapper = (props: {
  node_id: types.TNodeId;
  children: React.ReactNode;
  onMouseOver?: () => void;
  onMouseLeave?: () => void;
  component?: keyof JSX.IntrinsicElements;
}) => {
  const is_running = utils.useIsRunning(props.node_id);
  const n_hidden_child_edges = utils.assertV(
    useSelector(
      (state) => state.swapped_caches.n_hidden_child_edges?.[props.node_id],
    ),
  );
  const has_hidden_leaf = 0 < n_hidden_child_edges;

  const dispatch = useDispatch();
  const handle_toggle_show_children = React.useCallback(() => {
    dispatch(actions.toggle_show_children(props.node_id));
  }, [props.node_id, dispatch]);

  const Component = props.component || "div";
  return (
    <Component
      className={
        utils.join(
          is_running ? "running" : has_hidden_leaf ? "hidden-leafs" : undefined,
        ) || undefined
      }
      onDoubleClick={handle_toggle_show_children}
      onMouseOver={props.onMouseOver}
      onMouseLeave={props.onMouseLeave}
    >
      {props.children}
    </Component>
  );
};
