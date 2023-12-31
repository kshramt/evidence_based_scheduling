import * as Rtk from "@reduxjs/toolkit";

import * as actions from "./actions";
import * as distribution_predictor from "src/distribution_predictor";
import * as types from "./types";
import * as utils from "./utils";
import * as checks from "./checks";
import * as ops from "./ops";
import * as immer from "immer";
import * as toast from "./toast";
import * as nap from "./next_action_predictor";
import * as consts from "./consts";
import * as swapper from "src/swapper";
import * as total_time_utils from "./total_time_utils";

export const getRootReducer = (
  initialState: types.TState,
  next_action_predictor2: nap.BiGramPredictor<types.TNodeId>,
  next_action_predictor3: nap.TriGramPredictor<types.TNodeId>,
  n_predicted: number,
) => {
  return Rtk.createReducer(initialState, (builder) => {
    builder.addCase(
      actions.addNewEventAction,
      (state: types.TStateDraftWithReadonly, action) => {
        const node = state.data.nodes[action.payload.nodeId];
        const events = immer.produce(node.events || [], (events) => {
          events.push(immer.castDraft(action.payload.event));
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
    builder.addCase(
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
            events[action.payload.i] = immer.castDraft(action.payload.event);
          }),
        );
      },
    );
    builder.addCase(
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
    builder.addCase(
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
    builder.addCase(
      actions.eval_,
      (state: types.TStateDraftWithReadonly, action) => {
        const k = action.payload;
        distribution_predictor.predict(state, k, utils.visit_counter_of());
      },
    );
    builder.addCase(
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
          total_time_utils.setTotalTimeOfAncestors(state, parent_node_id, vid);
        }
      },
    );
    builder.addCase(
      actions.parseTocAction,
      (state: types.TStateDraftWithReadonly, action) => {
        ops.makeNodesOfToc(action.payload, state);
      },
    );
    builder.addCase(
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
        total_time_utils.setTotalTimeOfAncestors(state, edge.p, vid);
      },
    );
    builder.addCase(
      actions.add_action,
      (state: types.TStateDraftWithReadonly, action) => {
        ops.add_node(state, action.payload.node_id, action.payload.show_mobile);
      },
    );
    builder.addCase(
      actions.addNodesToTimeNodeAction,
      (state: types.TStateDraftWithReadonly, action) => {
        const [t0, t1] = utils.getRangeOfTimeId(action.payload.timeId);
        const start = { f: t0 };
        const end = { f: t1 };
        const created_at = Date.now();
        nodeIdLoop: for (const nodeId of action.payload.nodeIds) {
          const node = state.data.nodes[nodeId];
          if (node === undefined) {
            continue;
          }
          // Skip if the node is already assigned to the time node.
          for (const event of node.events ?? []) {
            if (
              utils.getEventStatus(event) === "created" &&
              typeof event.interval_set.start === "object" &&
              event.interval_set.start.f === start.f &&
              typeof event.interval_set.end === "object" &&
              event.interval_set.end.f === end.f
            ) {
              continue nodeIdLoop;
            }
          }
          swapper.set(
            state.data.nodes,
            state.swapped_nodes,
            nodeId,
            "events",
            immer.produce(node.events ?? [], (events) => {
              events.push({
                status: [created_at],
                interval_set: {
                  start,
                  end,
                  limit: { c: 1 },
                  delta: consts.DAY,
                },
              });
            }),
          );
        }
      },
    );
    builder.addCase(
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
    builder.addCase(
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
    builder.addCase(
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
    builder.addCase(
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
    builder.addCase(
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
    builder.addCase(
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
    builder.addCase(
      actions.top_action,
      (state: types.TStateDraftWithReadonly, action) => {
        _top(state, action.payload);
      },
    );
    builder.addCase(actions.smallestToTop, (state) => {
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
    builder.addCase(actions.closestToTop, (state) => {
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
    builder.addCase(actions.move_important_node_to_top_action, (state) => {
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
    builder.addCase(
      total_time_utils.set_total_time_action,
      (state: types.TStateDraftWithReadonly, action) => {
        for (const node_id of action.payload.node_ids) {
          if (state.data.nodes[node_id] === undefined) {
            continue;
          }
          total_time_utils.setTotalTime(
            state,
            node_id,
            utils.visit_counter_of(),
            action.payload.force,
          );
        }
      },
    );
    builder.addCase(
      actions.stop_action,
      (state: types.TStateDraftWithReadonly, action) => {
        const vid = utils.visit_counter_of();
        stop(state, action.payload, vid);
      },
    );
    builder.addCase(actions.stop_all_action, (state) => {
      const vid = utils.visit_counter_of();
      stop_all(state, vid);
    });
    builder.addCase(
      actions.moveUp_,
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
      },
    );
    builder.addCase(
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
    builder.addCase(
      actions.set_estimate_action,
      (state: types.TStateDraftWithReadonly, action) => {
        ops.set_estimate(action.payload, state);
      },
    );
    builder.addCase(
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
        total_time_utils.setTotalTimeOfAncestors(
          state,
          action.payload.node_id,
          vid,
        );
      },
    );
    builder.addCase(
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
    builder.addCase(
      actions.set_text_action,
      (state: types.TStateDraftWithReadonly, action) => {
        const node_id = action.payload.k;
        const text = action.payload.text;
        ops.setText(state, node_id, text);
      },
    );
    builder.addCase(
      actions.set_time_node_text_action,
      (state: types.TStateDraftWithReadonly, action) => {
        const time_node =
          state.data.timeline.time_nodes[action.payload.time_node_id] ||
          ops.new_time_node_of();
        time_node.text = action.payload.text;
        state.data.timeline.time_nodes[action.payload.time_node_id] = time_node;
      },
    );
    builder.addCase(
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
        ops.moveToFrontOfChildren(state, node_id);
        {
          const i = state.todo_node_ids.indexOf(node_id);
          state.todo_node_ids.splice(i, 1);
          state.non_todo_node_ids.splice(0, 0, node_id);
        }
      },
    );
    builder.addCase(
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
        ops.moveToFrontOfChildren(state, node_id);
        {
          const i = state.todo_node_ids.indexOf(node_id);
          state.todo_node_ids.splice(i, 1);
          state.non_todo_node_ids.splice(0, 0, node_id);
        }
      },
    );
    builder.addCase(
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
                children[edge_id] = ops.getFrontIndex(children)[0];
              },
            ),
          );
        }
      },
    );
    builder.addCase(
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
    builder.addCase(
      actions.show_path_to_selected_node,
      (state: types.TStateDraftWithReadonly, action) => {
        _show_path_to_selected_node(state, action.payload);
      },
    );
    builder.addCase(
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
    builder.addCase(
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
    builder.addCase(
      actions.add_edges_action,
      (state: types.TStateDraftWithReadonly, action) => {
        const vid = utils.visit_counter_of();
        ops.add_edges(action.payload, state);
        for (const edge of action.payload) {
          total_time_utils.setTotalTimeOfAncestors(state, edge.p, vid);
        }
      },
    );
    builder.addCase(actions.increment_count_action, (state) => {
      ++state.data.timeline.count;
    });
  });
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
    total_time_utils.setTotalTimeOfAncestors(state, node_id, vid);
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
          children[edge_id] = ops.getFrontIndex(children)[0];
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
  state.data.queue[node_id] = ops.getFrontIndex(state.data.queue)[0];
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

const assert = (fn: () => [boolean, string]) => {
  if ("production" !== process.env.NODE_ENV) {
    const [v, msg] = fn();
    if (!v) {
      throw new Error(msg);
    }
  }
};
