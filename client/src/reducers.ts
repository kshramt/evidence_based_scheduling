import * as sequenceComparisons from "@kshramt/sequence-comparisons";

import * as actions from "./actions";
import * as rtk from "./rtk";
import * as types from "./types";
import * as utils from "./utils";
import * as checks from "./checks";
import * as ops from "./ops";
import * as immer from "immer";
import * as toast from "./toast";
import * as nap from "./next_action_predictor";
import * as consts from "./consts";
import * as producer from "./producer";
import * as total_time_utils from "./total_time_utils";

export const get_root_reducer_def = (
  next_action_predictor2: nap.BiGramPredictor<types.TNodeId>,
  next_action_predictor3: nap.TriGramPredictor<types.TNodeId>,
  n_predicted: number,
) => {
  return (
    builder: <Payload>(
      action_of: rtk.TActionOf<Payload>,
      reduce: rtk.TReduce<types.IState, Payload>,
    ) => void,
  ) => {
    builder(actions.move_pinned_sub_tree_action, (state, action) => {
      const i_from = state.data.pinned_sub_trees.indexOf(action.payload.from);
      const i_to = state.data.pinned_sub_trees.indexOf(action.payload.to);
      if (i_from === -1 || i_to === -1 || i_from === i_to) {
        return;
      }
      utils.dnd_move(state.data.pinned_sub_trees, i_from, i_to);
    });
    builder(actions.toggle_pin_action, (state, action) => {
      const node_id = action.payload.node_id;
      if (state.data.pinned_sub_trees.includes(node_id)) {
        ops.delete_at_val(state.data.pinned_sub_trees, node_id);
      } else {
        state.data.pinned_sub_trees.push(node_id);
      }
    });
    builder(actions.set_n_unsaved_patches_action, (state, action) => {
      state.n_unsaved_patches = action.payload;
    });
    builder(actions.eval_, (state, action) => {
      const k = action.payload;
      _eval_(state, k, utils.visit_counter_of());
    });
    builder(actions.delete_action, (state, action) => {
      const node_id = action.payload;
      const vid = utils.visit_counter_of();
      if (!checks.is_deletable_node(node_id, state)) {
        toast.add("error", `Node ${node_id} is not deletable.`);
        return;
      }
      const node = state.data.nodes[node_id];
      Object.values(state.data.timeline.time_nodes).forEach((time_node) => {
        delete time_node.nodes[node_id];
      });
      const affected_parent_node_ids = new Set<types.TNodeId>();
      for (const edge_id of ops.keys_of(node.parents)) {
        const parent_node_id = state.data.edges[edge_id].p;
        affected_parent_node_ids.add(parent_node_id);
        delete state.data.nodes[parent_node_id].children[edge_id];
        delete state.data.edges[edge_id];
      }
      for (const edge_id of ops.keys_of(node.children)) {
        const child_node_id = state.data.edges[edge_id].c;
        delete state.data.nodes[child_node_id].parents[edge_id];
        delete state.data.edges[edge_id];
      }
      for (const time_node of Object.values(state.data.timeline.time_nodes)) {
        delete time_node.nodes[node_id];
      }
      for (const quadrant of Object.values(state.data.covey_quadrants)) {
        const i = quadrant.nodes.indexOf(node_id);
        if (i !== -1) {
          quadrant.nodes.splice(i, 1);
        }
      }
      if (state.data.nodes[node_id].status === "todo") {
        ops.delete_at_val(state.todo_node_ids, node_id);
      } else {
        ops.delete_at_val(state.non_todo_node_ids, node_id);
      }
      delete state.data.queue[node_id];
      delete state.data.nodes[node_id];
      delete state.caches[node_id];
      ops.delete_at_val(state.data.pinned_sub_trees, node_id);
      for (const parent_node_id of affected_parent_node_ids) {
        _set_total_time_of_ancestors(state, parent_node_id, vid);
      }
    });
    builder(actions.parse_toc_action, (state, action) => {
      ops.make_nodes_of_toc(action.payload, state);
    });
    builder(actions.delete_edge_action, (state, action) => {
      const edge_id = action.payload;
      const vid = utils.visit_counter_of();
      if (!checks.is_deletable_edge_of(edge_id, state)) {
        toast.add(
          "error",
          `Edge ${state.data.edges[edge_id]} cannot be deleted.`,
        );
        return;
      }
      const edge = state.data.edges[edge_id];
      delete state.data.nodes[edge.p].children[edge_id];
      delete state.data.nodes[edge.c].parents[edge_id];
      if (edge.hide) {
        --state.caches[edge.p].n_hidden_child_edges;
      }
      delete state.data.edges[edge_id];
      _set_total_time_of_ancestors(state, edge.p, vid);
    });
    builder(actions.add_action, (state, action) => {
      ops.add_node(state, action.payload.node_id, action.payload.show_mobile);
    });
    builder(actions.assign_nodes_to_time_node_action, (state, action) => {
      const time_node =
        state.data.timeline.time_nodes[action.payload.time_node_id] ||
        ops.new_time_node_of();
      const t_msec = Date.now();
      action.payload.node_ids.forEach((node_id, i) => {
        if (
          state.data.nodes[node_id] &&
          time_node.nodes[node_id] === undefined
        ) {
          time_node.nodes[node_id] = -(t_msec + i);
        }
      });
      state.data.timeline.time_nodes[action.payload.time_node_id] = time_node;
    });
    builder(actions.unassign_nodes_of_time_node_action, (state, action) => {
      const time_node =
        state.data.timeline.time_nodes[action.payload.time_node_id];
      if (time_node === undefined) {
        return;
      }
      action.payload.node_ids.forEach((node_id) => {
        delete time_node.nodes[node_id];
      });
    });
    builder(actions.assign_nodes_to_covey_quadrant_action, (state, action) => {
      const node_ids =
        state.data.covey_quadrants[action.payload.quadrant_id].nodes;
      const seen = new Set(node_ids);
      action.payload.node_ids.forEach((node_id) => {
        if (seen.has(node_id)) {
          return;
        }
        seen.add(node_id);
        node_ids.push(node_id);
      });
    });
    builder(
      actions.unassign_nodes_of_covey_quadrant_action,
      (state, action) => {
        action.payload.node_ids.forEach((node_id) => {
          const node_ids =
            state.data.covey_quadrants[action.payload.quadrant_id].nodes;
          const i = node_ids.indexOf(node_id);
          if (i !== -1) {
            node_ids.splice(i, 1);
          }
        });
      },
    );
    builder(actions.toggle_show_time_node_children_action, (state, action) => {
      const time_node =
        state.data.timeline.time_nodes[action.payload] ||
        ops.new_time_node_of();
      time_node.show_children =
        time_node.show_children === "none"
          ? "full"
          : time_node.show_children === "full"
          ? "partial"
          : "none";
      state.data.timeline.time_nodes[action.payload] = time_node;
    });
    builder(actions.flipShowDetail, (state, action) => {
      const node_id = action.payload;
      state.caches[node_id].show_detail = !state.caches[node_id].show_detail;
    });
    builder(actions.start_action, (state, action) => {
      const vid = utils.visit_counter_of();
      const node_id = action.payload.node_id;
      if (state.data.nodes[node_id].status !== "todo") {
        toast.add("error", `Non-todo node ${node_id} cannot be started.`);
        return;
      }
      const last_range = state.data.nodes[node_id].ranges.at(-1);
      if (last_range && last_range.end === null) {
        return;
      }
      _topQueue(state, node_id);
      assert(() => [
        state.data.nodes[node_id].status === "todo",
        "Must not happen",
      ]);
      if (!action.payload.is_concurrent) {
        stop_all(state, vid);
      }
      state.data.nodes[node_id].ranges.push({
        start: Date.now(),
        end: null,
      });
      _show_path_to_selected_node(state, node_id);
      next_action_predictor3.fit(node_id);
      next_action_predictor2.fit(node_id);
      set_predicted_next_nodes(
        state,
        n_predicted,
        next_action_predictor2,
        next_action_predictor3,
      );
    });
    builder(actions.top_action, (state, action) => {
      _top(state, action.payload);
    });
    builder(actions.smallestToTop, (state) => {
      for (let dst = 0; dst < state.todo_node_ids.length - 1; ++dst) {
        let src_min = null;
        let estimate_min = Infinity;
        for (let src = dst; src < state.todo_node_ids.length; ++src) {
          const node_id = state.todo_node_ids[src];
          const node = state.data.nodes[node_id];
          if (
            node.status === "todo" &&
            0 < node.estimate &&
            node.estimate < estimate_min &&
            !ops
              .keys_of(node.children)
              .some(
                (edge_id) =>
                  state.data.nodes[state.data.edges[edge_id].c].status ===
                  "todo",
              )
          ) {
            src_min = src;
            estimate_min = node.estimate;
          }
        }
        if (src_min !== null && src_min !== dst) {
          ops.move_before(state.data.queue, src_min, dst, state.todo_node_ids);
          ops.move(state.todo_node_ids, src_min, dst);
          return;
        }
      }
    });
    builder(actions.closestToTop, (state) => {
      let node_id_min = null;
      let due_min = ":due: 9999-12-31T23:59:59";
      for (let node_id of state.todo_node_ids) {
        let node = state.data.nodes[node_id];
        let cache = state.caches[node_id];
        if (
          node.status === "todo" &&
          ops
            .keys_of(node.children)
            .filter(
              (edge_id) =>
                state.data.nodes[state.data.edges[edge_id].c].status === "todo",
            ).length <= 0
        ) {
          while (true) {
            let due = null;
            for (const w of cache.text.split("\n")) {
              if (w.startsWith(":due: ")) {
                due = w;
              }
            }
            if (due !== null) {
              if (due < due_min) {
                node_id_min = node_id;
                due_min = due;
              }
              break;
            }
            if (!ops.keys_of(node.parents).length) {
              break;
            }
            node_id = state.data.edges[ops.sorted_keys_of(node.parents)[0]].p;
            node = state.data.nodes[node_id];
            cache = state.caches[node_id];
          }
        }
      }
      if (node_id_min !== null) {
        _topQueue(state, node_id_min);
      }
    });
    builder(actions.move_important_node_to_top_action, (state) => {
      let candidate = null;
      let n_parents_max = 0;
      const count_parents = (node_id: types.TNodeId, vid: number) => {
        if (utils.vids[node_id] === vid) {
          return 0;
        }
        utils.vids[node_id] = vid;
        const node = state.data.nodes[node_id];
        if (node.status !== "todo") {
          return 0;
        }
        let res = 1;
        for (const edge_id of ops.keys_of(node.parents)) {
          res += count_parents(state.data.edges[edge_id].p, vid);
        }
        return res;
      };
      for (const node_id of state.todo_node_ids) {
        if (
          state.data.nodes[node_id].status !== "todo" ||
          ops.keys_of(state.data.nodes[node_id].children).some((edge_id) => {
            const edge = state.data.edges[edge_id];
            return (
              edge.t === "strong" && state.data.nodes[edge.c].status === "todo"
            );
          })
        ) {
          continue;
        }
        const n_parents = count_parents(node_id, utils.visit_counter_of());
        if (n_parents_max < n_parents) {
          candidate = node_id;
          n_parents_max = n_parents;
        }
      }
      if (candidate === null) {
        return;
      }
      _top(state, candidate);
    });
    builder(total_time_utils.set_total_time_action, (state, action) => {
      for (const node_id of action.payload.node_ids) {
        if (state.data.nodes[node_id] === undefined) {
          continue;
        }
        _set_total_time(
          state,
          node_id,
          utils.visit_counter_of(),
          action.payload.force,
        );
      }
    });
    builder(actions.stop_action, (state, action) => {
      const vid = utils.visit_counter_of();
      stop(state, action.payload, vid);
    });
    builder(actions.stop_all_action, (state) => {
      const vid = utils.visit_counter_of();
      stop_all(state, vid);
    });
    builder(actions.moveUp_, (state, action) => {
      if (state.data.nodes[action.payload].status === "todo") {
        for (const edge_id of ops.keys_of(
          state.data.nodes[action.payload].parents,
        )) {
          const node_id = state.data.edges[edge_id].p;
          ops.move_up(state.data.nodes[node_id].children, edge_id);
        }
        ops.move_up_todo_queue(state, action.payload);
      } else {
        toast.add(
          "error",
          `Non-todo node ${action.payload} cannot be moved up.`,
        );
      }
    });
    builder(actions.moveDown_, (state, action) => {
      if (state.data.nodes[action.payload].status === "todo") {
        for (const edge_id of ops.keys_of(
          state.data.nodes[action.payload].parents,
        )) {
          const node_id = state.data.edges[edge_id].p;
          ops.move_down(state.data.nodes[node_id].children, edge_id);
        }
        ops.move_down_todo_queue(state, action.payload);
      } else {
        toast.add(
          "error",
          `Non-todo node ${action.payload} cannot be moved down.`,
        );
      }
    });
    builder(actions.set_estimate_action, (state, action) => {
      ops.set_estimate(action.payload, state);
    });
    builder(actions.set_range_value_action, (state, action) => {
      const vid = utils.visit_counter_of();
      const range =
        state.data.nodes[action.payload.node_id].ranges[action.payload.i_range];
      const prev_milliseconds = range[action.payload.k];
      if (prev_milliseconds === null) {
        toast.add(
          "error",
          `range.end of the running node ${
            action.payload.node_id
          } cannot be set ${JSON.stringify(action)}.`,
        );
        return;
      }
      const milliseconds = utils.milliseconds_of_datetime_local(
        action.payload.v,
      );
      if (isNaN(milliseconds)) {
        toast.add("error", `Invalid datetime_local: ${JSON.stringify(action)}`);
        return;
      }
      range[action.payload.k] = milliseconds;
      if (range.end !== null && range.end < range.start) {
        toast.add(
          "error",
          `range.end < range.start: ${JSON.stringify(action)}`,
        );
        range[action.payload.k] = prev_milliseconds;
      }
      _set_total_time_of_ancestors(state, action.payload.node_id, vid);
    });
    builder(actions.delete_range_action, (state, action) => {
      state.data.nodes[action.payload.node_id].ranges.splice(
        action.payload.i_range,
        1,
      );
    });
    {
      const dw = new sequenceComparisons.DiffWu();
      builder(actions.set_text_action, (state, action) => {
        const node_id = action.payload.k;
        const text = action.payload.text;
        const node = state.data.nodes[node_id];
        const cache = state.caches[node_id];
        if (text !== cache.text) {
          const xs = Array.from(cache.text);
          const ys = Array.from(text);
          const ops = sequenceComparisons.compressOpsForString(
            dw.call(xs, ys),
            ys,
          );
          node.text_patches.push({ created_at: Date.now(), ops });
          cache.text = text;
        }
      });
    }
    builder(actions.set_time_node_text_action, (state, action) => {
      const time_node =
        state.data.timeline.time_nodes[action.payload.time_node_id] ||
        ops.new_time_node_of();
      time_node.text = action.payload.text;
      state.data.timeline.time_nodes[action.payload.time_node_id] = time_node;
    });
    builder(actions.todoToDone, (state, action) => {
      const node_id = action.payload;
      const vid = utils.visit_counter_of();
      if (!checks.is_completable_node_of(node_id, state)) {
        toast.add(
          "error",
          `The status of node ${node_id} cannot be set to done.`,
        );
        return;
      }
      _topQueue(state, node_id);
      stop(state, node_id, vid);
      state.data.nodes[node_id].status = "done";
      state.data.nodes[node_id].end_time = Date.now();
      ops.move_down_to_boundary(state, node_id, (status) => status !== "todo");
      {
        const i = state.todo_node_ids.indexOf(node_id);
        state.todo_node_ids.splice(i, 1);
        state.non_todo_node_ids.splice(0, 0, node_id);
      }
    });
    builder(actions.todoToDont, (state, action) => {
      const node_id = action.payload;
      const vid = utils.visit_counter_of();
      if (!checks.is_completable_node_of(node_id, state)) {
        toast.add(
          "error",
          `The status of node ${node_id} cannot be set to dont.`,
        );
        return;
      }
      _topQueue(state, node_id);
      stop(state, node_id, vid);
      state.data.nodes[node_id].status = "dont";
      state.data.nodes[node_id].end_time = Date.now();
      ops.move_down_to_boundary(state, node_id, (status) => status === "dont");
      {
        const i = state.todo_node_ids.indexOf(node_id);
        state.todo_node_ids.splice(i, 1);
        state.non_todo_node_ids.splice(0, 0, node_id);
      }
    });
    builder(actions.done_or_dont_to_todo_action, (state, action) => {
      const node_id = action.payload;
      if (!checks.is_uncompletable_node_of(node_id, state)) {
        toast.add("error", `Node ${node_id} cannot be set to todo.`);
        return;
      }
      state.data.nodes[node_id].status = "todo";
      {
        const i = state.non_todo_node_ids.indexOf(node_id);
        state.non_todo_node_ids.splice(i, 1);
        state.todo_node_ids.splice(0, 0, node_id);
      }
      for (const edge_id of ops.keys_of(state.data.nodes[node_id].parents)) {
        ops.move_to_front(
          state.data.nodes[state.data.edges[edge_id].p].children,
          edge_id,
        );
      }
    });
    builder(actions.toggle_show_children, (state, action) => {
      const node_id = action.payload;
      if (
        ops
          .keys_of(state.data.nodes[node_id].children)
          .every((edge_id) => !state.data.edges[edge_id].hide)
      ) {
        const child_edge_ids = ops.keys_of(state.data.nodes[node_id].children);
        for (const edge_id of child_edge_ids) {
          state.data.edges[edge_id].hide = true;
        }
        state.caches[node_id].n_hidden_child_edges = child_edge_ids.length;
        return;
      }
      for (const edge_id of ops.keys_of(state.data.nodes[node_id].children)) {
        if (state.data.edges[edge_id].hide) {
          delete state.data.edges[edge_id].hide;
          --state.caches[node_id].n_hidden_child_edges;
        }
      }
    });
    builder(actions.show_path_to_selected_node, (state, action) => {
      _show_path_to_selected_node(state, action.payload);
    });
    builder(actions.set_edge_type_action, (state, action) => {
      if (!checks.is_deletable_edge_of(action.payload.edge_id, state)) {
        toast.add(
          "error",
          `${JSON.stringify(action)} is not applicable to Edge${JSON.stringify(
            state.data.edges[action.payload.edge_id],
          )}.`,
        );
        return;
      }
      const edge = state.data.edges[action.payload.edge_id];
      edge.t = action.payload.edge_type;
    });
    builder(actions.toggle_edge_hide_action, (state, action) => {
      const edge = state.data.edges[action.payload];
      if (edge.hide) {
        delete edge.hide;
        --state.caches[edge.p].n_hidden_child_edges;
      } else {
        edge.hide = true;
        ++state.caches[edge.p].n_hidden_child_edges;
      }
    });
    builder(actions.add_edges_action, (state, action) => {
      const vid = utils.visit_counter_of();
      ops.add_edges(action.payload, state);
      for (const edge of action.payload) {
        _set_total_time_of_ancestors(state, edge.p, vid);
      }
    });
    builder(actions.increment_count_action, (state) => {
      ++state.data.timeline.count;
    });
  };
};

