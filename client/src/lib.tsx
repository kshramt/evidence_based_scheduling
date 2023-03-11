import React from "react";
import ReactDOM from "react-dom/client";
// import { Provider } from "react-redux";
// import { createStore, applyMiddleware } from "redux";
// import thunk from "redux-thunk";
import * as Recoil from "recoil";
// import * as immer from "immer";
// import memoize from "proxy-memoize";  // Too large overhead
import "@fontsource/material-icons";

// import * as actions from "./actions";
// import * as checks from "./checks";
// import * as consts from "./consts";
// import * as states from "./states";
// import * as nap from "./next_action_predictor";
// import * as toast from "./toast";
import "./lib.css";
// import * as types from "./types";
import * as utils from "./utils";
// import * as ops from "./ops";
// import * as rtk from "./rtk";
// import * as undoable from "./undoable";
// import * as client from "./client";
// import * as saver from "./saver";
// import * as producer from "./producer";
// import * as total_time_utils from "./total_time_utils";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
// import * as components from "./components";
import * as Auth from "./auth";

// const USER_ID = 1;
// const N_PREDICTED = 10;

// const next_action_predictor3 = new nap.TriGramPredictor<types.TNodeId>(0.9);
// const next_action_predictor2 = new nap.BiGramPredictor<types.TNodeId>(0.9);

