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
import * as swapper from "src/swapper";
import * as total_time_utils from "./total_time_utils";

export const get_root_reducer_def = (
  next_action_predictor2: nap.BiGramPredictor<types.TNodeId>,
  next_action_predictor3: nap.TriGramPredictor<types.TNodeId>,
  n_predicted: number,
) => {
  return (
    builder: <Payload>(
      action_of: rtk.TActionOf<Payload>,
      reduce: rtk.TReduce<types.TState, Payload>,
    ) => void,
  ) => {
    builder(
      actions.addNewEventAction,
      (state: types.TStateDraftWithReadonly, action) => {
        const node = state.data.nodes[action.payload.nodeId];
        const events = immer.produce(node.events || [], (events) => {
          events.push(action.payload.event);
        });
        swapper.set(
          state.data.nodes,
          state.swapped_nodes,
          action.payload.nodeId,
          "events",
          events,
        );
      },
    );
    builder(
      actions.updateEventAction,
      (state: types.TStateDraftWithReadonly, action) => {
        const events = state.data.nodes[action.payload.nodeId].events;
        if (events === undefined) {
          const msg = `updateEventAction/Node ${action.payload.nodeId} has no events.`;
          toast.add("error", msg);
          console.error(msg);
          return;
        }
        swapper.set(
          state.data.nodes,
          state.swapped_nodes,
          action.payload.nodeId,
          "events",
          immer.produce(events, (events) => {
            events[action.payload.i] = action.payload.event;
          }),
        );
      },
    );
    builder(
      actions.move_pinned_sub_tree_action,
      (state: types.TStateDraftWithReadonly, action) => {
        const i_from = state.data.pinned_sub_trees.indexOf(action.payload.from);
        const i_to = state.data.pinned_sub_trees.indexOf(action.payload.to);
        if (i_from === -1 || i_to === -1 || i_from === i_to) {
          return;
        }
        utils.dnd_move(state.data.pinned_sub_trees, i_from, i_to);
      },
    );
    builder(
      actions.toggle_pin_action,
      (state: types.TStateDraftWithReadonly, action) => {
        const node_id = action.payload.node_id;
        if (state.data.pinned_sub_trees.includes(node_id)) {
          ops.delete_at_val(state.data.pinned_sub_trees, node_id);
        } else {
          state.data.pinned_sub_trees.push(node_id);
        }
      },
    );
    builder(actions.eval_, (state: types.TStateDraftWithReadonly, action) => {
      const k = action.payload;
      _eval_(state, k, utils.visit_counter_of());
    });
    builder(
      actions.delete_action,
      (state: types.TStateDraftWithReadonly, action) => {
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
          {
            const children = state.data.nodes[parent_node_id].children;
            swapper.set(
              state.data.nodes,
              state.swapped_nodes,
              parent_node_id,
              "children",
              immer.produce(children, (children) => {
                delete children[edge_id];
              }),
            );
          }
          swapper.del(state.data.edges, state.swapped_edges, edge_id);
        }
        for (const edge_id of ops.keys_of(node.children)) {
          const child_node_id = state.data.edges[edge_id].c;
          {
            const parents = state.data.nodes[child_node_id].parents;
            swapper.set(
              state.data.nodes,
              state.swapped_nodes,
              child_node_id,
              "parents",
              immer.produce(parents, (parents) => {
                delete parents[edge_id];
              }),
            );
          }
          swapper.del(state.data.edges, state.swapped_edges, edge_id);
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
        swapper.del(state.data.nodes, state.swapped_nodes, node_id);
        swapper.del(state.caches, state.swapped_caches, node_id);
        ops.delete_at_val(state.data.pinned_sub_trees, node_id);
        for (const parent_node_id of affected_parent_node_ids) {
          _set_total_time_of_ancestors(state, parent_node_id, vid);
        }
      },
    );
    builder(
      actions.parseTocAction,
      (state: types.TStateDraftWithReadonly, action) => {
        ops.makeNodesOfToc(action.payload, state);
      },
    );
    builder(
      actions.delete_edge_action,
      (state: types.TStateDraftWithReadonly, action) => {
        const edge_id = action.payload;
        const vid = utils.visit_counter_of();
        if (!checks.is_deletable_edge_of(edge_id, state)) {
          toast.add(
            "error",
            `Edge ${JSON.stringify(
              state.data.edges[edge_id],
            )} cannot be deleted.`,
          );
          return;
        }
        const edge = state.data.edges[edge_id];
        {
          const children = state.data.nodes[edge.p].children;
          swapper.set(
            state.data.nodes,
            state.swapped_nodes,
            edge.p,
            "children",
            immer.produce(children, (children) => {
              delete children[edge_id];
            }),
          );
        }
        {
          const parents = state.data.nodes[edge.c].parents;
          swapper.set(
            state.data.nodes,
            state.swapped_nodes,
            edge.c,
            "parents",
            immer.produce(parents, (parents) => {
              delete parents[edge_id];
            }),
          );
        }
        if (edge.hide) {
          swapper.set(
            state.caches,
            state.swapped_caches,
            edge.p,
            "n_hidden_child_edges",
            state.caches[edge.p].n_hidden_child_edges - 1,
          );
        }
        swapper.del(state.data.edges, state.swapped_edges, edge_id);
        _set_total_time_of_ancestors(state, edge.p, vid);
      },
    );
    builder(
      actions.add_action,
      (state: types.TStateDraftWithReadonly, action) => {
        ops.add_node(state, action.payload.node_id, action.payload.show_mobile);
      },
    );
    builder(
      actions.assign_nodes_to_time_node_action,
      (state: types.TStateDraftWithReadonly, action) => {
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
      },
    );
    builder(
      actions.unassign_nodes_of_time_node_action,
      (state: types.TStateDraftWithReadonly, action) => {
        const time_node =
          state.data.timeline.time_nodes[action.payload.time_node_id];
        if (time_node === undefined) {
          return;
        }
        action.payload.node_ids.forEach((node_id) => {
          delete time_node.nodes[node_id];
        });
      },
    );
    builder(
      actions.assign_nodes_to_covey_quadrant_action,
      (state: types.TStateDraftWithReadonly, action) => {
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
      },
    );
    builder(
      actions.unassign_nodes_of_covey_quadrant_action,
      (state: types.TStateDraftWithReadonly, action) => {
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
    builder(
      actions.toggle_show_time_node_children_action,
      (state: types.TStateDraftWithReadonly, action) => {
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
      },
    );
    builder(
      actions.start_action,
      (state: types.TStateDraftWithReadonly, action) => {
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
        {
          const ranges = state.data.nodes[node_id].ranges;
          swapper.set(
            state.data.nodes,
            state.swapped_nodes,
            node_id,
            "ranges",
            immer.produce(ranges, (ranges) => {
              ranges.push({ start: Date.now(), end: null });
            }),
          );
        }
        _show_path_to_selected_node(state, node_id);
        next_action_predictor3.fit(node_id);
        next_action_predictor2.fit(node_id);
        set_predicted_next_nodes(
          state,
          n_predicted,
          next_action_predictor2,
          next_action_predictor3,
        );
      },
    );
    builder(
      actions.top_action,
      (state: types.TStateDraftWithReadonly, action) => {
        _top(state, action.payload);
      },
    );
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
          {
            const index = ops.move_before(
              state.data.queue,
              src_min,
              dst,
              state.todo_node_ids,
            );
            if (index !== null) {
              state.data.queue[index[0]] = index[1];
            }
          }
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
    builder(
      total_time_utils.set_total_time_action,
      (state: types.TStateDraftWithReadonly, action) => {
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
      },
    );
    builder(
      actions.stop_action,
      (state: types.TStateDraftWithReadonly, action) => {
        const vid = utils.visit_counter_of();
        stop(state, action.payload, vid);
      },
    );
    builder(actions.stop_all_action, (state) => {
      const vid = utils.visit_counter_of();
      stop_all(state, vid);
    });
    builder(actions.moveUp_, (state: types.TStateDraftWithReadonly, action) => {
      if (state.data.nodes[action.payload].status === "todo") {
        for (const edge_id of ops.keys_of(
          state.data.nodes[action.payload].parents,
        )) {
          const node_id = state.data.edges[edge_id].p;
          swapper.set(
            state.data.nodes,
            state.swapped_nodes,
            node_id,
            "children",
            immer.produce(state.data.nodes[node_id].children, (children) => {
              const index = ops.move_up(children, edge_id);
              if (index !== null) {
                children[edge_id] = index[1];
              }
            }),
          );
        }
        ops.move_up_todo_queue(state, action.payload);
      } else {
        toast.add(
          "error",
          `Non-todo node ${action.payload} cannot be moved up.`,
        );
      }
    });
    builder(
      actions.moveDown_,
      (state: types.TStateDraftWithReadonly, action) => {
        if (state.data.nodes[action.payload].status === "todo") {
          for (const edge_id of ops.keys_of(
            state.data.nodes[action.payload].parents,
          )) {
            const node_id = state.data.edges[edge_id].p;
            swapper.set(
              state.data.nodes,
              state.swapped_nodes,
              node_id,
              "children",
              immer.produce(state.data.nodes[node_id].children, (children) => {
                const index = ops.move_down(children, edge_id);
                if (index !== null) {
                  children[edge_id] = index[1];
                }
              }),
            );
          }
          ops.move_down_todo_queue(state, action.payload);
        } else {
          toast.add(
            "error",
            `Non-todo node ${action.payload} cannot be moved down.`,
          );
        }
      },
    );
    builder(
      actions.set_estimate_action,
      (state: types.TStateDraftWithReadonly, action) => {
        ops.set_estimate(action.payload, state);
      },
    );
    builder(
      actions.set_range_value_action,
      (state: types.TStateDraftWithReadonly, action) => {
        const vid = utils.visit_counter_of();
        const ranges = state.data.nodes[action.payload.node_id].ranges;
        let range = ranges[action.payload.i_range];
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
          toast.add(
            "error",
            `Invalid datetime_local: ${JSON.stringify(action)}`,
          );
          return;
        }
        range = immer.produce(range, (range) => {
          range[action.payload.k] = milliseconds;
        });
        if (range.end !== null && range.end < range.start) {
          toast.add(
            "error",
            `range.end < range.start: ${JSON.stringify(action)}`,
          );
          range = immer.produce(range, (range) => {
            range[action.payload.k] = prev_milliseconds;
          });
        }
        swapper.set(
          state.data.nodes,
          state.swapped_nodes,
          action.payload.node_id,
          "ranges",
          immer.produce(ranges, (ranges) => {
            ranges[action.payload.i_range] = range;
          }),
        );
        _set_total_time_of_ancestors(state, action.payload.node_id, vid);
      },
    );
    builder(
      actions.delete_range_action,
      (state: types.TStateDraftWithReadonly, action) => {
        swapper.set(
          state.data.nodes,
          state.swapped_nodes,
          action.payload.node_id,
          "ranges",
          immer.produce(
            state.data.nodes[action.payload.node_id].ranges,
            (ranges) => {
              ranges.splice(action.payload.i_range, 1);
            },
          ),
        );
      },
    );
    builder(
      actions.set_text_action,
      (state: types.TStateDraftWithReadonly, action) => {
        const node_id = action.payload.k;
        const text = action.payload.text;
        ops.setText(state, node_id, text);
      },
    );
    builder(
      actions.set_time_node_text_action,
      (state: types.TStateDraftWithReadonly, action) => {
        const time_node =
          state.data.timeline.time_nodes[action.payload.time_node_id] ||
          ops.new_time_node_of();
        time_node.text = action.payload.text;
        state.data.timeline.time_nodes[action.payload.time_node_id] = time_node;
      },
    );
    builder(
      actions.todoToDone,
      (state: types.TStateDraftWithReadonly, action) => {
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
        swapper.set(
          state.data.nodes,
          state.swapped_nodes,
          node_id,
          "status",
          "done",
        );
        swapper.set(
          state.data.nodes,
          state.swapped_nodes,
          node_id,
          "end_time",
          Date.now(),
        );
        ops.move_down_to_boundary(
          state,
          node_id,
          (status) => status !== "todo",
        );
        {
          const i = state.todo_node_ids.indexOf(node_id);
          state.todo_node_ids.splice(i, 1);
          state.non_todo_node_ids.splice(0, 0, node_id);
        }
      },
    );
    builder(
      actions.todoToDont,
      (state: types.TStateDraftWithReadonly, action) => {
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
        swapper.set(
          state.data.nodes,
          state.swapped_nodes,
          node_id,
          "status",
          "dont",
        );
        swapper.set(
          state.data.nodes,
          state.swapped_nodes,
          node_id,
          "end_time",
          Date.now(),
        );
        ops.move_down_to_boundary(
          state,
          node_id,
          (status) => status === "dont",
        );
        {
          const i = state.todo_node_ids.indexOf(node_id);
          state.todo_node_ids.splice(i, 1);
          state.non_todo_node_ids.splice(0, 0, node_id);
        }
      },
    );
    builder(
      actions.done_or_dont_to_todo_action,
      (state: types.TStateDraftWithReadonly, action) => {
        const node_id = action.payload;
        if (!checks.is_uncompletable_node_of(node_id, state)) {
          toast.add("error", `Node ${node_id} cannot be set to todo.`);
          return;
        }
        swapper.set(
          state.data.nodes,
          state.swapped_nodes,
          node_id,
          "status",
          "todo",
        );
        {
          const i = state.non_todo_node_ids.indexOf(node_id);
          state.non_todo_node_ids.splice(i, 1);
          state.todo_node_ids.splice(0, 0, node_id);
        }
        for (const edge_id of ops.keys_of(state.data.nodes[node_id].parents)) {
          const parent_node_id = state.data.edges[edge_id].p;
          swapper.set(
            state.data.nodes,
            state.swapped_nodes,
            parent_node_id,
            "children",
            immer.produce(
              state.data.nodes[parent_node_id].children,
              (children) => {
                children[edge_id] = ops.getFrontIndex(children);
              },
            ),
          );
        }
      },
    );
    builder(
      actions.toggle_show_children,
      (state: types.TStateDraftWithReadonly, action) => {
        const node_id = action.payload;
        if (
          ops
            .keys_of(state.data.nodes[node_id].children)
            .every((edge_id) => !state.data.edges[edge_id].hide)
        ) {
          const child_edge_ids = ops.keys_of(
            state.data.nodes[node_id].children,
          );
          for (const edge_id of child_edge_ids) {
            swapper.set(
              state.data.edges,
              state.swapped_edges,
              edge_id,
              "hide",
              true,
            );
          }
          swapper.set(
            state.caches,
            state.swapped_caches,
            node_id,
            "n_hidden_child_edges",
            child_edge_ids.length,
          );
        } else {
          for (const edge_id of ops.keys_of(
            state.data.nodes[node_id].children,
          )) {
            if (state.data.edges[edge_id].hide) {
              swapper.del2(
                state.data.edges,
                state.swapped_edges,
                edge_id,
                "hide",
              );
              swapper.set(
                state.caches,
                state.swapped_caches,
                node_id,
                "n_hidden_child_edges",
                state.caches[node_id].n_hidden_child_edges - 1,
              );
            }
          }
        }
      },
    );
    builder(
      actions.show_path_to_selected_node,
      (state: types.TStateDraftWithReadonly, action) => {
        _show_path_to_selected_node(state, action.payload);
      },
    );
    builder(
      actions.set_edge_type_action,
      (state: types.TStateDraftWithReadonly, action) => {
        if (!checks.is_deletable_edge_of(action.payload.edge_id, state)) {
          toast.add(
            "error",
            `${JSON.stringify(
              action,
            )} is not applicable to Edge${JSON.stringify(
              state.data.edges[action.payload.edge_id],
            )}.`,
          );
          return;
        }
        swapper.set(
          state.data.edges,
          state.swapped_edges,
          action.payload.edge_id,
          "t",
          action.payload.edge_type,
        );
      },
    );
    builder(
      actions.toggle_edge_hide_action,
      (state: types.TStateDraftWithReadonly, action) => {
        const edge = state.data.edges[action.payload];
        if (edge.hide) {
          swapper.del2(
            state.data.edges,
            state.swapped_edges,
            action.payload,
            "hide",
          );
          swapper.set(
            state.caches,
            state.swapped_caches,
            edge.p,
            "n_hidden_child_edges",
            state.caches[edge.p].n_hidden_child_edges - 1,
          );
        } else {
          swapper.set(
            state.data.edges,
            state.swapped_edges,
            action.payload,
            "hide",
            true,
          );
          swapper.set(
            state.caches,
            state.swapped_caches,
            edge.p,
            "n_hidden_child_edges",
            state.caches[edge.p].n_hidden_child_edges + 1,
          );
        }
      },
    );
    builder(
      actions.add_edges_action,
      (state: types.TStateDraftWithReadonly, action) => {
        const vid = utils.visit_counter_of();
        ops.add_edges(action.payload, state);
        for (const edge of action.payload) {
          _set_total_time_of_ancestors(state, edge.p, vid);
        }
      },
    );
    builder(actions.increment_count_action, (state) => {
      ++state.data.timeline.count;
    });
  };
};

const stop = (
  state: types.TStateDraftWithReadonly,
  node_id: types.TNodeId,
  vid: number,
  t?: number,
) => {
  const ranges = state.data.nodes[node_id].ranges;
  const last_range = ranges.at(-1);
  if (last_range && last_range.end === null) {
    swapper.set(
      state.data.nodes,
      state.swapped_nodes,
      node_id,
      "ranges",
      immer.produce(ranges, (ranges) => {
        const last_range = ranges.at(-1);
        if (last_range) {
          last_range.end = t ?? Date.now();
        }
      }),
    );
    _set_total_time_of_ancestors(state, node_id, vid);
  }
};

const stop_all = (state: types.TStateDraftWithReadonly, vid: number) => {
  const t = Date.now();
  for (const node_id of state.todo_node_ids) {
    stop(state, node_id, vid, t);
  }
};

export const set_predicted_next_nodes = (
  state: types.TStateDraftWithReadonly,
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
  state: types.TStateDraftWithReadonly,
  k: types.TNodeId,
  vid: number,
) => {
  _set_total_time(state, k, vid);
  const candidates = state.non_todo_node_ids.filter((node_id) => {
    const v = state.data.nodes[node_id];
    return v.estimate !== consts.NO_ESTIMATION;
  });
  const ratios = candidates.length
    ? candidates.map((node_id) => {
        const node = state.data.nodes[node_id];
        return (
          _set_total_time(state, node_id, vid) / (1000 * 3600) / node.estimate
        );
        // return draft.caches[v.start_time].total_time / 3600 / v.estimate;
      })
    : [1];
  const now = Date.now();
  // todo: Use distance to tweak weights.
  // todo: The sampling weight should be a function of both the leaves and the candidates.
  const weights = candidates.length
    ? candidates.map((node_id) => {
        const node = state.data.nodes[node_id];
        if (!node.end_time) {
          return 0; // Must not happen.
        }
        // 1/e per year
        const w_t = Math.exp(-(now - node.end_time) / (1000 * 86400 * 365.25));
        return w_t;
      })
    : [1];
  const leaf_estimates = Array.from(
    todo_leafs_of(k, state, (edge) => edge.t === "strong"),
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
  swapper.set(
    state.caches,
    state.swapped_caches,
    k,
    "leaf_estimates_sum",
    utils.sum(leaf_estimates),
  );
  swapper.set(state.caches, state.swapped_caches, k, "percentiles", [
    ts[0],
    ts[Math.round(n_mc / 10)],
    ts[Math.round(n_mc / 3)],
    ts[Math.round(n_mc / 2)],
    ts[Math.round((n_mc * 2) / 3)],
    ts[Math.round((n_mc * 9) / 10)],
    ts[n_mc - 1],
  ]);
};

const _set_total_time_of_ancestors = (
  state: types.TStateDraftWithReadonly,
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
  state: types.TStateDraftWithReadonly,
  node_id: types.TNodeId,
  vid: number,
  force: boolean = false,
) => {
  if (force || total_time_utils.should_update(node_id)) {
    total_time_utils.updated_vids.set(node_id, vid);
    swapper.set(
      state.caches,
      state.swapped_caches,
      node_id,
      "total_time",
      total_time_of(state, node_id),
    );
  }
  return state.caches[node_id].total_time;
};

const total_time_of = (
  state: immer.Immutable<types.TState>,
  node_id: types.TNodeId,
) => {
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
  const events = Array<[number, -1 | 1]>(n);
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
  state: immer.Immutable<types.TState>,
  vid: number,
  ranges_list: (readonly types.TRange[])[],
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

const _top = (state: types.TStateDraftWithReadonly, node_id: types.TNodeId) => {
  if (state.data.nodes[node_id].status !== "todo") {
    toast.add("error", `Non-todo node ${node_id} cannot be moved.`);
    return;
  }
  _topTree(state, node_id);
  _topQueue(state, node_id);
};

const _topTree = (
  state: types.TStateDraftWithReadonly,
  node_id: types.TNodeId,
) => {
  if (state.data.nodes[node_id].status !== "todo") {
    toast.add("error", `Non-todo node ${node_id} cannot be moved.`);
    return;
  }
  const parents = ops.sorted_keys_of(state.data.nodes[node_id].parents);
  if (parents.length < 1) {
    return;
  }
  for (const edge_id of parents) {
    const edge = state.data.edges[edge_id];
    if (edge.t === "strong" && state.data.nodes[edge.p].status === "todo") {
      swapper.set(
        state.data.nodes,
        state.swapped_nodes,
        edge.p,
        "children",
        immer.produce(state.data.nodes[edge.p].children, (children) => {
          children[edge_id] = ops.getFrontIndex(children);
        }),
      );
      return;
    }
  }
};

const _topQueue = (
  state: types.TStateDraftWithReadonly,
  node_id: types.TNodeId,
) => {
  if (state.data.nodes[node_id].status !== "todo") {
    toast.add("error", `Non-todo node ${node_id} cannot be moved.`);
    return;
  }
  state.data.queue[node_id] = ops.getFrontIndex(state.data.queue);
  const node_ids =
    state.data.nodes[node_id].status === "todo"
      ? state.todo_node_ids
      : state.non_todo_node_ids;
  const i = node_ids.indexOf(node_id);
  if (i < 0) {
    return;
  }
  ops.move(node_ids, i, 0);
};

const _show_path_to_selected_node = (
  state: types.TStateDraftWithReadonly,
  node_id: types.TNodeId,
) => {
  while (ops.keys_of(state.data.nodes[node_id].parents).length) {
    let parent_edge_id = null;
    for (const edge_id of ops.sorted_keys_of(
      state.data.nodes[node_id].parents,
    )) {
      if (state.data.edges[edge_id].t === "strong") {
        parent_edge_id = edge_id;
        break;
      }
    }
    if (parent_edge_id === null) {
      return;
    }
    node_id = state.data.edges[parent_edge_id].p;
    const edge = state.data.edges[parent_edge_id];
    if (edge.hide) {
      swapper.del2(
        state.data.edges,
        state.swapped_edges,
        parent_edge_id,
        "hide",
      );
      swapper.set(
        state.caches,
        state.swapped_caches,
        edge.p,
        "n_hidden_child_edges",
        state.caches[edge.p].n_hidden_child_edges - 1,
      );
    }
  }
};

const _estimate = (
  estimates: number[],
  ratios: number[],
  weights: number[],
  n_mc: number,
) => {
  const ts = Array<number>(n_mc);
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
  state: immer.Immutable<types.TState>,
  edge_filter: (edge: types.TEdge) => boolean,
) => {
  return _todo_leafs_of(node_id, state, edge_filter, utils.visit_counter_of());
};
function* _todo_leafs_of(
  node_id: types.TNodeId,
  state: immer.Immutable<types.TState>,
  edge_filter: (edge: types.TEdge) => boolean,
  vid: number,
): Iterable<[types.TNodeId, immer.Immutable<types.TNode>]> {
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
    state: undefined | types.TState,
    action: types.TAnyPayloadAction,
  ) => {
    state: types.TState;
    patch: producer.TOperation[];
  },
) => {
  return (state: undefined | types.TState, action: types.TAnyPayloadAction) => {
    return reducer_with_patch(state, action).state;
  };
};