const stop = (
  draft: immer.Draft<types.IState>,
  node_id: types.TNodeId,
  vid: number,
  t?: number,
) => {
  const last_range = draft.data.nodes[node_id].ranges.at(-1);
  if (last_range && last_range.end === null) {
    last_range.end = t ?? Date.now();
    _set_total_time_of_ancestors(draft, node_id, vid);
  }
};

const stop_all = (draft: immer.Draft<types.IState>, vid: number) => {
  const t = Date.now();
  for (const node_id of draft.todo_node_ids) {
    stop(draft, node_id, vid, t);
  }
};

export const set_predicted_next_nodes = (
  state: immer.Draft<types.IState>,
  n_predicted: number,
  next_action_predictor2: nap.BiGramPredictor<types.TNodeId>,
  next_action_predictor3: nap.TriGramPredictor<types.TNodeId>,
) => {
  const cond = (node_id: types.TNodeId) => {
    const node = state.data.nodes[node_id];
    if (node.status !== "todo") {
      return false;
    }
    const last_range = node.ranges.at(-1);
    return !last_range || last_range.end !== null;
  };
  let predicted = next_action_predictor3
    .predict()
    .filter(cond)
    .slice(0, n_predicted);
  if (predicted.length < n_predicted) {
    predicted = predicted.concat(
      next_action_predictor2.predict().filter((node_id) => {
        return cond(node_id) && !predicted.includes(node_id);
      }),
    );
  }
  state.predicted_next_nodes = predicted.slice(0, n_predicted);
};