// const root_reducer_def = (
//   builder: <Payload>(
//     action_of: rtk.TActionOf<Payload>,
//     reduce: rtk.TReduce<types.IState, Payload>,
//   ) => void,
// ) => {
//   builder(actions.set_n_unsaved_patches_action, (state, action) => {
//     state.n_unsaved_patches = action.payload;
//   });
//   builder(actions.eval_, (state, action) => {
//     const k = action.payload;
//     _eval_(state, k, utils.visit_counter_of());
//   });
//   builder(actions.delete_action, (state, action) => {
//     const node_id = action.payload;
//     const vid = utils.visit_counter_of();
//     if (!checks.is_deletable_node(node_id, state)) {
//       toast.add("error", `Node ${node_id} is not deletable.`);
//       return;
//     }
//     const node = state.data.nodes[node_id];
//     Object.values(state.data.timeline.time_nodes).forEach((time_node) => {
//       delete time_node.nodes[node_id];
//     });
//     const affected_parent_node_ids = new Set<types.TNodeId>();
//     for (const edge_id of ops.keys_of(node.parents)) {
//       const parent_node_id = state.data.edges[edge_id].p;
//       affected_parent_node_ids.add(parent_node_id);
//       delete state.data.nodes[parent_node_id].children[edge_id];
//       delete state.data.edges[edge_id];
//     }
//     for (const edge_id of ops.keys_of(node.children)) {
//       const child_node_id = state.data.edges[edge_id].c;
//       delete state.data.nodes[child_node_id].parents[edge_id];
//       delete state.data.edges[edge_id];
//     }
//     for (const time_node of Object.values(state.data.timeline.time_nodes)) {
//       delete time_node.nodes[node_id];
//     }
//     for (const quadrant of Object.values(state.data.covey_quadrants)) {
//       const i = quadrant.nodes.indexOf(node_id);
//       if (i !== -1) {
//         quadrant.nodes.splice(i, 1);
//       }
//     }
//     if (state.data.nodes[node_id].status === "todo") {
//       ops.delete_at_val(state.todo_node_ids, node_id);
//     } else {
//       ops.delete_at_val(state.non_todo_node_ids, node_id);
//     }
//     delete state.data.queue[node_id];
//     delete state.data.nodes[node_id];
//     delete state.caches[node_id];
//     for (const parent_node_id of affected_parent_node_ids) {
//       _set_total_time_of_ancestors(state, parent_node_id, vid);
//     }
//   });
//   builder(actions.parse_toc_action, (state, action) => {
//     ops.make_nodes_of_toc(action.payload, state);
//   });
//   builder(actions.delete_edge_action, (state, action) => {
//     const edge_id = action.payload;
//     const vid = utils.visit_counter_of();
//     if (!checks.is_deletable_edge_of(edge_id, state)) {
//       toast.add(
//         "error",
//         `Edge ${state.data.edges[edge_id]} cannot be deleted.`,
//       );
//       return;
//     }
//     const edge = state.data.edges[edge_id];
//     delete state.data.nodes[edge.p].children[edge_id];
//     delete state.data.nodes[edge.c].parents[edge_id];
//     if (edge.hide) {
//       --state.caches[edge.p].n_hidden_child_edges;
//     }
//     delete state.data.edges[edge_id];
//     _set_total_time_of_ancestors(state, edge.p, vid);
//   });
//   builder(actions.add_action, (state, action) => {
//     ops.add_node(state, action.payload.node_id, action.payload.show_mobile);
//   });
//   builder(actions.assign_nodes_to_time_node_action, (state, action) => {
//     const time_node =
//       state.data.timeline.time_nodes[action.payload.time_node_id] ||
//       ops.new_time_node_of();
//     const t_msec = Date.now();
//     action.payload.node_ids.forEach((node_id, i) => {
//       if (state.data.nodes[node_id] && time_node.nodes[node_id] === undefined) {
//         time_node.nodes[node_id] = -(t_msec + i);
//       }
//     });
//     state.data.timeline.time_nodes[action.payload.time_node_id] = time_node;
//   });
//   builder(actions.unassign_nodes_of_time_node_action, (state, action) => {
//     const time_node =
//       state.data.timeline.time_nodes[action.payload.time_node_id];
//     if (time_node === undefined) {
//       return;
//     }
//     action.payload.node_ids.forEach((node_id) => {
//       delete time_node.nodes[node_id];
//     });
//   });
//   builder(actions.assign_nodes_to_covey_quadrant_action, (state, action) => {
//     const node_ids =
//       state.data.covey_quadrants[action.payload.quadrant_id].nodes;
//     const seen = new Set(node_ids);
//     action.payload.node_ids.forEach((node_id) => {
//       if (seen.has(node_id)) {
//         return;
//       }
//       seen.add(node_id);
//       node_ids.push(node_id);
//     });
//   });
//   builder(actions.unassign_nodes_of_covey_quadrant_action, (state, action) => {
//     action.payload.node_ids.forEach((node_id) => {
//       const node_ids =
//         state.data.covey_quadrants[action.payload.quadrant_id].nodes;
//       const i = node_ids.indexOf(node_id);
//       if (i !== -1) {
//         node_ids.splice(i, 1);
//       }
//     });
//   });
//   builder(actions.toggle_show_time_node_children_action, (state, action) => {
//     const time_node =
//       state.data.timeline.time_nodes[action.payload] || ops.new_time_node_of();
//     time_node.show_children =
//       time_node.show_children === "none"
//         ? "full"
//         : time_node.show_children === "full"
//         ? "partial"
//         : "none";
//     state.data.timeline.time_nodes[action.payload] = time_node;
//   });
//   builder(actions.flipShowDetail, (state, action) => {
//     const node_id = action.payload;
//     state.caches[node_id].show_detail = !state.caches[node_id].show_detail;
//   });
//   builder(actions.start_action, (state, action) => {
//     const vid = utils.visit_counter_of();
//     const node_id = action.payload.node_id;
//     if (state.data.nodes[node_id].status !== "todo") {
//       toast.add("error", `Non-todo node ${node_id} cannot be started.`);
//       return;
//     }
//     const last_range = state.data.nodes[node_id].ranges.at(-1);
//     if (last_range && last_range.end === null) {
//       return;
//     }
//     _top(state, node_id);
//     assert(() => [
//       state.data.nodes[node_id].status === "todo",
//       "Must not happen",
//     ]);
//     if (!action.payload.is_concurrent) {
//       stop_all(state, vid);
//     }
//     state.data.nodes[node_id].ranges.push({
//       start: Date.now(),
//       end: null,
//     });
//     _show_path_to_selected_node(state, node_id);
//     next_action_predictor3.fit(node_id);
//     next_action_predictor2.fit(node_id);
//     set_predicted_next_nodes(state);
//   });
//   builder(actions.top_action, (state, action) => {
//     _top(state, action.payload);
//   });
//   builder(actions.smallestToTop, (state) => {
//     for (let dst = 0; dst < state.todo_node_ids.length - 1; ++dst) {
//       let src_min = null;
//       let estimate_min = Infinity;
//       for (let src = dst; src < state.todo_node_ids.length; ++src) {
//         const node_id = state.todo_node_ids[src];
//         const node = state.data.nodes[node_id];
//         if (
//           node.status === "todo" &&
//           0 < node.estimate &&
//           node.estimate < estimate_min &&
//           !ops
//             .keys_of(node.children)
//             .some(
//               (edge_id) =>
//                 state.data.nodes[state.data.edges[edge_id].c].status === "todo",
//             )
//         ) {
//           src_min = src;
//           estimate_min = node.estimate;
//         }
//       }
//       if (src_min !== null && src_min !== dst) {
//         ops.move_before(state.data.queue, src_min, dst, state.todo_node_ids);
//         ops.move(state.todo_node_ids, src_min, dst);
//         return;
//       }
//     }
//   });
//   builder(actions.closestToTop, (state) => {
//     let node_id_min = null;
//     let due_min = ":due: 9999-12-31T23:59:59";
//     for (let node_id of state.todo_node_ids) {
//       let node = state.data.nodes[node_id];
//       if (
//         node.status === "todo" &&
//         ops
//           .keys_of(node.children)
//           .filter(
//             (edge_id) =>
//               state.data.nodes[state.data.edges[edge_id].c].status === "todo",
//           ).length <= 0
//       ) {
//         while (true) {
//           let due = null;
//           for (const w of node.text.split("\n")) {
//             if (w.startsWith(":due: ")) {
//               due = w;
//             }
//           }
//           if (due !== null) {
//             if (due < due_min) {
//               node_id_min = node_id;
//               due_min = due;
//             }
//             break;
//           }
//           if (!ops.keys_of(node.parents).length) {
//             break;
//           }
//           node_id = state.data.edges[ops.sorted_keys_of(node.parents)[0]].p;
//           node = state.data.nodes[node_id];
//         }
//       }
//     }
//     if (node_id_min !== null) {
//       _topQueue(state, node_id_min);
//     }
//   });
//   builder(actions.move_important_node_to_top_action, (state) => {
//     let candidate = null;
//     let n_parents_max = 0;
//     const count_parents = (node_id: types.TNodeId, vid: number) => {
//       if (utils.vids[node_id] === vid) {
//         return 0;
//       }
//       utils.vids[node_id] = vid;
//       const node = state.data.nodes[node_id];
//       if (node.status !== "todo") {
//         return 0;
//       }
//       let res = 1;
//       for (const edge_id of ops.keys_of(node.parents)) {
//         res += count_parents(state.data.edges[edge_id].p, vid);
//       }
//       return res;
//     };
//     for (const node_id of state.todo_node_ids) {
//       if (
//         state.data.nodes[node_id].status !== "todo" ||
//         ops.keys_of(state.data.nodes[node_id].children).some((edge_id) => {
//           const edge = state.data.edges[edge_id];
//           return (
//             edge.t === "strong" && state.data.nodes[edge.c].status === "todo"
//           );
//         })
//       ) {
//         continue;
//       }
//       const n_parents = count_parents(node_id, utils.visit_counter_of());
//       if (n_parents_max < n_parents) {
//         candidate = node_id;
//         n_parents_max = n_parents;
//       }
//     }
//     if (candidate === null) {
//       return;
//     }
//     _top(state, candidate);
//   });
//   builder(total_time_utils.set_total_time_action, (state, action) => {
//     for (const node_id of action.payload.node_ids) {
//       if (state.data.nodes[node_id] === undefined) {
//         continue;
//       }
//       _set_total_time(
//         state,
//         node_id,
//         utils.visit_counter_of(),
//         action.payload.force,
//       );
//     }
//   });
//   builder(actions.stop_action, (state, action) => {
//     const vid = utils.visit_counter_of();
//     stop(state, action.payload, vid);
//   });
//   builder(actions.stop_all_action, (state) => {
//     const vid = utils.visit_counter_of();
//     stop_all(state, vid);
//   });
//   builder(actions.moveUp_, (state, action) => {
//     if (state.data.nodes[action.payload].status === "todo") {
//       for (const edge_id of ops.keys_of(
//         state.data.nodes[action.payload].parents,
//       )) {
//         const node_id = state.data.edges[edge_id].p;
//         ops.move_up(state.data.nodes[node_id].children, edge_id);
//       }
//       ops.move_up_todo_queue(state, action.payload);
//     } else {
//       toast.add("error", `Non-todo node ${action.payload} cannot be moved up.`);
//     }
//   });
//   builder(actions.moveDown_, (state, action) => {
//     if (state.data.nodes[action.payload].status === "todo") {
//       for (const edge_id of ops.keys_of(
//         state.data.nodes[action.payload].parents,
//       )) {
//         const node_id = state.data.edges[edge_id].p;
//         ops.move_down(state.data.nodes[node_id].children, edge_id);
//       }
//       ops.move_down_todo_queue(state, action.payload);
//     } else {
//       toast.add(
//         "error",
//         `Non-todo node ${action.payload} cannot be moved down.`,
//       );
//     }
//   });
//   builder(actions.set_estimate_action, (state, action) => {
//     ops.set_estimate(action.payload, state);
//   });
//   builder(actions.set_range_value_action, (state, action) => {
//     const vid = utils.visit_counter_of();
//     const range =
//       state.data.nodes[action.payload.node_id].ranges[action.payload.i_range];
//     const prev_milliseconds = range[action.payload.k];
//     if (prev_milliseconds === null) {
//       toast.add(
//         "error",
//         `range.end of the running node ${
//           action.payload.node_id
//         } cannot be set ${JSON.stringify(action)}.`,
//       );
//       return;
//     }
//     const milliseconds = utils.milliseconds_of_datetime_local(action.payload.v);
//     if (isNaN(milliseconds)) {
//       toast.add("error", `Invalid datetime_local: ${JSON.stringify(action)}`);
//       return;
//     }
//     range[action.payload.k] = milliseconds;
//     if (range.end !== null && range.end < range.start) {
//       toast.add("error", `range.end < range.start: ${JSON.stringify(action)}`);
//       range[action.payload.k] = prev_milliseconds;
//     }
//     _set_total_time_of_ancestors(state, action.payload.node_id, vid);
//   });
//   builder(actions.delete_range_action, (state, action) => {
//     state.data.nodes[action.payload.node_id].ranges.splice(
//       action.payload.i_range,
//       1,
//     );
//   });
//   builder(actions.set_text_action, (state, action) => {
//     const node_id = action.payload.k;
//     const text = action.payload.text;
//     const node = state.data.nodes[node_id];
//     if (text !== node.text) {
//       node.text = text;
//     }
//   });
//   builder(actions.set_time_node_text_action, (state, action) => {
//     const time_node =
//       state.data.timeline.time_nodes[action.payload.time_node_id] ||
//       ops.new_time_node_of();
//     time_node.text = action.payload.text;
//     state.data.timeline.time_nodes[action.payload.time_node_id] = time_node;
//   });
//   builder(actions.todoToDone, (state, action) => {
//     const node_id = action.payload;
//     const vid = utils.visit_counter_of();
//     if (!checks.is_completable_node_of(node_id, state)) {
//       toast.add(
//         "error",
//         `The status of node ${node_id} cannot be set to done.`,
//       );
//       return;
//     }
//     stop(state, node_id, vid);
//     state.data.nodes[node_id].status = "done";
//     state.data.nodes[node_id].end_time = Date.now();
//     ops.move_down_to_boundary(state, node_id, (status) => status !== "todo");
//     {
//       const i = state.todo_node_ids.indexOf(node_id);
//       state.todo_node_ids.splice(i, 1);
//       state.non_todo_node_ids.splice(0, 0, node_id);
//     }
//     _topQueue(state, node_id);
//   });
//   builder(actions.todoToDont, (state, action) => {
//     const node_id = action.payload;
//     const vid = utils.visit_counter_of();
//     if (!checks.is_completable_node_of(node_id, state)) {
//       toast.add(
//         "error",
//         `The status of node ${node_id} cannot be set to dont.`,
//       );
//       return;
//     }
//     stop(state, node_id, vid);
//     state.data.nodes[node_id].status = "dont";
//     state.data.nodes[node_id].end_time = Date.now();
//     ops.move_down_to_boundary(state, node_id, (status) => status === "dont");
//     {
//       const i = state.todo_node_ids.indexOf(node_id);
//       state.todo_node_ids.splice(i, 1);
//       state.non_todo_node_ids.splice(0, 0, node_id);
//     }
//     _topQueue(state, node_id);
//   });
//   builder(actions.done_or_dont_to_todo_action, (state, action) => {
//     const node_id = action.payload;
//     if (!checks.is_uncompletable_node_of(node_id, state)) {
//       toast.add("error", `Node ${node_id} cannot be set to todo.`);
//       return;
//     }
//     state.data.nodes[node_id].status = "todo";
//     {
//       const i = state.non_todo_node_ids.indexOf(node_id);
//       state.non_todo_node_ids.splice(i, 1);
//       state.todo_node_ids.splice(0, 0, node_id);
//     }
//     for (const edge_id of ops.keys_of(state.data.nodes[node_id].parents)) {
//       ops.move_to_front(
//         state.data.nodes[state.data.edges[edge_id].p].children,
//         edge_id,
//       );
//     }
//   });
//   builder(actions.toggle_show_children, (state, action) => {
//     const node_id = action.payload;
//     if (
//       ops
//         .keys_of(state.data.nodes[node_id].children)
//         .every((edge_id) => !state.data.edges[edge_id].hide)
//     ) {
//       const child_edge_ids = ops.keys_of(state.data.nodes[node_id].children);
//       for (const edge_id of child_edge_ids) {
//         state.data.edges[edge_id].hide = true;
//       }
//       state.caches[node_id].n_hidden_child_edges = child_edge_ids.length;
//       return;
//     }
//     for (const edge_id of ops.keys_of(state.data.nodes[node_id].children)) {
//       if (state.data.edges[edge_id].hide) {
//         delete state.data.edges[edge_id].hide;
//         --state.caches[node_id].n_hidden_child_edges;
//       }
//     }
//   });
//   builder(actions.show_path_to_selected_node, (state, action) => {
//     _show_path_to_selected_node(state, action.payload);
//   });
//   builder(actions.set_edge_type_action, (state, action) => {
//     if (!checks.is_deletable_edge_of(action.payload.edge_id, state)) {
//       toast.add(
//         "error",
//         `${JSON.stringify(action)} is not applicable to Edge${JSON.stringify(
//           state.data.edges[action.payload.edge_id],
//         )}.`,
//       );
//       return;
//     }
//     const edge = state.data.edges[action.payload.edge_id];
//     edge.t = action.payload.edge_type;
//   });
//   builder(actions.toggle_edge_hide_action, (state, action) => {
//     const edge = state.data.edges[action.payload];
//     if (edge.hide) {
//       delete edge.hide;
//       --state.caches[edge.p].n_hidden_child_edges;
//     } else {
//       edge.hide = true;
//       ++state.caches[edge.p].n_hidden_child_edges;
//     }
//   });
//   builder(actions.add_edges_action, (state, action) => {
//     const vid = utils.visit_counter_of();
//     ops.add_edges(action.payload, state);
//     for (const edge of action.payload) {
//       _set_total_time_of_ancestors(state, edge.p, vid);
//     }
//   });
//   builder(actions.increment_count_action, (state) => {
//     ++state.data.timeline.count;
//   });
// };

