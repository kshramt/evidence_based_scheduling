import { register_history_type } from "src/undoable";
import * as types from "src/types";
import * as rtk from "src/rtk";

export const start_action = register_history_type(
  rtk.action_of_of<{ node_id: types.TNodeId; is_concurrent: boolean }>(
    "start_action",
  ),
);
export const add_action = register_history_type(
  rtk.action_of_of<{ node_id: types.TNodeId; show_mobile: boolean }>(
    "add_action",
  ),
);
export const parse_toc_action = register_history_type(
  rtk.action_of_of<types.TNodeId>("parse_toc_action"),
);
export const eval_ = register_history_type(
  rtk.action_of_of<types.TNodeId>("eval_"),
);
export const delete_action = register_history_type(
  rtk.action_of_of<types.TNodeId>("delete_action"),
);
export const stop_action = register_history_type(
  rtk.action_of_of<types.TNodeId>("stop_action"),
);
export const top_action = register_history_type(
  rtk.action_of_of<types.TNodeId>("top_action"),
);
export const moveUp_ = register_history_type(
  rtk.action_of_of<types.TNodeId>("moveUp_"),
);
export const moveDown_ = register_history_type(
  rtk.action_of_of<types.TNodeId>("moveDown_"),
);
export const flipShowDetail = rtk.action_of_of<types.TNodeId>("flipShowDetail");
export const todoToDone = register_history_type(
  rtk.action_of_of<types.TNodeId>("todoToDone"),
);
export const todoToDont = register_history_type(
  rtk.action_of_of<types.TNodeId>("todoToDont"),
);

export const delete_edge_action = register_history_type(
  rtk.action_of_of<types.TEdgeId>("delete_edge_action"),
);
export const assign_nodes_to_time_node_action = register_history_type(
  rtk.action_of_of<{
    time_node_id: types.TTimeNodeId;
    node_ids: types.TNodeId[];
  }>("assign_nodes_to_time_node_action"),
);
export const unassign_nodes_of_time_node_action = register_history_type(
  rtk.action_of_of<{
    time_node_id: types.TTimeNodeId;
    node_ids: types.TNodeId[];
  }>("unassign_nodes_of_time_node_action"),
);
export const assign_nodes_to_covey_quadrant_action = register_history_type(
  rtk.action_of_of<{
    quadrant_id:
      | "important_urgent"
      | "important_not_urgent"
      | "not_important_urgent"
      | "not_important_not_urgent";
    node_ids: types.TNodeId[];
  }>("assign_nodes_to_covey_quadrant_action"),
);
export const unassign_nodes_of_covey_quadrant_action = register_history_type(
  rtk.action_of_of<{
    quadrant_id:
      | "important_urgent"
      | "important_not_urgent"
      | "not_important_urgent"
      | "not_important_not_urgent";
    node_ids: types.TNodeId[];
  }>("unassign_nodes_of_covey_quadrant_action"),
);
export const toggle_show_time_node_children_action = register_history_type(
  rtk.action_of_of<types.TTimeNodeId>("toggle_show_time_node_children_action"),
);
export const smallestToTop = register_history_type(
  rtk.action_of_of("smallestToTop"),
);
export const closestToTop = register_history_type(
  rtk.action_of_of("closestToTop"),
);
export const move_important_node_to_top_action = register_history_type(
  rtk.action_of_of("move_important_node_to_top_action"),
);
export const stop_all_action = register_history_type(
  rtk.action_of_of("stop_all_action"),
);
export const set_estimate_action = register_history_type(
  rtk.action_of_of<{
    node_id: types.TNodeId;
    estimate: number;
  }>("set_estimate_action"),
);
export const set_range_value_action = register_history_type(
  rtk.action_of_of<{
    node_id: types.TNodeId;
    i_range: number;
    k: keyof types.IRange;
    v: string;
  }>("set_range_value_action"),
);
export const delete_range_action = register_history_type(
  rtk.action_of_of<{
    node_id: types.TNodeId;
    i_range: number;
  }>("delete_range_action"),
);
export const set_text_action = register_history_type(
  rtk.action_of_of<{
    k: types.TNodeId;
    text: string;
  }>("set_text_action"),
);
export const set_time_node_text_action = register_history_type(
  rtk.action_of_of<{
    time_node_id: types.TTimeNodeId;
    text: string;
  }>("set_time_node_text_action"),
);
export const done_or_dont_to_todo_action = register_history_type(
  rtk.action_of_of<types.TNodeId>("done_or_dont_to_todo_action"),
);
export const toggle_show_children = register_history_type(
  rtk.action_of_of<types.TNodeId>("toggle_show_children"),
);
export const show_path_to_selected_node = register_history_type(
  rtk.action_of_of<types.TNodeId>("show_path_to_selected_node"),
);
export const set_edge_type_action = register_history_type(
  rtk.action_of_of<{ edge_id: types.TEdgeId; edge_type: types.TEdgeType }>(
    "set_edge_type_action",
  ),
);
export const toggle_edge_hide_action = register_history_type(
  rtk.action_of_of<types.TEdgeId>("toggle_edge_hide_action"),
);
export const add_edges_action = register_history_type(
  rtk.action_of_of<types.IEdge[]>("add_edges_action"),
);
export const set_n_unsaved_patches_action = rtk.action_of_of<number>(
  "set_n_unsaved_patches_action",
);
export const increment_count_action = register_history_type(
  rtk.action_of_of("increment_count_action"),
);