const _eval_ = (
  draft: immer.Draft<types.IState>,
  k: types.TNodeId,
  vid: number,
) => {
  _set_total_time(draft, k, vid);
  const candidates = draft.non_todo_node_ids.filter((node_id) => {
    const v = draft.data.nodes[node_id];
    return v.estimate !== consts.NO_ESTIMATION;
  });
  const ratios = candidates.length
    ? candidates.map((node_id) => {
        const node = draft.data.nodes[node_id];
        return (
          _set_total_time(draft, node_id, vid) / (1000 * 3600) / node.estimate
        );
        // return draft.caches[v.start_time].total_time / 3600 / v.estimate;
      })
    : [1];
  const now = Date.now();
  // todo: Use distance to tweak weights.
  // todo: The sampling weight should be a function of both the leaves and the candidates.
  const weights = candidates.length
    ? candidates.map((node_id) => {
        const node = draft.data.nodes[node_id];
        if (!node.end_time) {
          return 0; // Must not happen.
        }
        // 1/e per year
        const w_t = Math.exp(-(now - node.end_time) / (1000 * 86400 * 365.25));
        return w_t;
      })
    : [1];
  const leaf_estimates = Array.from(
    todo_leafs_of(k, draft, (edge) => edge.t === "strong"),
  )
    .map(([_, v]) => v)
    .filter((v) => {
      return v.estimate !== consts.NO_ESTIMATION;
    })
    .map((v) => {
      return v.estimate;
    });
  const n_mc = 2000;
  const ts = _estimate(leaf_estimates, ratios, weights, n_mc);
  draft.caches[k].leaf_estimates_sum = utils.sum(leaf_estimates);
  draft.caches[k].percentiles = [
    ts[0],
    ts[Math.round(n_mc / 10)],
    ts[Math.round(n_mc / 3)],
    ts[Math.round(n_mc / 2)],
    ts[Math.round((n_mc * 2) / 3)],
    ts[Math.round((n_mc * 9) / 10)],
    ts[n_mc - 1],
  ];
};