// const stop = (
//   draft: immer.Draft<types.IState>,
//   node_id: types.TNodeId,
//   vid: number,
//   t?: number,
// ) => {
//   const last_range = draft.data.nodes[node_id].ranges.at(-1);
//   if (last_range && last_range.end === null) {
//     last_range.end = t ?? Date.now();
//     _set_total_time_of_ancestors(draft, node_id, vid);
//   }
// };

// const stop_all = (draft: immer.Draft<types.IState>, vid: number) => {
//   const t = Date.now();
//   for (const node_id of draft.todo_node_ids) {
//     stop(draft, node_id, vid, t);
//   }
// };

// const set_predicted_next_nodes = (state: immer.Draft<types.IState>) => {
//   const cond = (node_id: types.TNodeId) => {
//     const node = state.data.nodes[node_id];
//     if (node.status !== "todo") {
//       return false;
//     }
//     const last_range = node.ranges.at(-1);
//     return !last_range || last_range.end !== null;
//   };
//   let predicted = next_action_predictor3
//     .predict()
//     .filter(cond)
//     .slice(0, N_PREDICTED);
//   if (predicted.length < N_PREDICTED) {
//     predicted = predicted.concat(
//       next_action_predictor2.predict().filter((node_id) => {
//         return cond(node_id) && !predicted.includes(node_id);
//       }),
//     );
//   }
//   state.predicted_next_nodes = predicted.slice(0, N_PREDICTED);
// };

