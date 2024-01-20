import * as Rtk from "@reduxjs/toolkit";

import * as ops from "./ops";
import { register_history_type } from "./undoable";
import * as types from "./types";
import * as utils from "./utils";

export const addNewEventAction = register_history_type(
  Rtk.createAction<{ nodeId: types.TNodeId; event: types.TEvent }>(
    "addNewEventAction",
  ),
);

export const updateEventAction = register_history_type(
  Rtk.createAction<{ nodeId: types.TNodeId; event: types.TEvent; i: number }>(
    "updateEventAction",
  ),
);

export const move_pinned_sub_tree_action = register_history_type(
  Rtk.createAction<{ from: types.TNodeId; to: types.TNodeId }>(
    "move_pinned_sub_tree_action",
  ),
);

export const toggle_pin_action = register_history_type(
  Rtk.createAction<{ node_id: types.TNodeId }>("toggle_pin_action"),
);

export const start_action = register_history_type(
  Rtk.createAction<{ node_id: types.TNodeId; is_concurrent: boolean }>(
    "start_action",
  ),
);
export const add_action = register_history_type(
  Rtk.createAction<{ node_id: types.TNodeId; show_mobile: boolean }>(
    "add_action",
  ),
);
export const addNodesToTimeNodeAction = register_history_type(
  Rtk.createAction<{
    timeId: string;
    nodeIds: types.TNodeId[];
  }>("addNodesToTimeNodeAction"),
);
export const parseTocAction = register_history_type(
  Rtk.createAction<{ nodeId: types.TNodeId; text: string }>("parseTocAction"),
);
export const eval_ = register_history_type(
  Rtk.createAction<types.TNodeId>("eval_"),
);
export const delete_action = register_history_type(
  Rtk.createAction<types.TNodeId>("delete_action"),
);
export const stop_action = register_history_type(
  Rtk.createAction<types.TNodeId>("stop_action"),
);
export const top_action = register_history_type(
  Rtk.createAction<types.TNodeId>("top_action"),
);
export const moveUp_ = register_history_type(
  Rtk.createAction<types.TNodeId>("moveUp_"),
);
export const moveDown_ = register_history_type(
  Rtk.createAction<types.TNodeId>("moveDown_"),
);
export const todoToDone = register_history_type(
  Rtk.createAction<types.TNodeId>("todoToDone"),
);
export const todoToDont = register_history_type(
  Rtk.createAction<types.TNodeId>("todoToDont"),
);

export const delete_edge_action = register_history_type(
  Rtk.createAction<types.TEdgeId>("delete_edge_action"),
);
export const assign_nodes_to_time_node_action = register_history_type(
  Rtk.createAction<{
    time_node_id: types.TTimeNodeId;
    node_ids: types.TNodeId[];
  }>("assign_nodes_to_time_node_action"),
);
export const unassign_nodes_of_time_node_action = register_history_type(
  Rtk.createAction<{
    time_node_id: types.TTimeNodeId;
    node_ids: types.TNodeId[];
  }>("unassign_nodes_of_time_node_action"),
);
export const assign_nodes_to_covey_quadrant_action = register_history_type(
  Rtk.createAction<{
    quadrant_id:
      | "important_urgent"
      | "important_not_urgent"
      | "not_important_urgent"
      | "not_important_not_urgent";
    node_ids: types.TNodeId[];
  }>("assign_nodes_to_covey_quadrant_action"),
);
export const unassign_nodes_of_covey_quadrant_action = register_history_type(
  Rtk.createAction<{
    quadrant_id:
      | "important_urgent"
      | "important_not_urgent"
      | "not_important_urgent"
      | "not_important_not_urgent";
    node_ids: types.TNodeId[];
  }>("unassign_nodes_of_covey_quadrant_action"),
);
export const toggle_show_time_node_children_action = register_history_type(
  Rtk.createAction<types.TTimeNodeId>("toggle_show_time_node_children_action"),
);
export const smallestToTop = register_history_type(
  Rtk.createAction("smallestToTop"),
);
export const closestToTop = register_history_type(
  Rtk.createAction("closestToTop"),
);
export const move_important_node_to_top_action = register_history_type(
  Rtk.createAction("move_important_node_to_top_action"),
);
export const stop_all_action = register_history_type(
  Rtk.createAction("stop_all_action"),
);
export const set_estimate_action = register_history_type(
  Rtk.createAction<{
    node_id: types.TNodeId;
    estimate: number;
  }>("set_estimate_action"),
);
export const set_range_value_action = register_history_type(
  Rtk.createAction<{
    node_id: types.TNodeId;
    i_range: number;
    k: keyof types.TRange;
    v: string;
  }>("set_range_value_action"),
);
export const delete_range_action = register_history_type(
  Rtk.createAction<{
    node_id: types.TNodeId;
    i_range: number;
  }>("delete_range_action"),
);
export const set_text_action = register_history_type(
  Rtk.createAction<{
    k: types.TNodeId;
    text: string;
  }>("set_text_action"),
);
export const set_time_node_text_action = register_history_type(
  Rtk.createAction<{
    time_node_id: types.TTimeNodeId;
    text: string;
  }>("set_time_node_text_action"),
);
export const done_or_dont_to_todo_action = register_history_type(
  Rtk.createAction<types.TNodeId>("done_or_dont_to_todo_action"),
);
export const toggle_show_children = register_history_type(
  Rtk.createAction<types.TNodeId>("toggle_show_children"),
);
export const show_path_to_selected_node = register_history_type(
  Rtk.createAction<types.TNodeId>("show_path_to_selected_node"),
);
export const set_edge_type_action = register_history_type(
  Rtk.createAction<{ edge_id: types.TEdgeId; edge_type: types.TEdgeType }>(
    "set_edge_type_action",
  ),
);
export const toggle_edge_hide_action = register_history_type(
  Rtk.createAction<types.TEdgeId>("toggle_edge_hide_action"),
);
export const add_edges_action = register_history_type(
  Rtk.createAction<types.TEdge[]>("add_edges_action"),
);
export const increment_count_action = register_history_type(
  Rtk.createAction("increment_count_action"),
);

export const focusFirstChildTextAreaActionOf =
  (node_id: types.TNodeId, prefix: string) =>
  (dispatch: types.AppDispatch, getState: () => types.TState) => {
    const state = getState();
    utils.doFocusTextArea(
      `${prefix}${
        state.data.edges[
          ops.sorted_keys_of(state.data.nodes[node_id].children)[0]
        ].c
      }`,
    );
  };