const _set_total_time_of_ancestors = (
  state: types.IState,
  node_id: types.TNodeId,
  vid: number,
) => {
  if (total_time_utils.affected_vids.get(node_id) === vid) {
    return;
  }
  total_time_utils.affected_vids.set(node_id, vid);
  if (total_time_utils.visible_node_ids.has(node_id)) {
    _set_total_time(state, node_id, vid);
  }
  for (const parent_edge_id of ops.keys_of(state.data.nodes[node_id].parents)) {
    _set_total_time_of_ancestors(
      state,
      state.data.edges[parent_edge_id].p,
      vid,
    );
  }
};

const _set_total_time = (
  state: types.IState,
  node_id: types.TNodeId,
  vid: number,
  force: boolean = false,
) => {
  if (force || total_time_utils.should_update(node_id)) {
    total_time_utils.updated_vids.set(node_id, vid);
    state.caches[node_id].total_time = total_time_of(state, node_id);
  }
  return state.caches[node_id].total_time;
};

const total_time_of = (state: types.IState, node_id: types.TNodeId) => {
  const ranges_list: types.TRange[][] = [];
  collect_ranges_from_strong_descendants(
    node_id,
    state,
    utils.visit_counter_of(),
    ranges_list,
  );
  let n = 0;
  for (const ranges of ranges_list) {
    n += ranges.length;
    if (ranges[ranges.length - 1].end === null) {
      --n;
    }
  }
  n *= 2;
  const events: [number, -1 | 1][] = Array(n);
  let i = 0;
  for (const ranges of ranges_list) {
    for (const range of ranges) {
      if (range.end !== null) {
        events[i] = [range.start, 1];
        events[i + 1] = [range.end, -1];
        i += 2;
      }
    }
  }
  events.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let res = 0;
  let count = 0;
  let t_prev = -1;
  for (const [t, inc] of events) {
    if (count === 0) {
      count += inc;
      t_prev = t;
    } else {
      count += inc;
      if (count === 0) {
        res += t - t_prev;
      }
    }
    if (count < 0) {
      throw new Error(`count = ${count} < 0`);
    }
  }
  return res;
};