// const App = () => {
//   const show_mobile = Recoil.useRecoilValue(states.show_mobile_state);

//   saver.useCheckUpdates(USER_ID);
//   return React.useMemo(
//     () => (
//       <>
//         {show_mobile ? <components.MobileApp /> : <components.DesktopApp />}
//         {toast.component}
//         <saver.Component user_id={USER_ID} />
//       </>
//     ),
//     [show_mobile],
//   );
// };

// const _eval_ = (
//   draft: immer.Draft<types.IState>,
//   k: types.TNodeId,
//   vid: number,
// ) => {
//   _set_total_time(draft, k, vid);
//   const candidates = draft.non_todo_node_ids.filter((node_id) => {
//     const v = draft.data.nodes[node_id];
//     return v.estimate !== consts.NO_ESTIMATION;
//   });
//   const ratios = candidates.length
//     ? candidates.map((node_id) => {
//         const node = draft.data.nodes[node_id];
//         return (
//           _set_total_time(draft, node_id, vid) / (1000 * 3600) / node.estimate
//         );
//         // return draft.caches[v.start_time].total_time / 3600 / v.estimate;
//       })
//     : [1];
//   const now = Date.now();
//   // todo: Use distance to tweak weights.
//   // todo: The sampling weight should be a function of both the leaves and the candidates.
//   const weights = candidates.length
//     ? candidates.map((node_id) => {
//         const node = draft.data.nodes[node_id];
//         if (!node.end_time) {
//           return 0; // Must not happen.
//         }
//         // 1/e per year
//         const w_t = Math.exp(-(now - node.end_time) / (1000 * 86400 * 365.25));
//         return w_t;
//       })
//     : [1];
//   const leaf_estimates = Array.from(
//     todo_leafs_of(k, draft, (edge) => edge.t === "strong"),
//   )
//     .map(([_, v]) => v)
//     .filter((v) => {
//       return v.estimate !== consts.NO_ESTIMATION;
//     })
//     .map((v) => {
//       return v.estimate;
//     });
//   const n_mc = 2000;
//   const ts = _estimate(leaf_estimates, ratios, weights, n_mc);
//   draft.caches[k].leaf_estimates_sum = utils.sum(leaf_estimates);
//   draft.caches[k].percentiles = [
//     ts[0],
//     ts[Math.round(n_mc / 10)],
//     ts[Math.round(n_mc / 3)],
//     ts[Math.round(n_mc / 2)],
//     ts[Math.round((n_mc * 2) / 3)],
//     ts[Math.round((n_mc * 9) / 10)],
//     ts[n_mc - 1],
//   ];
// };