const collect_ranges_from_strong_descendants = (
  node_id: types.TNodeId,
  state: types.IState,
  vid: number,
  ranges_list: types.TRange[][],
) => {
  if (utils.vids[node_id] === vid) {
    return;
  }
  utils.vids[node_id] = vid;
  const node = state.data.nodes[node_id];
  if (node.ranges.length) {
    ranges_list.push(node.ranges);
  }
  for (const edge_id of ops.keys_of(node.children)) {
    if (state.data.edges[edge_id].t !== "strong") {
      continue;
    }
    collect_ranges_from_strong_descendants(
      state.data.edges[edge_id].c,
      state,
      vid,
      ranges_list,
    );
  }
};

const _top = (draft: immer.Draft<types.IState>, node_id: types.TNodeId) => {
  if (draft.data.nodes[node_id].status !== "todo") {
    toast.add("error", `Non-todo node ${node_id} cannot be moved.`);
    return;
  }
  _topTree(draft, node_id);
  _topQueue(draft, node_id);
};

const _topTree = (draft: immer.Draft<types.IState>, node_id: types.TNodeId) => {
  if (draft.data.nodes[node_id].status !== "todo") {
    toast.add("error", `Non-todo node ${node_id} cannot be moved.`);
    return;
  }
  const parents = ops.sorted_keys_of(draft.data.nodes[node_id].parents);
  if (parents.length < 1) {
    return;
  }
  for (const edge_id of parents) {
    const edge = draft.data.edges[edge_id];
    if (edge.t === "strong" && draft.data.nodes[edge.p].status === "todo") {
      ops.move_to_front(draft.data.nodes[edge.p].children, edge_id);
      return;
    }
  }
};