// const _set_total_time_of_ancestors = (
//   state: types.IState,
//   node_id: types.TNodeId,
//   vid: number,
// ) => {
//   if (total_time_utils.affected_vids.get(node_id) === vid) {
//     return;
//   }
//   total_time_utils.affected_vids.set(node_id, vid);
//   if (total_time_utils.visible_node_ids.has(node_id)) {
//     _set_total_time(state, node_id, vid);
//   }
//   for (const parent_edge_id of ops.keys_of(state.data.nodes[node_id].parents)) {
//     _set_total_time_of_ancestors(
//       state,
//       state.data.edges[parent_edge_id].p,
//       vid,
//     );
//   }
// };

// const _set_total_time = (
//   state: types.IState,
//   node_id: types.TNodeId,
//   vid: number,
//   force: boolean = false,
// ) => {
//   if (force || total_time_utils.should_update(node_id)) {
//     total_time_utils.updated_vids.set(node_id, vid);
//     state.caches[node_id].total_time = total_time_of(state, node_id);
//   }
//   return state.caches[node_id].total_time;
// };

// const total_time_of = (state: types.IState, node_id: types.TNodeId) => {
//   const ranges_list: types.IRange[][] = [];
//   collect_ranges_from_strong_descendants(
//     node_id,
//     state,
//     utils.visit_counter_of(),
//     ranges_list,
//   );
//   let n = 0;
//   for (const ranges of ranges_list) {
//     n += ranges.length;
//     if (ranges[ranges.length - 1].end === null) {
//       --n;
//     }
//   }
//   n *= 2;
//   const events: [number, -1 | 1][] = Array(n);
//   let i = 0;
//   for (const ranges of ranges_list) {
//     for (const range of ranges) {
//       if (range.end !== null) {
//         events[i] = [range.start, 1];
//         events[i + 1] = [range.end, -1];
//         i += 2;
//       }
//     }
//   }
//   events.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
//   let res = 0;
//   let count = 0;
//   let t_prev = -1;
//   for (const [t, inc] of events) {
//     if (count === 0) {
//       count += inc;
//       t_prev = t;
//     } else {
//       count += inc;
//       if (count === 0) {
//         res += t - t_prev;
//       }
//     }
//     if (count < 0) {
//       throw new Error(`count = ${count} < 0`);
//     }
//   }
//   return res;
// };