const _topQueue = (
  draft: immer.Draft<types.IState>,
  node_id: types.TNodeId,
) => {
  if (draft.data.nodes[node_id].status !== "todo") {
    toast.add("error", `Non-todo node ${node_id} cannot be moved.`);
    return;
  }
  ops.move_to_front(draft.data.queue, node_id);
  const node_ids =
    draft.data.nodes[node_id].status === "todo"
      ? draft.todo_node_ids
      : draft.non_todo_node_ids;
  const i = node_ids.indexOf(node_id);
  if (i < 0) {
    return;
  }
  ops.move(node_ids, i, 0);
};

const _show_path_to_selected_node = (
  draft: immer.Draft<types.IState>,
  node_id: types.TNodeId,
) => {
  while (ops.keys_of(draft.data.nodes[node_id].parents).length) {
    let parent_edge_id = null;
    for (const edge_id of ops.sorted_keys_of(
      draft.data.nodes[node_id].parents,
    )) {
      if (draft.data.edges[edge_id].t === "strong") {
        parent_edge_id = edge_id;
        break;
      }
    }
    if (parent_edge_id === null) {
      return;
    }
    node_id = draft.data.edges[parent_edge_id].p;
    const edge = draft.data.edges[parent_edge_id];
    if (edge.hide) {
      delete edge.hide;
      --draft.caches[edge.p].n_hidden_child_edges;
    }
  }
};