// const collect_ranges_from_strong_descendants = (
//   node_id: types.TNodeId,
//   state: types.IState,
//   vid: number,
//   ranges_list: types.IRange[][],
// ) => {
//   if (utils.vids[node_id] === vid) {
//     return;
//   }
//   utils.vids[node_id] = vid;
//   const node = state.data.nodes[node_id];
//   if (node.ranges.length) {
//     ranges_list.push(node.ranges);
//   }
//   for (const edge_id of ops.keys_of(node.children)) {
//     if (state.data.edges[edge_id].t !== "strong") {
//       continue;
//     }
//     collect_ranges_from_strong_descendants(
//       state.data.edges[edge_id].c,
//       state,
//       vid,
//       ranges_list,
//     );
//   }
// };

// const _top = (draft: immer.Draft<types.IState>, node_id: types.TNodeId) => {
//   if (draft.data.nodes[node_id].status === "todo") {
//     _topTree(draft, node_id);
//     _topQueue(draft, node_id);
//   } else {
//     toast.add("error", `Non-todo node ${node_id} cannot be moved.`);
//   }
// };

// const _topTree = (draft: immer.Draft<types.IState>, node_id: types.TNodeId) => {
//   while (ops.keys_of(draft.data.nodes[node_id].parents).length) {
//     for (const edge_id of ops.sorted_keys_of(
//       draft.data.nodes[node_id].parents,
//     )) {
//       const edge = draft.data.edges[edge_id];
//       if (edge.t === "strong" && draft.data.nodes[edge.p].status === "todo") {
//         ops.move_to_front(draft.data.nodes[edge.p].children, edge_id);
//         node_id = edge.p;
//         break;
//       }
//     }
//   }
// };

// const _topQueue = (
//   draft: immer.Draft<types.IState>,
//   node_id: types.TNodeId,
// ) => {
//   ops.move_to_front(draft.data.queue, node_id);
//   const node_ids =
//     draft.data.nodes[node_id].status === "todo"
//       ? draft.todo_node_ids
//       : draft.non_todo_node_ids;
//   const i = node_ids.indexOf(node_id);
//   if (i < 0) {
//     return;
//   }
//   ops.move(node_ids, i, 0);
// };

// const _show_path_to_selected_node = (
//   draft: immer.Draft<types.IState>,
//   node_id: types.TNodeId,
// ) => {
//   while (ops.keys_of(draft.data.nodes[node_id].parents).length) {
//     let parent_edge_id = null;
//     for (const edge_id of ops.sorted_keys_of(
//       draft.data.nodes[node_id].parents,
//     )) {
//       if (draft.data.edges[edge_id].t === "strong") {
//         parent_edge_id = edge_id;
//         break;
//       }
//     }
//     if (parent_edge_id === null) {
//       return;
//     }
//     node_id = draft.data.edges[parent_edge_id].p;
//     const edge = draft.data.edges[parent_edge_id];
//     if (edge.hide) {
//       delete edge.hide;
//       --draft.caches[edge.p].n_hidden_child_edges;
//     }
//   }
// };

// const _estimate = (
//   estimates: number[],
//   ratios: number[],
//   weights: number[],
//   n_mc: number,
// ) => {
//   const ts = Array(n_mc);
//   const rng = new utils.Multinomial(weights);
//   for (let i = 0; i < n_mc; i++) {
//     let t = 0;
//     for (const estimate of estimates) {
//       t += ratios[rng.sample()] * estimate;
//     }
//     ts[i] = t;
//   }
//   ts.sort((a, b) => a - b);
//   return ts;
// };

// const todo_leafs_of = (
//   node_id: types.TNodeId,
//   state: types.IState,
//   edge_filter: (edge: types.IEdge) => boolean,
// ) => {
//   return _todo_leafs_of(node_id, state, edge_filter, utils.visit_counter_of());
// };
// function* _todo_leafs_of(
//   node_id: types.TNodeId,
//   state: types.IState,
//   edge_filter: (edge: types.IEdge) => boolean,
//   vid: number,
// ): Iterable<[types.TNodeId, types.TNode]> {
//   if (utils.vids[node_id] === vid) {
//     return;
//   }
//   utils.vids[node_id] = vid;
//   const node = state.data.nodes[node_id];
//   if (node.status !== "todo") {
//     return;
//   }
//   let had_strong_todo_child = false;
//   for (const edge_id of ops.keys_of(node.children)) {
//     const edge = state.data.edges[edge_id];
//     if (!edge_filter(edge)) {
//       continue;
//     }
//     yield* _todo_leafs_of(edge.c, state, edge_filter, vid);
//     had_strong_todo_child = true;
//   }
//   if (!had_strong_todo_child) {
//     yield [node_id, node];
//   }
// }

// const assert = (fn: () => [boolean, string]) => {
//   if ("production" !== process.env.NODE_ENV) {
//     const [v, msg] = fn();
//     if (!v) {
//       throw new Error(msg);
//     }
//   }
// };

// const reducer_of_reducer_with_patch = (
//   reducer_with_patch: (
//     state: undefined | types.IState,
//     action: types.TAnyPayloadAction,
//   ) => {
//     state: types.IState;
//     patch: producer.TOperation[];
//   },
// ) => {
//   return (state: undefined | types.IState, action: types.TAnyPayloadAction) => {
//     return reducer_with_patch(state, action).state;
//   };
// };

const Center = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex justify-center h-[100vh] w-full items-center">
      {children}
    </div>
  );
};

// const error_element = (
//   <Center>
//     {" "}
//     <span>
//       An error occured while loading the page.{" "}
//       <a href=".">Please reload the page.</a>
//     </span>
//   </Center>
// );
const spinner = (
  <Center>
    <div className="animate-spin h-[3rem] w-[3rem] border-4 border-blue-500 rounded-full border-t-transparent"></div>
  </Center>
);

const AuthComponent = (props: {
  sign_in: typeof Auth.Auth.prototype.sign_in;
  sign_up: typeof Auth.Auth.prototype.sign_up;
}) => {
  const [err, set_err] = React.useState("");
  const [sign_in_name, set_sign_in_name] = React.useState("");
  const handle_sign_in_name_change = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      set_sign_in_name(e.target.value);
    },
    [set_sign_in_name],
  );
  const [sign_in_loading, set_sign_in_loading] = React.useState(false);
  const on_sign_in = React.useCallback(async () => {
    if (sign_in_name === "") {
      return;
    }
    set_sign_in_loading(true);
    try {
      await props.sign_in(sign_in_name);
      set_sign_in_name("");
      set_err("");
    } catch (err: unknown) {
      set_err(`${err}`);
      console.error(err);
    } finally {
      set_sign_in_loading(false);
    }
  }, [sign_in_name, set_sign_in_name, set_sign_in_loading, props.sign_in]);

  const [sign_up_name, set_sign_up_name] = React.useState("");
  const handle_sign_up_name_change = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      set_sign_up_name(e.target.value);
    },
    [set_sign_up_name],
  );
  const [sign_up_loading, set_sign_up_loading] = React.useState(false);
  const on_sign_up = React.useCallback(async () => {
    if (sign_up_name === "") {
      return;
    }
    set_sign_up_loading(true);
    try {
      await props.sign_up(sign_up_name);
      set_sign_up_name("");
      set_err("");
    } catch (err: unknown) {
      set_err(`${err}`);
      console.error(err);
    } finally {
      set_sign_up_loading(false);
    }
  }, [sign_up_name, set_sign_up_name, set_sign_up_loading, props.sign_up]);
  return (
    <Center>
      <div className="flex flex-col item-center gap-y-[1em]">
        <div className="flex flex-col items-center gap-y-[0.25em]">
          <div>
            <label htmlFor="sign-in-name" className="block">
              Name
            </label>
            <input
              id="sign-in-name"
              type="text"
              value={sign_in_name}
              onChange={handle_sign_in_name_change}
            />
          </div>
          <div>
            <button
              className="btn-icon"
              onClick={on_sign_in}
              onDoubleClick={utils.prevent_propagation}
              disabled={sign_in_loading || sign_in_name === ""}
            >
              Sign-in
            </button>
          </div>
        </div>
        <span className="text-center">OR</span>
        <div className="flex flex-col items-center gap-y-[0.25em]">
          <div>
            <label htmlFor="sign-in-name" className="block">
              Name
            </label>
            <input
              id="sign-in-name"
              type="text"
              value={sign_up_name}
              onChange={handle_sign_up_name_change}
            />
          </div>
          <div>
            <button
              className="btn-icon"
              onClick={on_sign_up}
              onDoubleClick={utils.prevent_propagation}
              disabled={sign_up_loading || sign_up_name === ""}
            >
              Sign-up
            </button>
          </div>
        </div>
        <div className="text-red-500">{err}</div>
      </div>
    </Center>
  );
};

const AppOrAuth = () => {
  const auth = React.useMemo(() => {
    return new Auth.Auth();
  }, []);
  const id_token_state = React.useMemo(() => {
    return Recoil.atom<undefined | null | Auth.TIdToken>({
      key: "ebs/id_token",
      default: null,
    });
  }, []);
  const [id_token, set_id_token] = Recoil.useRecoilState(id_token_state);
  React.useEffect(() => {
    return auth.on_change(set_id_token);
  }, [auth.on_change, set_id_token]);
  if (id_token === undefined) {
    return spinner;
  }
  if (id_token === null) {
    return <AuthComponent sign_in={auth.sign_in} sign_up={auth.sign_up} />;
  }
  return (
    <button
      className="btn-icon"
      onClick={auth.sign_out}
      onDoubleClick={utils.prevent_propagation}
    >
      Sign-out
    </button>
  );
};