const _estimate = (
  estimates: number[],
  ratios: number[],
  weights: number[],
  n_mc: number,
) => {
  const ts = Array(n_mc);
  const rng = new utils.Multinomial(weights);
  for (let i = 0; i < n_mc; i++) {
    let t = 0;
    for (const estimate of estimates) {
      t += ratios[rng.sample()] * estimate;
    }
    ts[i] = t;
  }
  ts.sort((a, b) => a - b);
  return ts;
};

const todo_leafs_of = (
  node_id: types.TNodeId,
  state: types.IState,
  edge_filter: (edge: types.TEdge) => boolean,
) => {
  return _todo_leafs_of(node_id, state, edge_filter, utils.visit_counter_of());
};
function* _todo_leafs_of(
  node_id: types.TNodeId,
  state: types.IState,
  edge_filter: (edge: types.TEdge) => boolean,
  vid: number,
): Iterable<[types.TNodeId, types.TNode]> {
  if (utils.vids[node_id] === vid) {
    return;
  }
  utils.vids[node_id] = vid;
  const node = state.data.nodes[node_id];
  if (node.status !== "todo") {
    return;
  }
  let had_strong_todo_child = false;
  for (const edge_id of ops.keys_of(node.children)) {
    const edge = state.data.edges[edge_id];
    if (!edge_filter(edge)) {
      continue;
    }
    yield* _todo_leafs_of(edge.c, state, edge_filter, vid);
    had_strong_todo_child = true;
  }
  if (!had_strong_todo_child) {
    yield [node_id, node];
  }
}

const assert = (fn: () => [boolean, string]) => {
  if ("production" !== process.env.NODE_ENV) {
    const [v, msg] = fn();
    if (!v) {
      throw new Error(msg);
    }
  }
};

export const reducer_of_reducer_with_patch = (
  reducer_with_patch: (
    state: undefined | types.IState,
    action: types.TAnyPayloadAction,
  ) => {
    state: types.IState;
    patch: producer.TOperation[];
  },
) => {
  return (state: undefined | types.IState, action: types.TAnyPayloadAction) => {
    return reducer_with_patch(state, action).state;
  };
};