export const main = async () => {
  const container = document.getElementById("root");
  const root = ReactDOM.createRoot(container!);
  root.render(
    <React.StrictMode>
      <Center>
        <span>Check for availability of the persistent storage.</span>
      </Center>
    </React.StrictMode>,
  );
  if (!(await window.navigator?.storage?.persist())) {
    root.render(
      <React.StrictMode>
        <Center>
          <span>Persistent storage is not available.</span>
        </Center>
      </React.StrictMode>,
    );
    return;
  }

  root.render(
    <React.StrictMode>
      <Recoil.RecoilRoot>
        <AppOrAuth />
      </Recoil.RecoilRoot>
    </React.StrictMode>,
  );
  return;

  // // Make sure that USER_ID exists.
  // try {
  //   await client.client.getUserUsersUserIdGet(USER_ID);
  // } catch (err: any) {
  //   if (err.status !== 404) {
  //     console.error(err);
  //     root.render(<React.StrictMode>{error_element} </React.StrictMode>);
  //     return;
  //   }
  //   await client.client.createUserUsersPost({ body: {} });
  // }

  // let res;
  // try {
  //   res = await client.client.getDataOfUserUsersUserIdDataGet(USER_ID);
  // } catch (err: unknown) {
  //   console.error(err);
  //   root.render(<React.StrictMode>{error_element} </React.StrictMode>);
  //   return;
  // }

  // saver.set_parent_id(res.etag);
  // saver.set_origin_id(res.etag);

  // let state: types.IState;
  // let patch: producer.TOperation[];
  // if (res.body.data === null) {
  //   state = ops.emptyStateOf();
  //   const produced = producer.produce_with_patche(res.body, (draft) => {
  //     draft.data = state.data;
  //   });
  //   patch = produced.patch;
  // } else {
  //   const parsed_data = types.parse_data({ data: res.body.data });
  //   if (!parsed_data.success) {
  //     root.render(<React.StrictMode>{error_element} </React.StrictMode>);
  //     return;
  //   }
  //   const caches: types.TCaches = {};
  //   for (const node_id in parsed_data.data.nodes) {
  //     if (types.is_TNodeId(node_id)) {
  //       let n_hidden_child_edges = 0;
  //       for (const edge_id of ops.keys_of(
  //         parsed_data.data.nodes[node_id].children,
  //       )) {
  //         if (parsed_data.data.edges[edge_id].hide) {
  //           ++n_hidden_child_edges;
  //         }
  //       }
  //       caches[node_id] = ops.new_cache_of(n_hidden_child_edges);
  //     }
  //   }
  //   const todo_node_ids = [];
  //   const non_todo_node_ids = [];
  //   for (const node_id of ops.sorted_keys_of(parsed_data.data.queue)) {
  //     if (parsed_data.data.nodes[node_id].status === "todo") {
  //       todo_node_ids.push(node_id);
  //     } else {
  //       non_todo_node_ids.push(node_id);
  //     }
  //   }

  //   state = {
  //     data: parsed_data.data,
  //     caches,
  //     predicted_next_nodes: [],
  //     n_unsaved_patches: 0,
  //     todo_node_ids,
  //     non_todo_node_ids,
  //   };
  //   patch = parsed_data.patch;
  // }
  // saver.push_patch(USER_ID, patch);

  // const start_time_and_node_id_list: [number, types.TNodeId][] = [];
  // for (const node_id of state.todo_node_ids) {
  //   const node = state.data.nodes[node_id];
  //   for (const range of node.ranges) {
  //     start_time_and_node_id_list.push([range.start, node_id]);
  //   }
  // }
  // start_time_and_node_id_list.sort((a, b) => a[0] - b[0]);
  // for (const [_, node_id] of start_time_and_node_id_list) {
  //   next_action_predictor3.fit(node_id);
  //   next_action_predictor2.fit(node_id);
  // }
  // set_predicted_next_nodes(state);

  // const root_reducer = rtk.reducer_with_patch_of<types.IState>(
  //   state,
  //   root_reducer_def,
  // );
  // const store = createStore(
  //   reducer_of_reducer_with_patch(
  //     saver.patch_saver_of(
  //       undoable.undoable_of(root_reducer, undoable.history_type_set, state),
  //       USER_ID,
  //     ),
  //   ),
  //   applyMiddleware(thunk, saver.middleware),
  // );

  // saver.push_patch.add_before_process_hook((q) => {
  //   store.dispatch(actions.set_n_unsaved_patches_action(q.length));
  // });
  // saver.push_patch.add_after_process_hook(() => {
  //   store.dispatch(actions.set_n_unsaved_patches_action(0));
  // });

  // root.render(
  //   <React.StrictMode>
  //     <Recoil.RecoilRoot>
  //       <Provider store={store}>
  //         <React.Suspense fallback={spinner}>
  //           <App />
  //         </React.Suspense>
  //       </Provider>
  //     </Recoil.RecoilRoot>
  //   </React.StrictMode>,
  // );
};

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();
