import React, { useCallback, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  Provider,
  TypedUseSelectorHook,
  useDispatch as _useDispatch,
  useSelector as _useSelector,
} from "react-redux";
import { createStore, applyMiddleware } from "redux";
import thunk, { ThunkDispatch } from "redux-thunk";
import * as immer from "immer";
// import memoize from "proxy-memoize";  // Too large overhead
import "@fontsource/material-icons";

import * as checks from "./checks";
import * as consts from "./consts";
import * as nap from "./next_action_predictor";
import * as toast from "./toast";
import "./lib.css";
import * as types from "./types";
import * as utils from "./utils";
import * as ops from "./ops";
import * as rtk from "./rtk";
import * as undoable from "./undoable";
import * as client from "./client";
import * as saver from "./saver";
import * as producer from "./producer";

const MENU_HEIGHT = "3rem" as const;
const START_MARK = <span className="material-icons">play_arrow</span>;
const START_CONCURRNET_MARK = (
  <span className="material-icons">double_arrow</span>
);
const ADD_MARK = <span className="material-icons">add</span>;
const STOP_MARK = <span className="material-icons">stop</span>;
const TOP_MARK = <span className="material-icons">arrow_upward</span>;
const UNDO_MARK = <span className="material-icons">undo</span>;
const MOVE_UP_MARK = <span className="material-icons">north</span>;
const MOVE_DOWN_MARK = <span className="material-icons">south</span>;
const EVAL_MARK = <span className="material-icons">functions</span>;
const DONE_MARK = <span className="material-icons">done</span>;
const DONT_MARK = <span className="material-icons">delete</span>;
const DETAIL_MARK = <span className="material-icons">more_vert</span>;
const COPY_MARK = <span className="material-icons">content_copy</span>;
const TOC_MARK = <span className="material-icons">toc</span>;
const FORWARD_MARK = <span className="material-icons">arrow_forward_ios</span>;
const BACK_MARK = <span className="material-icons">arrow_back_ios</span>;

const USER_ID = 1;
const N_PREDICTED = 5;

const history_type_set = new Set<string>();
const register_history_type = <T extends {}>(x: T) => {
  history_type_set.add(x.toString());
  return x;
};

const next_action_predictor3 = new nap.TriGramPredictor<types.TNodeId>(0.9);
const next_action_predictor2 = new nap.BiGramPredictor<types.TNodeId>(0.9);

// Vose (1991)'s linear version of Walker (1974)'s alias method.
// A Pactical Version of Vose's Algorithm: https://www.keithschwarz.com/darts-dice-coins/
export class Multinomial {
  i_large_of: number[];
  thresholds: number[];
  constructor(ws: number[]) {
    const n = ws.length;
    const total = sum(ws);
    const thresholds = Array(n);
    const i_large_of = Array(n);
    const i_small_list = Array(n);
    const i_large_list = Array(n);
    let small_last = -1;
    let large_last = -1;
    {
      const coef = n / total;
      for (let i = 0; i < ws.length; ++i) {
        const w = coef * ws[i];
        thresholds[i] = w;
        if (w <= 1) {
          i_small_list[++small_last] = i;
        } else {
          i_large_list[++large_last] = i;
        }
      }
    }
    while (-1 < small_last && -1 < large_last) {
      const i_small = i_small_list[small_last];
      --small_last;
      const i_large = i_large_list[large_last];
      i_large_of[i_small] = i_large;
      thresholds[i_large] = thresholds[i_large] + thresholds[i_small] - 1;
      if (thresholds[i_large] <= 1) {
        --large_last;
        i_small_list[++small_last] = i_large;
      }
    }
    // Loop for large_last is not necessary since thresholds for them are greater than one and are always accepted.
    for (let i = 0; i < small_last + 1; ++i) {
      thresholds[i_small_list[i]] = 1; // Address numerical errors.
    }
    this.i_large_of = i_large_of;
    this.thresholds = thresholds;
  }

  sample = () => {
    const i = Math.floor(this.thresholds.length * Math.random());
    return Math.random() < this.thresholds[i] ? i : this.i_large_of[i];
  };
}

const stop = (
  draft: immer.Draft<types.IState>,
  node_id: types.TNodeId,
  t?: number,
) => {
  const last_range = draft.data.nodes[node_id].ranges.at(-1);
  if (last_range && last_range.end === null) {
    last_range.end = t ?? Number(new Date());
    ops.update_node_caches(node_id, draft);
    _set_total_time(draft, node_id);
  }
};

const stop_all = (draft: immer.Draft<types.IState>) => {
  const t = Number(new Date());
  for (const node_id of ops.keys_of(draft.data.queue)) {
    stop(draft, node_id, t);
  }
};

const eval_ = register_history_type(rtk.action_of_of<types.TNodeId>("eval_"));
const delete_action = register_history_type(
  rtk.action_of_of<types.TNodeId>("delete_action"),
);
const parse_toc_action = register_history_type(
  rtk.action_of_of<types.TNodeId>("parse_toc_action"),
);
const delete_edge_action = register_history_type(
  rtk.action_of_of<types.TEdgeId>("delete_edge_action"),
);
const new_action = register_history_type(
  rtk.action_of_of<types.TNodeId>("new_action"),
);
const flipShowTodoOnly = register_history_type(
  rtk.action_of_of("flipShowTodoOnly"),
);
const toggle_show_strong_edge_only_action = register_history_type(
  rtk.action_of_of("toggle_show_strong_edge_only_action"),
);
const flipShowDetail = rtk.action_of_of<types.TNodeId>("flipShowDetail");
const start_action = register_history_type(
  rtk.action_of_of<{ node_id: types.TNodeId; is_concurrent: boolean }>(
    "start_action",
  ),
);
const top_action = register_history_type(
  rtk.action_of_of<types.TNodeId>("top_action"),
);
const smallestToTop = register_history_type(rtk.action_of_of("smallestToTop"));
const closestToTop = register_history_type(rtk.action_of_of("closestToTop"));
const move_important_node_to_top_action = register_history_type(
  rtk.action_of_of("move_important_node_to_top_action"),
);
const set_total_time = register_history_type(
  rtk.action_of_of<types.TNodeId>("set_total_time"),
);
const stop_action = register_history_type(
  rtk.action_of_of<types.TNodeId>("stop_action"),
);
const stop_all_action = register_history_type(
  rtk.action_of_of("stop_all_action"),
);
const moveUp_ = register_history_type(
  rtk.action_of_of<types.TNodeId>("moveUp_"),
);
const moveDown_ = register_history_type(
  rtk.action_of_of<types.TNodeId>("moveDown_"),
);
const set_estimate_action = register_history_type(
  rtk.action_of_of<{
    node_id: types.TNodeId;
    estimate: number;
  }>("set_estimate_action"),
);
const set_range_value_action = register_history_type(
  rtk.action_of_of<{
    node_id: types.TNodeId;
    i_range: number;
    k: keyof types.IRange;
    v: string;
  }>("set_range_value_action"),
);
const delete_range_action = register_history_type(
  rtk.action_of_of<{
    node_id: types.TNodeId;
    i_range: number;
  }>("delete_range_action"),
);
const set_text_action = register_history_type(
  rtk.action_of_of<{
    k: types.TNodeId;
    text: string;
  }>("set_text_action"),
);
const todoToDone = register_history_type(
  rtk.action_of_of<types.TNodeId>("todoToDone"),
);
const todoToDont = register_history_type(
  rtk.action_of_of<types.TNodeId>("todoToDont"),
);
const done_or_dont_to_todo_action = register_history_type(
  rtk.action_of_of<types.TNodeId>("done_or_dont_to_todo_action"),
);
const toggle_show_children = register_history_type(
  rtk.action_of_of<types.TNodeId>("toggle_show_children"),
);
const show_path_to_selected_node = register_history_type(
  rtk.action_of_of<types.TNodeId>("show_path_to_selected_node"),
);
const set_edge_type_action = register_history_type(
  rtk.action_of_of<{ edge_id: types.TEdgeId; edge_type: types.TEdgeType }>(
    "set_edge_type_action",
  ),
);
const toggle_edge_hide_action = register_history_type(
  rtk.action_of_of<types.TEdgeId>("toggle_edge_hide_action"),
);
const add_edges_action = register_history_type(
  rtk.action_of_of<types.IEdge[]>("add_edges_action"),
);
const set_n_unsaved_patches_action = rtk.action_of_of<number>(
  "set_n_unsaved_patches_action",
);

const root_reducer_def = (
  builder: <Payload>(
    action_of: rtk.TActionOf<Payload>,
    reduce: rtk.TReduce<types.IState, Payload>,
  ) => void,
) => {
  builder(set_n_unsaved_patches_action, (state, action) => {
    state.n_unsaved_patches = action.payload;
  });
  builder(eval_, (state, action) => {
    const k = action.payload;
    _eval_(state, k);
  });
  builder(delete_action, (state, action) => {
    const node_id = action.payload;
    if (checks.is_deletable_node(node_id, state)) {
      const node = state.data.nodes[node_id];
      for (const edge_id of ops.keys_of(node.parents)) {
        const parent_node_id = state.data.edges[edge_id].p;
        delete state.caches[parent_node_id].child_edges[edge_id];
        delete state.caches[parent_node_id].child_nodes[node_id];
        delete state.data.nodes[parent_node_id].children[edge_id];
        delete state.data.edges[edge_id];
      }
      for (const edge_id of ops.keys_of(node.children)) {
        const child_node_id = state.data.edges[edge_id].c;
        delete state.caches[child_node_id].parent_edges[edge_id];
        delete state.caches[child_node_id].parent_nodes[node_id];
        delete state.data.nodes[child_node_id].parents[edge_id];
        delete state.data.edges[edge_id];
      }
      delete state.data.queue[node_id];
      delete state.data.nodes[node_id];
      delete state.caches[node_id];
    } else {
      toast.add("error", `Node ${node_id} is not deletable.`);
    }
  });
  builder(parse_toc_action, (state, action) => {
    ops.make_nodes_of_toc(action.payload, state);
  });
  builder(delete_edge_action, (state, action) => {
    const edge_id = action.payload;
    if (!checks.is_deletable_edge_of(edge_id, state)) {
      toast.add(
        "error",
        `Edge ${state.data.edges[edge_id]} cannot be deleted.`,
      );
      return;
    }
    const edge = state.data.edges[edge_id];
    delete state.caches[edge.p].child_edges[edge_id];
    delete state.caches[edge.p].child_nodes[edge.c];
    delete state.caches[edge.c].parent_edges[edge_id];
    delete state.caches[edge.c].parent_nodes[edge.p];
    delete state.data.nodes[edge.p].children[edge_id];
    delete state.data.nodes[edge.c].parents[edge_id];
    ops.update_node_caches(edge.p, state);
    ops.update_node_caches(edge.c, state);
    delete state.data.edges[edge_id];
  });
  builder(new_action, (state, action) => {
    ops.new_(state, action.payload, is_mobile());
  });
  builder(flipShowTodoOnly, (state) => {
    state.data.showTodoOnly = !state.data.showTodoOnly;
  });
  builder(toggle_show_strong_edge_only_action, (state) => {
    state.data.show_strong_edge_only = !state.data.show_strong_edge_only;
  });
  builder(flipShowDetail, (state, action) => {
    const node_id = action.payload;
    state.caches[node_id].show_detail = !state.caches[node_id].show_detail;
  });
  builder(start_action, (state, action) => {
    const node_id = action.payload.node_id;
    if (state.data.nodes[node_id].status !== "todo") {
      toast.add("error", `Non-todo node ${node_id} cannot be started.`);
      return;
    }
    const last_range = state.data.nodes[node_id].ranges.at(-1);
    if (!last_range || last_range.end !== null) {
      _top(state, node_id);
      assert(() => [
        state.data.nodes[node_id].status === "todo",
        "Must not happen",
      ]);
      if (!action.payload.is_concurrent) {
        stop_all(state);
      }
      state.data.nodes[node_id].ranges.push({
        start: Number(new Date()),
        end: null,
      });
      ops.update_node_caches(node_id, state);
      _show_path_to_selected_node(state, node_id);
    }
    next_action_predictor3.fit(node_id);
    next_action_predictor2.fit(node_id);
    set_predicted_next_nodes(state);
  });
  builder(top_action, (state, action) => {
    _top(state, action.payload);
  });
  builder(smallestToTop, (state) => {
    const node_ids = ops.sorted_keys_of(state.data.queue);
    for (let dst = 0; dst < node_ids.length - 1; ++dst) {
      let src_min = null;
      let estimate_min = Infinity;
      for (let src = dst; src < node_ids.length; ++src) {
        const node_id = node_ids[src];
        const node = state.data.nodes[node_id];
        if (
          node.status === "todo" &&
          !ops
            .keys_of(node.children)
            .some(
              (edge_id) =>
                state.data.nodes[state.data.edges[edge_id].c].status === "todo",
            ) &&
          0 < node.estimate &&
          node.estimate < estimate_min
        ) {
          src_min = src;
          estimate_min = node.estimate;
        }
      }
      if (src_min !== null && src_min !== dst) {
        ops.move_before(state.data.queue, src_min, dst, node_ids);
        break;
      }
    }
  });
  builder(closestToTop, (state) => {
    let node_id_min = null;
    let due_min = ":due: 9999-12-31T23:59:59";
    for (let node_id of ops.keys_of(state.data.queue)) {
      let node = state.data.nodes[node_id];
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
          for (const w of node.text.split("\n")) {
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
        }
      }
    }
    if (node_id_min !== null) {
      _top(
        state,
        todo_leafs_of(node_id_min, state, () => true)
          [Symbol.iterator]()
          .next().value[0],
      );
    }
  });
  builder(move_important_node_to_top_action, (state) => {
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
    for (const node_id of ops.keys_of(state.data.queue)) {
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
  builder(set_total_time, (state, action) => {
    _set_total_time(state, action.payload);
  });
  builder(stop_action, (state, action) => {
    stop(state, action.payload);
  });
  builder(stop_all_action, (state) => {
    stop_all(state);
  });
  builder(moveUp_, (state, action) => {
    if (state.data.nodes[action.payload].status === "todo") {
      for (const edge_id of ops.keys_of(
        state.data.nodes[action.payload].parents,
      )) {
        const node_id = state.data.edges[edge_id].p;
        ops.move_up(state.data.nodes[node_id].children, edge_id);
        ops.update_node_caches(node_id, state);
      }
      ops.move_up(state.data.queue, action.payload);
    } else {
      toast.add("error", `Non-todo node ${action.payload} cannot be moved up.`);
    }
  });
  builder(moveDown_, (state, action) => {
    if (state.data.nodes[action.payload].status === "todo") {
      for (const edge_id of ops.keys_of(
        state.data.nodes[action.payload].parents,
      )) {
        const node_id = state.data.edges[edge_id].p;
        ops.move_down(state.data.nodes[node_id].children, edge_id);
        ops.update_node_caches(node_id, state);
      }
      ops.move_down(state.data.queue, action.payload);
    } else {
      toast.add(
        "error",
        `Non-todo node ${action.payload} cannot be moved down.`,
      );
    }
  });
  builder(set_estimate_action, (state, action) => {
    ops.set_estimate(action.payload, state);
  });
  builder(set_range_value_action, (state, action) => {
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
    const milliseconds = utils.milliseconds_of_datetime_local(action.payload.v);
    if (isNaN(milliseconds)) {
      toast.add("error", `Invalid datetime_local: ${JSON.stringify(action)}`);
      return;
    }
    range[action.payload.k] = milliseconds;
    if (range.end !== null && range.end < range.start) {
      toast.add("error", `range.end < range.start: ${JSON.stringify(action)}`);
      range[action.payload.k] = prev_milliseconds;
    }
    ops.update_node_caches(action.payload.node_id, state);
  });
  builder(delete_range_action, (state, action) => {
    state.data.nodes[action.payload.node_id].ranges.splice(
      action.payload.i_range,
      1,
    );
    ops.update_node_caches(action.payload.node_id, state);
  });
  builder(set_text_action, (state, action) => {
    const node_id = action.payload.k;
    const text = action.payload.text;
    const node = state.data.nodes[node_id];
    if (text !== node.text) {
      node.text = text;
    }
    ops.update_node_caches(node_id, state);
  });
  builder(todoToDone, (state, action) => {
    const node_id = action.payload;
    if (!checks.is_completable_node_of(node_id, state)) {
      toast.add(
        "error",
        `The status of node ${node_id} cannot be set to done.`,
      );
      return;
    }
    stop(state, node_id);
    state.data.nodes[node_id].status = "done";
    state.data.nodes[node_id].end_time = Number(new Date());
    ops.update_node_caches(node_id, state);
    move_down_to_boundary(state, node_id, (status) => status !== "todo");
    _topQueue(state, node_id);
  });
  builder(todoToDont, (state, action) => {
    const node_id = action.payload;
    if (!checks.is_completable_node_of(node_id, state)) {
      toast.add(
        "error",
        `The status of node ${node_id} cannot be set to dont.`,
      );
      return;
    }
    stop(state, node_id);
    state.data.nodes[node_id].status = "dont";
    state.data.nodes[node_id].end_time = Number(new Date());
    ops.update_node_caches(node_id, state);
    move_down_to_boundary(state, node_id, (status) => status === "dont");
    _topQueue(state, node_id);
  });
  builder(done_or_dont_to_todo_action, (state, action) => {
    const node_id = action.payload;
    if (!checks.is_uncompletable_node_of(node_id, state)) {
      toast.add("error", `Node ${node_id} cannot be set to todo.`);
      return;
    }
    state.data.nodes[node_id].status = "todo";
    ops.update_node_caches(node_id, state);
    for (const edge_id of ops.keys_of(state.data.nodes[node_id].parents)) {
      ops.move_to_front(
        state.data.nodes[state.data.edges[edge_id].p].children,
        edge_id,
      );
      ops.update_node_caches(state.data.edges[edge_id].p, state);
    }
  });
  builder(toggle_show_children, (state, action) => {
    const node_id = action.payload;
    if (
      ops
        .keys_of(state.data.nodes[node_id].children)
        .every((edge_id) => !state.data.edges[edge_id].hide)
    ) {
      for (const edge_id of ops.keys_of(state.data.nodes[node_id].children)) {
        state.data.edges[edge_id].hide = true;
        ops.update_edge_caches(edge_id, state);
      }
      return;
    }
    for (const edge_id of ops.keys_of(state.data.nodes[node_id].children)) {
      delete state.data.edges[edge_id].hide;
      ops.update_edge_caches(edge_id, state);
    }
  });
  builder(show_path_to_selected_node, (state, action) => {
    _show_path_to_selected_node(state, action.payload);
  });
  builder(set_edge_type_action, (state, action) => {
    if (!checks.is_deletable_edge_of(action.payload.edge_id, state)) {
      toast.add(
        "error",
        `${action} is not applicable to Edge${
          state.data.edges[action.payload.edge_id]
        }.`,
      );
    }
    const edge = state.data.edges[action.payload.edge_id];
    edge.t = action.payload.edge_type;
    ops.update_edge_caches(action.payload.edge_id, state);
  });
  builder(toggle_edge_hide_action, (state, action) => {
    if (state.data.edges[action.payload].hide) {
      delete state.data.edges[action.payload].hide;
    } else {
      state.data.edges[action.payload].hide = true;
    }
    ops.update_edge_caches(action.payload, state);
  });
  builder(add_edges_action, (state, action) => {
    return ops.add_edges(action.payload, state);
  });
};

const move_down_to_boundary = (
  state: immer.Draft<types.IState>,
  node_id: types.TNodeId,
  is_different: (status: types.TStatus) => boolean,
) => {
  for (const edge_id of ops.keys_of(state.data.nodes[node_id].parents)) {
    const children = state.data.nodes[state.data.edges[edge_id].p].children;
    const edge_ids = ops.sorted_keys_of(children);
    const i_edge = edge_ids.indexOf(edge_id);
    if (i_edge + 1 === edge_ids.length) {
      return;
    }
    let i_seek = i_edge + 1;
    for (; i_seek < edge_ids.length; ++i_seek) {
      if (
        is_different(
          state.data.nodes[state.data.edges[edge_ids[i_seek]].c].status,
        )
      ) {
        break;
      }
    }
    if (
      i_seek + 1 === edge_ids.length &&
      !is_different(
        state.data.nodes[state.data.edges[edge_ids[i_seek]].c].status,
      )
    ) {
      ++i_seek;
    }
    if (i_seek <= edge_ids.length && i_edge + 1 < i_seek) {
      ops.move_before(children, i_edge, i_seek, edge_ids);
      ops.update_node_caches(state.data.edges[edge_id].p, state);
    }
  }
};

const set_predicted_next_nodes = (state: immer.Draft<types.IState>) => {
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
    .slice(0, N_PREDICTED);
  if (predicted.length < N_PREDICTED) {
    predicted = predicted.concat(
      next_action_predictor2.predict().filter((node_id) => {
        return cond(node_id) && !predicted.includes(node_id);
      }),
    );
  }
  state.predicted_next_nodes = predicted.slice(0, N_PREDICTED);
};

const is_mobile = () => {
  const ua = window.navigator.userAgent;
  return /(Mobi|Tablet|iPad)/.test(ua);
};

const MobileMenu = () => {
  const root = useSelector((state) => state.data.root);
  const dispatch = useDispatch();
  const stop_all = useCallback(() => dispatch(stop_all_action()), [dispatch]);
  const showTodoOnly = useSelector((state) => state.data.showTodoOnly);
  const n_unsaved_patches = useSelector((state) => state.n_unsaved_patches);
  const _undo = useCallback(() => {
    dispatch({ type: undoable.UNDO_TYPE });
  }, [dispatch]);
  const _redo = useCallback(() => {
    dispatch({ type: undoable.REDO_TYPE });
  }, [dispatch]);
  const _flipShowTodoOnly = useCallback(() => {
    dispatch(flipShowTodoOnly());
  }, [dispatch]);
  return (
    <div
      className={`flex items-center fixed z-[999999] gap-x-[0.25em] w-full top-0  bg-gray-200 dark:bg-gray-900`}
      style={{ height: MENU_HEIGHT }}
    >
      <button className="btn-icon" onClick={stop_all}>
        {STOP_MARK}
      </button>
      {NewButton_of(dispatch, root)}
      <button className="btn-icon" arial-label="Undo." onClick={_undo}>
        {UNDO_MARK}
      </button>
      <button className="btn-icon" arial-label="Redo." onClick={_redo}>
        <span className="material-icons">redo</span>
      </button>
      <div onClick={_flipShowTodoOnly}>
        TODO:{" "}
        <input
          type="radio"
          checked={Boolean(showTodoOnly)}
          onChange={_suppress_missing_onChange_handler_warning}
        />
      </div>
      <MobileNodeFilterQueryInput />
      <span className="grow" />
      {n_unsaved_patches ? (
        <span className="pr-[1ex]">{n_unsaved_patches} left</span>
      ) : null}
    </div>
  );
};

const MobileBody = () => {
  return (
    <div
      className="flex w-full h-screen gap-x-8 overflow-y-hidden"
      style={{
        paddingTop: MENU_HEIGHT,
      }}
    >
      <div className={`overflow-y-scroll shrink-0`}>
        <MobileQueueColumn />
      </div>
    </div>
  );
};

const MobileQueueColumn = () => {
  return (
    <>
      <MobilePredictedNextNodes />
      <MobileQueueNodes />
    </>
  );
};

const MobileQueueNodes = () => {
  const queue = useSelector((state) => state.data.queue);
  const nodes = useSelector((state) => state.data.nodes);
  const showTodoOnly = useSelector((state) => state.data.showTodoOnly);
  const node_filter_query = React.useContext(node_filter_query_slow_context);
  const node_ids = ops
    .sorted_keys_of(queue)
    .filter((node_id) => {
      const node = nodes[node_id];
      return !_should_hide_of(
        showTodoOnly,
        node.status !== "todo",
        node_filter_query,
        node.text,
        node_id,
      );
    })
    .slice(0, 50);
  return (
    <>
      {node_ids.map((node_id) => (
        <div className="mb-[1em] last:mb-0" key={node_id}>
          <EntryWrapper node_id={node_id}>
            <TextArea node_id={node_id} style={{ width: "100vw" }} />
            <MobileEntryButtons node_id={node_id} />
            <Details node_id={node_id} />
          </EntryWrapper>
        </div>
      ))}
    </>
  );
};

const MobileApp = () => {
  const [node_filter_query_fast, set_node_filter_query_fast] =
    React.useState("");
  const [node_filter_query_slow, set_node_filter_query_slow] =
    React.useState("");
  saver.useCheckUpdates(USER_ID);
  return (
    <set_node_filter_query_slow_context.Provider
      value={set_node_filter_query_slow}
    >
      <set_node_filter_query_fast_context.Provider
        value={set_node_filter_query_fast}
      >
        <node_filter_query_slow_context.Provider value={node_filter_query_slow}>
          <node_filter_query_fast_context.Provider
            value={node_filter_query_fast}
          >
            <MobileMenu />
            <MobileBody />
            {toast.component}
            <saver.Component user_id={USER_ID} />
          </node_filter_query_fast_context.Provider>
        </node_filter_query_slow_context.Provider>
      </set_node_filter_query_fast_context.Provider>
    </set_node_filter_query_slow_context.Provider>
  );
};

const App = () => {
  const [node_filter_query_fast, set_node_filter_query_fast] =
    React.useState("");
  const [node_filter_query_slow, set_node_filter_query_slow] =
    React.useState("");
  const [node_ids, set_node_ids] = React.useState("");
  saver.useCheckUpdates(USER_ID);
  return (
    <set_node_filter_query_slow_context.Provider
      value={set_node_filter_query_slow}
    >
      <set_node_filter_query_fast_context.Provider
        value={set_node_filter_query_fast}
      >
        <set_node_ids_context.Provider value={set_node_ids}>
          <node_ids_context.Provider value={node_ids}>
            <node_filter_query_slow_context.Provider
              value={node_filter_query_slow}
            >
              <node_filter_query_fast_context.Provider
                value={node_filter_query_fast}
              >
                <Menu />
                <Body />
                {toast.component}
                <saver.Component user_id={USER_ID} />
              </node_filter_query_fast_context.Provider>
            </node_filter_query_slow_context.Provider>
          </node_ids_context.Provider>
        </set_node_ids_context.Provider>
      </set_node_filter_query_fast_context.Provider>
    </set_node_filter_query_slow_context.Provider>
  );
};

const Menu = () => {
  const root = useSelector((state) => state.data.root);
  const dispatch = useDispatch();
  const stop_all = useCallback(() => dispatch(stop_all_action()), [dispatch]);
  const showTodoOnly = useSelector((state) => state.data.showTodoOnly);
  const show_strong_edge_only = useSelector(
    (state) => state.data.show_strong_edge_only,
  );
  const n_unsaved_patches = useSelector((state) => state.n_unsaved_patches);
  const _undo = useCallback(() => {
    dispatch({ type: undoable.UNDO_TYPE });
  }, [dispatch]);
  const _redo = useCallback(() => {
    dispatch({ type: undoable.REDO_TYPE });
  }, [dispatch]);
  const _flipShowTodoOnly = useCallback(() => {
    dispatch(flipShowTodoOnly());
  }, [dispatch]);
  const toggle_show_strong_edge_only = useCallback(() => {
    dispatch(toggle_show_strong_edge_only_action());
  }, [dispatch]);
  const _smallestToTop = useCallback(() => {
    dispatch(smallestToTop());
  }, [dispatch]);
  const _closestToTop = useCallback(() => {
    dispatch(closestToTop());
  }, [dispatch]);
  const move_important_node_to_top = useCallback(() => {
    dispatch(move_important_node_to_top_action());
  }, [dispatch]);
  return (
    <div
      className={`flex items-center fixed z-[999999] pl-[1em] gap-x-[0.25em] w-full top-0  bg-gray-200 dark:bg-gray-900`}
      style={{ height: MENU_HEIGHT }}
    >
      <button className="btn-icon" onClick={stop_all}>
        {STOP_MARK}
      </button>
      {NewButton_of(dispatch, root)}
      <button className="btn-icon" arial-label="Undo." onClick={_undo}>
        {UNDO_MARK}
      </button>
      <button className="btn-icon" arial-label="Redo." onClick={_redo}>
        <span className="material-icons">redo</span>
      </button>
      <div onClick={_flipShowTodoOnly}>
        TODO:{" "}
        <input
          type="radio"
          checked={Boolean(showTodoOnly)}
          onChange={_suppress_missing_onChange_handler_warning}
        />
      </div>
      <div onClick={toggle_show_strong_edge_only}>
        Strong:{" "}
        <input
          type="radio"
          checked={Boolean(show_strong_edge_only)}
          onChange={_suppress_missing_onChange_handler_warning}
        />
      </div>
      <button className="btn-icon" onClick={_smallestToTop}>
        Small
      </button>
      <button className="btn-icon" onClick={_closestToTop}>
        Due
      </button>
      <button className="btn-icon" onClick={move_important_node_to_top}>
        Important
      </button>
      <NodeFilterQueryInput />
      <NodeIdsInput />
      <span className="grow" />
      {n_unsaved_patches ? (
        <span className="pr-[1ex]">{n_unsaved_patches} left</span>
      ) : null}
    </div>
  );
};

const MobileNodeFilterQueryInput = () => {
  const set_node_filter_query_fast = React.useContext(
    set_node_filter_query_fast_context,
  );
  const set_node_filter_query_slow = React.useContext(
    set_node_filter_query_slow_context,
  );
  const node_filter_query = React.useContext(node_filter_query_fast_context);
  const handle_change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      set_node_filter_query_fast(v);
      React.startTransition(() => {
        set_node_filter_query_slow(v);
      });
    },
    [set_node_filter_query_fast, set_node_filter_query_slow],
  );
  const clear_input = useCallback(() => {
    const v = "";
    set_node_filter_query_fast(v);
    React.startTransition(() => {
      set_node_filter_query_slow(v);
    });
  }, [set_node_filter_query_fast, set_node_filter_query_slow]);
  return (
    <>
      Filter:
      <div className="flex items-center border border-solid border-gray-400">
        <input
          value={node_filter_query}
          onChange={handle_change}
          className="h-[2em] border-none w-[8em]"
        />
        <button className="btn-icon" onClick={clear_input}>
          {consts.DELETE_MARK}
        </button>
      </div>
    </>
  );
};

const NodeFilterQueryInput = () => {
  const set_node_filter_query_fast = React.useContext(
    set_node_filter_query_fast_context,
  );
  const set_node_filter_query_slow = React.useContext(
    set_node_filter_query_slow_context,
  );
  const node_filter_query = React.useContext(node_filter_query_fast_context);
  const handle_change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      set_node_filter_query_fast(v);
      React.startTransition(() => {
        set_node_filter_query_slow(v);
      });
    },
    [set_node_filter_query_fast, set_node_filter_query_slow],
  );
  const clear_input = useCallback(() => {
    const v = "";
    set_node_filter_query_fast(v);
    React.startTransition(() => {
      set_node_filter_query_slow(v);
    });
  }, [set_node_filter_query_fast, set_node_filter_query_slow]);
  return (
    <>
      Filter:
      <div className="flex items-center border border-solid border-gray-400">
        <input
          value={node_filter_query}
          onChange={handle_change}
          className="h-[2em] border-none"
        />
        <button className="btn-icon" onClick={clear_input}>
          {consts.DELETE_MARK}
        </button>
      </div>
    </>
  );
};

const NodeIdsInput = () => {
  const set_node_ids = React.useContext(set_node_ids_context);
  const node_ids = React.useContext(node_ids_context);
  const handle_change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      set_node_ids(v);
    },
    [set_node_ids],
  );
  const clear_input = useCallback(() => {
    const v = "";
    set_node_ids(v);
  }, [set_node_ids]);
  return (
    <>
      IDs:
      <div className="flex items-center border border-solid border-gray-400">
        <input
          value={node_ids}
          onChange={handle_change}
          className="h-[2em] border-none"
        />
        <button className="btn-icon" onClick={clear_input}>
          {consts.DELETE_MARK}
        </button>
      </div>
    </>
  );
};

const Body = () => {
  const root = useSelector((state) => {
    return state.data.root;
  });
  return (
    <div
      className="flex w-full h-screen gap-x-8 overflow-y-hidden"
      style={{
        paddingTop: MENU_HEIGHT,
      }}
    >
      <div className={`overflow-y-scroll pl-[1em] shrink-0`}>
        <QueueColumn />
      </div>
      <div className={`overflow-y-scroll pl-[1em] shrink-0`}>
        {TreeNode_of(root)}
      </div>
    </div>
  );
};

const doFocusStopButton = (k: types.TNodeId) => () => {
  setTimeout(() => focus(stopButtonRefOf(k).current), 50);
};

const doFocusMoveUpButton = (k: types.TNodeId) => () => {
  setTimeout(() => focus(moveUpButtonRefOf(k).current), 50);
};

const doFocusMoveDownButton = (k: types.TNodeId) => () => {
  setTimeout(() => focus(moveDownButtonRefOf(k).current), 50);
};

const doFocusTextArea = (k: types.TNodeId) => () => {
  setTimeout(() => focus(textAreaRefOf(k).current), 50);
};

const _eval_ = (draft: immer.Draft<types.IState>, k: types.TNodeId) => {
  _set_total_time(draft, k);
  const candidates = ops.keys_of(draft.data.queue).filter((node_id) => {
    const v = draft.data.nodes[node_id];
    return (
      (v.status === "done" || v.status === "dont") &&
      v.estimate !== consts.NO_ESTIMATION
    );
  });
  const ratios = candidates.length
    ? candidates.map((node_id) => {
        const node = draft.data.nodes[node_id];
        return _set_total_time(draft, node_id) / (1000 * 3600) / node.estimate;
        // return draft.caches[v.start_time].total_time / 3600 / v.estimate;
      })
    : [1];
  const now = Number(new Date());
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
  draft.caches[k].leaf_estimates_sum = sum(leaf_estimates);
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

const _set_total_time = (state: types.IState, node_id: types.TNodeId) => {
  return (state.caches[node_id].total_time = total_time_of(state, node_id));
};

const total_time_of = (state: types.IState, node_id: types.TNodeId) => {
  const ranges_list: types.IRange[][] = [];
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
  const count_ge_0: () => [boolean, string] = () => [0 <= count, "0 <= count"];
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
    assert(count_ge_0);
  }
  return res;
};

const collect_ranges_from_strong_descendants = (
  node_id: types.TNodeId,
  state: types.IState,
  vid: number,
  ranges_list: types.IRange[][],
) => {
  if (utils.vids[node_id] === vid) {
    return;
  }
  utils.vids[node_id] = vid;
  if (state.data.nodes[node_id].ranges.length) {
    ranges_list.push(state.data.nodes[node_id].ranges);
  }
  for (const edge_id of ops.keys_of(state.data.nodes[node_id].children)) {
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
  if (draft.data.nodes[node_id].status === "todo") {
    _topTree(draft, node_id);
    _topQueue(draft, node_id);
  } else {
    toast.add("error", `Non-todo node ${node_id} cannot be moved.`);
  }
};

const _topTree = (draft: immer.Draft<types.IState>, node_id: types.TNodeId) => {
  while (ops.keys_of(draft.data.nodes[node_id].parents).length) {
    for (const edge_id of ops.sorted_keys_of(
      draft.data.nodes[node_id].parents,
    )) {
      const edge = draft.data.edges[edge_id];
      if (edge.t === "strong" && draft.data.nodes[edge.p].status === "todo") {
        ops.move_to_front(draft.data.nodes[edge.p].children, edge_id);
        ops.update_node_caches(edge.p, draft);
        node_id = edge.p;
        break;
      }
    }
  }
};

const _topQueue = (
  draft: immer.Draft<types.IState>,
  node_id: types.TNodeId,
) => {
  return ops.move_to_front(draft.data.queue, node_id);
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
    if (draft.data.edges[parent_edge_id].hide) {
      delete draft.data.edges[parent_edge_id].hide;
      ops.update_edge_caches(parent_edge_id, draft);
    }
  }
};

const memoize1 = <A, R>(fn: (a: A) => R) => {
  const cache = new Map<A, R>();
  return (a: A) => {
    if (!cache.has(a)) {
      cache.set(a, fn(a));
    }
    return cache.get(a) as R;
  };
};

const memoize2 = <A, B, R>(fn: (a: A, b: B) => R) => {
  const cache = new Map<A, Map<B, R>>();
  return (a: A, b: B) => {
    if (!cache.has(a)) {
      cache.set(a, new Map<B, R>());
    }
    const c = cache.get(a) as Map<B, R>;
    if (!c.has(b)) {
      c.set(b, fn(a, b));
    }
    return c.get(b) as R;
  };
};

const QueueColumn = () => {
  return (
    <>
      <PredictedNextNodes />
      <QueueNodes />
    </>
  );
};

const MobilePredictedNextNodes = () => {
  const predicted_next_nodes = useSelector(
    (state) => state.predicted_next_nodes,
  );
  return (
    <>
      {predicted_next_nodes.map((node_id) => (
        <MobilePredictedNextNode node_id={node_id} key={node_id} />
      ))}
    </>
  );
};
const MobilePredictedNextNode = (props: { node_id: types.TNodeId }) => {
  const text = useSelector((state) => state.data.nodes[props.node_id].text);
  const dispatch = useDispatch();
  return (
    <div className="flex w-fit gap-x-[0.25em] items-baseline py-[0.125em]">
      {StartButton_of(dispatch, props.node_id)}
      {StartConcurrentButton_of(dispatch, props.node_id)}
      <ToTreeLink node_id={props.node_id}>{text.slice(0, 30)}</ToTreeLink>
    </div>
  );
};

const PredictedNextNodes = () => {
  const predicted_next_nodes = useSelector(
    (state) => state.predicted_next_nodes,
  );
  return (
    <ol>
      {predicted_next_nodes.map((node_id) => (
        <li key={node_id}>
          <PredictedNextNode node_id={node_id} />
        </li>
      ))}
    </ol>
  );
};
const PredictedNextNode = (props: { node_id: types.TNodeId }) => {
  const text = useSelector((state) => state.data.nodes[props.node_id].text);
  const dispatch = useDispatch();
  return (
    <div className="flex w-fit gap-x-[0.25em] items-baseline py-[0.125em]">
      {StartButton_of(dispatch, props.node_id)}
      {StartConcurrentButton_of(dispatch, props.node_id)}
      <ToTreeLink node_id={props.node_id}>{text.slice(0, 30)}</ToTreeLink>
    </div>
  );
};

const QueueNodes = () => {
  const queue = useSelector((state) => state.data.queue);
  const node_ids = ops.sorted_keys_of(queue);
  return <ol>{node_ids.map(QueueNode_of)}</ol>;
};

const TreeNodeList = (props: { node_id_list: types.TNodeId[] }) => {
  // spacing="0.5rem" paddingLeft="1rem"
  return props.node_id_list.length ? (
    <ol className="pt-[1em]">
      {props.node_id_list.map((node_id) => {
        return <li key={node_id}>{TreeNode_of(node_id)}</li>;
      })}
    </ol>
  ) : null;
};

const TreeNode = (props: { node_id: types.TNodeId }) => {
  const entry = TreeEntry_of(props.node_id);
  const showTodoOnly = useSelector((state) => state.data.showTodoOnly);
  const show_strong_edge_only = useSelector(
    (state) => state.data.show_strong_edge_only,
  );
  const children = useSelector(
    (state) => state.data.nodes[props.node_id].children,
  );
  const edges = useSelector((state) => state.caches[props.node_id].child_edges);
  const nodes = useSelector((state) => state.caches[props.node_id].child_nodes);
  const tree_node_list = React.useMemo(() => {
    let edge_id_list = ops
      .sorted_keys_of(children)
      .filter((edge_id) => !edges[edge_id].hide);
    if (showTodoOnly) {
      edge_id_list = edge_id_list.filter(
        (edge_id) => nodes[edges[edge_id].c].status === "todo",
      );
    }
    if (show_strong_edge_only) {
      edge_id_list = edge_id_list.filter(
        (edge_id) => edges[edge_id].t === "strong",
      );
    }
    return (
      <TreeNodeList
        node_id_list={edge_id_list.map((edge_id) => edges[edge_id].c)}
      />
    );
  }, [showTodoOnly, show_strong_edge_only, children, nodes, edges]);

  return (
    <>
      {entry}
      {tree_node_list}
    </>
  );
};
const TreeNode_of = memoize1((node_id: types.TNodeId) => (
  <TreeNode node_id={node_id} />
));

const QueueNode = (props: { node_id: types.TNodeId }) => {
  const entry = QueueEntry_of(props.node_id);
  const showTodoOnly = useSelector((state) => state.data.showTodoOnly);
  const is_not_todo = useSelector(
    (state) => state.data.nodes[props.node_id].status !== "todo",
  );
  const node_filter_query = React.useContext(node_filter_query_slow_context);
  const text = useSelector((state) => state.data.nodes[props.node_id].text);
  const should_hide = _should_hide_of(
    showTodoOnly,
    is_not_todo,
    node_filter_query,
    text,
    props.node_id,
  );
  // className="hidden" is slower.
  return should_hide ? null : <li className="mb-[1em] last:mb-0">{entry}</li>;
};
const QueueNode_of = memoize1((node_id: types.TNodeId) => (
  <QueueNode node_id={node_id} key={node_id} />
));

const _should_hide_of = (
  showTodoOnly: boolean,
  is_not_todo: boolean,
  node_filter_query: string,
  text: string,
  node_id: types.TNodeId,
) => {
  if (showTodoOnly && is_not_todo) {
    return true;
  }
  const node_filter_query_lower = node_filter_query.toLowerCase();
  const text_lower = text.toLowerCase();
  let is_match_filter_node_query = true;
  for (const q of node_filter_query_lower.split(" ")) {
    if (node_id !== q && !text_lower.includes(q)) {
      is_match_filter_node_query = false;
      break;
    }
  }
  return !is_match_filter_node_query;
};

const QueueEntry_of = memoize1((node_id: types.TNodeId) => (
  <EntryWrapper node_id={node_id}>
    <div className="flex items-end w-fit">
      {ToTreeLink_of(node_id)}
      <div id={`q-${node_id}`}>
        <TextArea node_id={node_id} />
      </div>
    </div>
    {EntryButtons_of(node_id)}
    {Details_of(node_id)}
  </EntryWrapper>
));

const TreeEntry_of = memoize1((node_id: types.TNodeId) => (
  <EntryWrapper node_id={node_id}>
    <div className="flex items-end w-fit">
      {ToQueueLink_of(node_id)}
      <div id={`t-${node_id}`}>
        <TextArea node_id={node_id} />
      </div>
    </div>
    {EntryButtons_of(node_id)}
    {Details_of(node_id)}
  </EntryWrapper>
));

const Details = (props: { node_id: types.TNodeId }) => {
  const show_detail = useSelector(
    (state) => state.caches[props.node_id].show_detail,
  );
  return show_detail ? DetailsImpl_of(props.node_id) : null;
};
const Details_of = memoize1((node_id: types.TNodeId) => (
  <Details node_id={node_id} />
));

const DetailsImpl = (props: { node_id: types.TNodeId }) => {
  const [new_edge_type, set_new_edge_type] =
    React.useState<types.TEdgeType>("weak");
  const handle_new_edge_type_change = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      if (types.is_TEdgeType(v)) {
        set_new_edge_type(v);
      } else {
        toast.add("error", `Invalid edge type: ${v}`);
      }
    },
    [set_new_edge_type],
  );
  const dispatch = useDispatch();
  const node_ids = React.useContext(node_ids_context);
  const handle_add_parents = React.useCallback(() => {
    dispatch(
      add_edges_action(
        node_ids_list_of_node_ids_string(node_ids).map((p) => ({
          p,
          c: props.node_id,
          t: new_edge_type,
        })),
      ),
    );
  }, [dispatch, node_ids, new_edge_type, props.node_id]);
  const handle_add_children = React.useCallback(() => {
    dispatch(
      add_edges_action(
        node_ids_list_of_node_ids_string(node_ids).map((c) => ({
          p: props.node_id,
          c,
          t: new_edge_type,
        })),
      ),
    );
  }, [dispatch, node_ids, new_edge_type, props.node_id]);
  const hline = (
    <hr className="my-[0.5em] border-gray-300 dark:border-gray-600 bg-gray-300 dark:bg-gray-600" />
  );
  return (
    <div className="pt-[0.5em] bg-gray-200 dark:bg-gray-900">
      {hline}
      <div className="flex w-fit gap-x-[0.25em] items-baseline">
        {ParseTocButton_of(dispatch, props.node_id)}
      </div>
      {hline}
      <div className="flex gap-x-[0.25em] items-baseline">
        Add:
        <select value={new_edge_type} onChange={handle_new_edge_type_change}>
          {types.edge_type_values.map((t, i) => (
            <option value={t} key={i}>
              {t}
            </option>
          ))}
        </select>
        <button className="btn-icon" onClick={handle_add_parents}>
          Parents
        </button>
        <button className="btn-icon" onClick={handle_add_children}>
          Children
        </button>
      </div>
      {hline}
      <ParentEdgeTable node_id={props.node_id} />
      {hline}
      <ChildEdgeTable node_id={props.node_id} />
      {hline}
      <RangesTable node_id={props.node_id} />
      {hline}
    </div>
  );
};
const DetailsImpl_of = memoize1((node_id: types.TNodeId) => (
  <DetailsImpl node_id={node_id} />
));

const node_ids_list_of_node_ids_string = (node_ids: string) => {
  const seen = new Set<types.TNodeId>();
  for (const node_id of node_ids.split(" ")) {
    if (node_id && types.is_TNodeId(node_id) && !seen.has(node_id)) {
      seen.add(node_id);
    }
  }
  return Array.from(seen);
};

const RangesTable = (props: { node_id: types.TNodeId }) => {
  const rows_per_page = 10;
  const [offset, set_offset] = React.useState(0);
  const n = useSelector(
    (state) => state.data.nodes[props.node_id].ranges.length,
  );
  const handle_offset_input = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      set_offset(Math.min(Math.max(0, parseInt(e.target.value)), n - 1)),
    [n, set_offset],
  );
  const handle_offset_next = React.useCallback(
    () => set_offset((offset) => Math.min(offset + rows_per_page, n - 1)),
    [n, set_offset],
  );
  const handle_offset_prev = React.useCallback(
    () => set_offset((offset) => Math.max(offset - rows_per_page, 0)),
    [set_offset],
  );
  const rows = [];
  for (let i = offset; i < Math.min(offset + rows_per_page, n); ++i) {
    const i_range = n - i - 1;
    rows[i] = (
      <RangesTableRow i_range={i_range} node_id={props.node_id} key={i_range} />
    );
  }
  return (
    <>
      <div className="flex gap-x-[0.25em] items-baseline">
        <button
          disabled={offset - rows_per_page < 0}
          onClick={handle_offset_prev}
          className="btn-icon"
        >
          {BACK_MARK}
        </button>
        <input
          onChange={handle_offset_input}
          type="number"
          className="w-[5em]"
          value={offset}
        />
        /{n}
        <button
          disabled={n <= offset + rows_per_page}
          onClick={handle_offset_next}
          className="btn-icon"
        >
          {FORWARD_MARK}
        </button>
      </div>
      <table className="table-auto">
        <tbody className="block max-h-[10em] overflow-y-scroll">{rows}</tbody>
      </table>
    </>
  );
};
const RangesTableRow = (props: { node_id: types.TNodeId; i_range: number }) => {
  const range = useSelector(
    (state) => state.data.nodes[props.node_id].ranges[props.i_range],
  );
  const dispatch = useDispatch();
  const set_start = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        set_range_value_action({
          node_id: props.node_id,
          i_range: props.i_range,
          k: "start",
          v: e.target.value,
        }),
      );
    },
    [props.node_id, props.i_range, dispatch],
  );
  const set_end = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        set_range_value_action({
          node_id: props.node_id,
          i_range: props.i_range,
          k: "end",
          v: e.target.value,
        }),
      );
    },
    [props.node_id, props.i_range, dispatch],
  );
  const handle_delete = React.useCallback(() => {
    dispatch(
      delete_range_action({
        node_id: props.node_id,
        i_range: props.i_range,
      }),
    );
  }, [props.node_id, props.i_range, dispatch]);
  const start_date = utils.datetime_local_of_milliseconds(range.start);
  const end_date = range.end
    ? utils.datetime_local_of_milliseconds(range.end)
    : undefined;
  return React.useMemo(
    () => (
      <tr>
        <td className="p-[0.25em]">
          <input
            type="datetime-local"
            value={start_date}
            onChange={set_start}
          />
        </td>
        <td className="p-[0.25em]">
          {end_date && (
            <input type="datetime-local" value={end_date} onChange={set_end} />
          )}
        </td>
        <td className="p-[0.25em]">
          <button className="btn-icon" onClick={handle_delete}>
            {consts.DELETE_MARK}
          </button>
        </td>
      </tr>
    ),
    [end_date, start_date, handle_delete, set_start, set_end],
  );
};

const ChildEdgeTable = (props: { node_id: types.TNodeId }) => {
  const children = useSelector(
    (state) => state.data.nodes[props.node_id].children,
  );
  return (
    <table className="table-auto">
      <tbody className="block max-h-[10em] overflow-y-scroll">
        {ops.sorted_keys_of(children).map(ChildEdgeRow_of)}
      </tbody>
    </table>
  );
};
const ChildEdgeRow = (props: { edge_id: types.TEdgeId }) => {
  const edge = useSelector((state) => state.data.edges[props.edge_id]);
  const child_nodes = useSelector((state) => state.caches[edge.p].child_nodes);
  const parent_edges = useSelector(
    (state) => state.caches[edge.c].parent_edges,
  );
  const hide = useSelector((state) => state.data.edges[props.edge_id].hide);
  const is_deletable_edge = checks.is_deletable_edge_of_nodes_and_edges(
    edge,
    child_nodes,
    parent_edges,
  );
  const dispatch = useDispatch();
  const delete_edge = React.useCallback(
    () => dispatch(delete_edge_action(props.edge_id)),
    [props.edge_id, dispatch],
  );
  const set_edge_type = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const edge_type = e.target.value;
      if (types.is_TEdgeType(edge_type)) {
        dispatch(
          set_edge_type_action({
            edge_id: props.edge_id,
            edge_type,
          }),
        );
      } else {
        toast.add("error", `Invalid edge type: ${edge_type}`);
      }
    },
    [props.edge_id, dispatch],
  );
  const toggle_edge_hide = React.useCallback(() => {
    dispatch(toggle_edge_hide_action(props.edge_id));
  }, [props.edge_id, dispatch]);
  const text = child_nodes[edge.c].text;
  const to_tree_link = React.useMemo(
    () => (
      <span title={text}>
        <ToTreeLink node_id={edge.c}>{text.slice(0, 15)}</ToTreeLink>
      </span>
    ),
    [edge.c, text],
  );
  return React.useMemo(
    () => (
      <tr>
        <td className="p-[0.25em]">{to_tree_link}</td>
        <td className="p-[0.25em]">
          <select
            disabled={!is_deletable_edge}
            value={edge.t}
            onChange={set_edge_type}
          >
            {types.edge_type_values.map((t, i) => (
              <option value={t} key={i}>
                {t}
              </option>
            ))}
          </select>
        </td>
        <td className="p-[0.25em]">
          <input
            type="radio"
            checked={!hide}
            onClick={toggle_edge_hide}
            onChange={_suppress_missing_onChange_handler_warning}
          />
        </td>
        <td className="p-[0.25em]">
          <button
            className="btn-icon"
            onClick={delete_edge}
            disabled={!is_deletable_edge}
          >
            {consts.DELETE_MARK}
          </button>
        </td>
      </tr>
    ),
    [
      is_deletable_edge,
      edge.t,
      hide,
      to_tree_link,
      delete_edge,
      set_edge_type,
      toggle_edge_hide,
    ],
  );
};
const ChildEdgeRow_of = memoize1((edge_id: types.TEdgeId) => (
  <ChildEdgeRow edge_id={edge_id} key={edge_id} />
));

const ParentEdgeTable = (props: { node_id: types.TNodeId }) => {
  const parents = useSelector(
    (state) => state.data.nodes[props.node_id].parents,
  );
  return (
    <table className="table-auto">
      <tbody className="block max-h-[10em] overflow-y-scroll">
        {ops.sorted_keys_of(parents).map(ParentEdgeRow_of)}
      </tbody>
    </table>
  );
};
const ParentEdgeRow = (props: { edge_id: types.TEdgeId }) => {
  const edge = useSelector((state) => state.data.edges[props.edge_id]);
  const parent_nodes = useSelector(
    (state) => state.caches[edge.c].parent_nodes,
  );
  const child_nodes = useSelector((state) => state.caches[edge.p].child_nodes);
  const parent_edges = useSelector(
    (state) => state.caches[edge.c].parent_edges,
  );
  const hide = useSelector((state) => state.data.edges[props.edge_id].hide);
  const is_deletable_edge = checks.is_deletable_edge_of_nodes_and_edges(
    edge,
    child_nodes,
    parent_edges,
  );
  const dispatch = useDispatch();
  const delete_edge = React.useCallback(
    () => dispatch(delete_edge_action(props.edge_id)),
    [props.edge_id, dispatch],
  );
  const set_edge_type = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const edge_type = e.target.value;
      if (types.is_TEdgeType(edge_type)) {
        dispatch(
          set_edge_type_action({
            edge_id: props.edge_id,
            edge_type,
          }),
        );
      } else {
        toast.add("error", `Invalid edge type: ${edge_type}`);
      }
    },
    [props.edge_id, dispatch],
  );
  const toggle_edge_hide = React.useCallback(() => {
    dispatch(toggle_edge_hide_action(props.edge_id));
  }, [props.edge_id, dispatch]);
  const text = parent_nodes[edge.p].text;
  const to_tree_link = React.useMemo(
    () => (
      <span title={text}>
        <ToTreeLink node_id={edge.p}>{text.slice(0, 15)}</ToTreeLink>
      </span>
    ),
    [edge.p, text],
  );
  return React.useMemo(
    () => (
      <tr>
        <td className="p-[0.25em]">{to_tree_link}</td>
        <td className="p-[0.25em]">
          <select
            disabled={!is_deletable_edge}
            value={edge.t}
            onChange={set_edge_type}
          >
            {types.edge_type_values.map((t, i) => (
              <option value={t} key={i}>
                {t}
              </option>
            ))}
          </select>
        </td>
        <td className="p-[0.25em]">
          <input
            type="radio"
            checked={!hide}
            onClick={toggle_edge_hide}
            onChange={_suppress_missing_onChange_handler_warning}
          />
        </td>
        <td className="p-[0.25em]">
          <button
            className="btn-icon"
            onClick={delete_edge}
            disabled={!is_deletable_edge}
          >
            {consts.DELETE_MARK}
          </button>
        </td>
      </tr>
    ),
    [
      is_deletable_edge,
      edge.t,
      hide,
      to_tree_link,
      delete_edge,
      set_edge_type,
      toggle_edge_hide,
    ],
  );
};
const ParentEdgeRow_of = memoize1((edge_id: types.TEdgeId) => (
  <ParentEdgeRow edge_id={edge_id} key={edge_id} />
));

const EntryWrapper = (props: {
  node_id: types.TNodeId;
  children: React.ReactNode;
}) => {
  const ranges = useSelector((state) => state.data.nodes[props.node_id].ranges);
  const last_range = ranges.at(-1);
  const running = last_range && last_range.end === null;

  const child_edges = useSelector(
    (state) => state.caches[props.node_id].child_edges,
  );
  const has_hidden_leaf = Object.values(child_edges).some((edge) => edge.hide);

  const dispatch = useDispatch();
  const handle_toggle_show_children = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        dispatch(toggle_show_children(props.node_id));
      }
    },
    [props.node_id, dispatch],
  );

  return React.useMemo(
    () => (
      <div
        className={utils.join(
          "pt-[0.5em]",
          running ? "running" : has_hidden_leaf ? "hidden-leafs" : undefined,
        )}
        onDoubleClick={handle_toggle_show_children}
      >
        {props.children}
      </div>
    ),
    [has_hidden_leaf, running, handle_toggle_show_children, props.children],
  );
};

const MobileEntryButtons = (props: { node_id: types.TNodeId }) => {
  const cache = useSelector((state) => state.caches[props.node_id]);

  const children = useSelector(
    (state) => state.data.nodes[props.node_id].children,
  );
  const is_completable = checks.is_completable_node_of_nodes_and_edges(
    ops.keys_of(children),
    cache.child_nodes,
    cache.child_edges,
  );

  const parents = useSelector(
    (state) => state.data.nodes[props.node_id].parents,
  );
  const is_uncompletable = checks.is_uncompletable_node_of_nodes_and_edges(
    ops.keys_of(parents),
    cache.parent_nodes,
    cache.parent_edges,
  );

  const status = useSelector((state) => state.data.nodes[props.node_id].status);

  const root = useSelector((state) => state.data.root);
  const is_root = props.node_id === root;

  const dispatch = useDispatch();
  const on_click_total_time = useCallback(() => {
    dispatch(set_total_time(props.node_id));
  }, [dispatch, props.node_id]);

  return React.useMemo(
    () => (
      <div
        className={utils.join(
          !cache.show_detail && "opacity-40 hover:opacity-100",
        )}
      >
        <div className="flex w-fit gap-x-[0.25em] items-baseline pt-[0.25em]">
          {is_root || EstimationInputOf(props.node_id)}
          {is_root || status !== "todo" || StartOrStopButtons_of(props.node_id)}
          {is_root ||
            status !== "todo" ||
            !is_completable ||
            todoToDoneButtonOf(dispatch, props.node_id)}
          {is_root ||
            status !== "todo" ||
            !is_completable ||
            todoToDontButtonOf(dispatch, props.node_id)}
          {is_root ||
            status === "todo" ||
            !is_uncompletable ||
            DoneOrDontToTodoButton_of(dispatch, props.node_id)}
          {status === "todo" && evalButtonOf(dispatch, props.node_id)}
          {is_root || status !== "todo" || topButtonOf(dispatch, props.node_id)}
          {CopyNodeIdButton_of(props.node_id)}
          {status === "todo" && NewButton_of(dispatch, props.node_id)}
          {deleteButtonOf(dispatch, props.node_id)}
          {showDetailButtonOf(dispatch, props.node_id)}
          <span onClick={on_click_total_time}>
            {cache.total_time < 0
              ? "-"
              : digits1(cache.total_time / (1000 * 3600))}
          </span>
          {is_root || LastRange_of(props.node_id)}
        </div>
        <div className="flex w-fit gap-x-[0.25em] items-baseline pt-[0.25em]">
          {status === "todo" &&
            0 <= cache.leaf_estimates_sum &&
            digits1(cache.leaf_estimates_sum) + " | "}
          {status === "todo" && cache.percentiles.map(digits1).join(", ")}
        </div>
      </div>
    ),
    [
      cache.percentiles,
      cache.leaf_estimates_sum,
      cache.show_detail,
      cache.total_time,
      status,
      on_click_total_time,
      is_root,
      is_completable,
      is_uncompletable,
      props.node_id,
      dispatch,
    ],
  );
};

const EntryButtons = (props: { node_id: types.TNodeId }) => {
  const cache = useSelector((state) => state.caches[props.node_id]);

  const children = useSelector(
    (state) => state.data.nodes[props.node_id].children,
  );
  const is_completable = checks.is_completable_node_of_nodes_and_edges(
    ops.keys_of(children),
    cache.child_nodes,
    cache.child_edges,
  );

  const parents = useSelector(
    (state) => state.data.nodes[props.node_id].parents,
  );
  const is_uncompletable = checks.is_uncompletable_node_of_nodes_and_edges(
    ops.keys_of(parents),
    cache.parent_nodes,
    cache.parent_edges,
  );

  const status = useSelector((state) => state.data.nodes[props.node_id].status);

  const root = useSelector((state) => state.data.root);
  const is_root = props.node_id === root;

  const dispatch = useDispatch();
  const on_click_total_time = useCallback(() => {
    dispatch(set_total_time(props.node_id));
  }, [dispatch, props.node_id]);

  return React.useMemo(
    () => (
      <div
        className={utils.join(
          !cache.show_detail && "opacity-40 hover:opacity-100",
        )}
      >
        <div className="flex w-fit gap-x-[0.25em] items-baseline pt-[0.25em]">
          {is_root || EstimationInputOf(props.node_id)}
          {is_root || status !== "todo" || StartOrStopButtons_of(props.node_id)}
          {is_root ||
            status !== "todo" ||
            !is_completable ||
            todoToDoneButtonOf(dispatch, props.node_id)}
          {is_root ||
            status !== "todo" ||
            !is_completable ||
            todoToDontButtonOf(dispatch, props.node_id)}
          {is_root ||
            status === "todo" ||
            !is_uncompletable ||
            DoneOrDontToTodoButton_of(dispatch, props.node_id)}
          {status === "todo" && evalButtonOf(dispatch, props.node_id)}
          {is_root || status !== "todo" || topButtonOf(dispatch, props.node_id)}
          {is_root ||
            status !== "todo" ||
            moveUpButtonOf(dispatch, props.node_id)}
          {is_root ||
            status !== "todo" ||
            moveDownButtonOf(dispatch, props.node_id)}
          {CopyNodeIdButton_of(props.node_id)}
          {status === "todo" && NewButton_of(dispatch, props.node_id)}
          {deleteButtonOf(dispatch, props.node_id)}
          {showDetailButtonOf(dispatch, props.node_id)}
          <span onClick={on_click_total_time}>
            {cache.total_time < 0
              ? "-"
              : digits1(cache.total_time / (1000 * 3600))}
          </span>
          {is_root || LastRange_of(props.node_id)}
        </div>
        <div className="flex w-fit gap-x-[0.25em] items-baseline pt-[0.25em]">
          {status === "todo" &&
            0 <= cache.leaf_estimates_sum &&
            digits1(cache.leaf_estimates_sum) + " | "}
          {status === "todo" && cache.percentiles.map(digits1).join(", ")}
        </div>
      </div>
    ),
    [
      cache.percentiles,
      cache.leaf_estimates_sum,
      cache.show_detail,
      cache.total_time,
      status,
      on_click_total_time,
      is_root,
      is_completable,
      is_uncompletable,
      props.node_id,
      dispatch,
    ],
  );
};
const EntryButtons_of = memoize1((node_id: types.TNodeId) => (
  <EntryButtons node_id={node_id} />
));

const StartOrStopButtons = (props: { node_id: types.TNodeId }) => {
  const ranges = useSelector((state) => state.data.nodes[props.node_id].ranges);
  const last_range = ranges.at(-1);
  const running = last_range && last_range.end === null;
  const dispatch = useDispatch();

  return running ? (
    stopButtonOf(dispatch, props.node_id)
  ) : (
    <>
      {StartButton_of(dispatch, props.node_id)}
      {StartConcurrentButton_of(dispatch, props.node_id)}
    </>
  );
};
const StartOrStopButtons_of = memoize1((node_id: types.TNodeId) => (
  <StartOrStopButtons node_id={node_id} />
));

const _estimate = (
  estimates: number[],
  ratios: number[],
  weights: number[],
  n_mc: number,
) => {
  const ts = Array(n_mc);
  const rng = new Multinomial(weights);
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

const last_range_of = (ranges: types.IRange[]): null | types.IRange => {
  const n = ranges.length;
  if (n < 1) {
    return null;
  } else {
    const last = ranges[n - 1];
    if (last.end === null) {
      if (n - 2 < 0) {
        return null;
      } else {
        return ranges[n - 2];
      }
    } else {
      return last;
    }
  }
};

const focus = <T extends HTMLElement>(r: null | T) => {
  if (r) {
    r.focus();
  }
};

const digits2 = (x: number) => {
  return Math.round(x * 100) / 100;
};

const digits1 = (x: number) => {
  return Math.round(x * 10) / 10;
};

export const cumsum = (xs: number[]) => {
  const ret = [0];
  xs.reduce((total, current) => {
    const t = total + current;
    ret.push(t);
    return t;
  }, 0);
  return ret;
};

export const sum = (xs: number[]) => {
  return xs.reduce((total, current) => {
    return total + current;
  }, 0);
};

const todo_leafs_of = (
  node_id: types.TNodeId,
  state: types.IState,
  edge_filter: (edge: types.IEdge) => boolean,
) => {
  return _todo_leafs_of(node_id, state, edge_filter, utils.visit_counter_of());
};
function* _todo_leafs_of(
  node_id: types.TNodeId,
  state: types.IState,
  edge_filter: (edge: types.IEdge) => boolean,
  vid: number,
): Iterable<[types.TNodeId, types.INode]> {
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

const stopButtonRefOf = memoize1((_: types.TNodeId) =>
  React.createRef<HTMLButtonElement>(),
);

const moveUpButtonRefOf = memoize1((_: types.TNodeId) =>
  React.createRef<HTMLButtonElement>(),
);

const moveDownButtonRefOf = memoize1((_: types.TNodeId) =>
  React.createRef<HTMLButtonElement>(),
);

const textAreaRefOf = memoize1((_: types.TNodeId) =>
  React.createRef<HTMLDivElement>(),
);

const ToTreeLink = (props: {
  node_id: types.TNodeId;
  children?: React.ReactNode;
}) => {
  const dispatch = useDispatch();
  return (
    <a
      href={`#t-${props.node_id}`}
      onClick={() => {
        dispatch(show_path_to_selected_node(props.node_id));
      }}
    >
      {props.children === undefined ? "→" : props.children}
    </a>
  );
};
const ToTreeLink_of = memoize1((node_id: types.TNodeId) => (
  <ToTreeLink node_id={node_id} />
));

const ToQueueLink = (props: {
  node_id: types.TNodeId;
  children?: React.ReactNode;
}) => {
  const root = useSelector((state) => state.data.root);
  return props.node_id === root ? null : (
    <a href={`#q-${props.node_id}`}>
      {" "}
      {props.children === undefined ? "←" : props.children}
    </a>
  );
};
const ToQueueLink_of = memoize1((node_id: types.TNodeId) => (
  <ToQueueLink node_id={node_id} />
));

const DoneOrDontToTodoButton_of = memoize2(
  (dispatch: AppDispatch, node_id: types.TNodeId) => (
    <button
      className="btn-icon"
      onClick={() => {
        dispatch(done_or_dont_to_todo_action(node_id));
      }}
    >
      {UNDO_MARK}
    </button>
  ),
);

const NewButton_of = memoize2((dispatch: AppDispatch, k: types.TNodeId) => {
  const _focusTextAreaOfTheNewTodo = (
    dispatch: AppDispatch,
    getState: () => types.IState,
  ) => {
    const state = getState();
    dispatch(
      doFocusTextArea(
        state.data.edges[ops.sorted_keys_of(state.data.nodes[k].children)[0]].c,
      ),
    );
  };
  return (
    <button
      className="btn-icon"
      onClick={() => {
        dispatch(new_action(k));
        dispatch(_focusTextAreaOfTheNewTodo);
      }}
    >
      {ADD_MARK}
    </button>
  );
});

const stopButtonOf = memoize2(
  (dispatch: AppDispatch, node_id: types.TNodeId) => (
    <button
      className="btn-icon"
      arial-label="Stop."
      onClick={() => {
        dispatch(stop_action(node_id));
      }}
      ref={stopButtonRefOf(node_id)}
    >
      {STOP_MARK}
    </button>
  ),
);

const StartButton_of = memoize2(
  (dispatch: AppDispatch, node_id: types.TNodeId) => (
    <button
      className="btn-icon"
      onClick={() => {
        dispatch(start_action({ node_id, is_concurrent: false }));
        dispatch(doFocusStopButton(node_id));
      }}
    >
      {START_MARK}
    </button>
  ),
);
const StartConcurrentButton_of = memoize2(
  (dispatch: AppDispatch, node_id: types.TNodeId) => (
    <button
      className="btn-icon"
      onClick={() => {
        dispatch(start_action({ node_id, is_concurrent: true }));
        dispatch(doFocusStopButton(node_id));
      }}
    >
      {START_CONCURRNET_MARK}
    </button>
  ),
);

const topButtonOf = memoize2((dispatch: AppDispatch, k: types.TNodeId) => (
  <button
    className="btn-icon"
    onClick={() => {
      dispatch(top_action(k));
    }}
  >
    {TOP_MARK}
  </button>
));

const moveUpButtonOf = memoize2((dispatch: AppDispatch, k: types.TNodeId) => (
  <button
    className="btn-icon"
    onClick={() => {
      dispatch(moveUp_(k));
      dispatch(doFocusMoveUpButton(k));
    }}
    ref={moveUpButtonRefOf(k)}
  >
    {MOVE_UP_MARK}
  </button>
));

const moveDownButtonOf = memoize2((dispatch: AppDispatch, k: types.TNodeId) => (
  <button
    className="btn-icon"
    onClick={() => {
      dispatch(moveDown_(k));
      dispatch(doFocusMoveDownButton(k));
    }}
    ref={moveDownButtonRefOf(k)}
  >
    {MOVE_DOWN_MARK}
  </button>
));

const todoToDoneButtonOf = memoize2(
  (dispatch: AppDispatch, k: types.TNodeId) => (
    <button
      className="btn-icon"
      onClick={() => {
        dispatch(todoToDone(k));
      }}
    >
      {DONE_MARK}
    </button>
  ),
);

const todoToDontButtonOf = memoize2(
  (dispatch: AppDispatch, k: types.TNodeId) => (
    <button
      className="btn-icon"
      onClick={() => {
        dispatch(todoToDont(k));
      }}
    >
      {DONT_MARK}
    </button>
  ),
);

const showDetailButtonOf = memoize2(
  (dispatch: AppDispatch, k: types.TNodeId) => (
    <button
      className="btn-icon"
      onClick={() => {
        dispatch(flipShowDetail(k));
      }}
    >
      {DETAIL_MARK}
    </button>
  ),
);

const deleteButtonOf = memoize2((dispatch: AppDispatch, k: types.TNodeId) => (
  <button
    className="btn-icon"
    onClick={() => {
      dispatch(delete_action(k));
    }}
  >
    {consts.DELETE_MARK}
  </button>
));

const ParseTocButton_of = memoize2(
  (dispatch: AppDispatch, node_id: types.TNodeId) => (
    <button
      className="btn-icon"
      onClick={() => {
        dispatch(parse_toc_action(node_id));
      }}
    >
      {TOC_MARK}
    </button>
  ),
);

const evalButtonOf = memoize2((dispatch: AppDispatch, k: types.TNodeId) => (
  <button
    className="btn-icon"
    onClick={() => {
      dispatch(eval_(k));
    }}
  >
    {EVAL_MARK}
  </button>
));

const CopyNodeIdButton = (props: { node_id: types.TNodeId }) => {
  const clipboard = utils.useClipboard(props.node_id);
  const set_node_ids = React.useContext(set_node_ids_context);
  const handle_click = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      clipboard.copy();
      const multi = e.ctrlKey;
      set_node_ids((node_ids: string) =>
        multi ? props.node_id + " " + node_ids : props.node_id,
      );
    },
    [props.node_id, set_node_ids, clipboard],
  );
  return (
    <button className="btn-icon" onClick={handle_click}>
      {clipboard.is_copied ? DONE_MARK : COPY_MARK}
    </button>
  );
};

const CopyNodeIdButton_of = memoize1((node_id: types.TNodeId) => (
  <CopyNodeIdButton node_id={node_id} />
));

const set_estimate_of = memoize2(
  (dispatch: AppDispatch, node_id: types.TNodeId) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        set_estimate_action({
          node_id,
          estimate: Number(e.target.value),
        }),
      );
    },
);

const EstimationInputOf = memoize1((k: types.TNodeId) => (
  <EstimationInput k={k} />
));

const EstimationInput = (props: { k: types.TNodeId }) => {
  const estimate = useSelector((state) => state.data.nodes[props.k].estimate);
  const dispatch = useDispatch();
  return (
    <input
      type="number"
      step="any"
      min={0}
      value={estimate}
      onChange={set_estimate_of(dispatch, props.k)}
      onFocus={move_cursor_to_the_end}
      className="w-[3em] h-[2em]"
    />
  );
};

const move_cursor_to_the_end = (e: React.FocusEvent<HTMLInputElement>) => {
  const el = e.target;
  el.select();
};

const TextArea = ({
  node_id,
  ...div_props
}: { node_id: types.TNodeId } & React.HTMLProps<HTMLDivElement>) => {
  const root = useSelector((state) => state.data.root);
  return node_id === root ? null : (
    <TextAreaImpl node_id={node_id} {...div_props} />
  );
};

const TextAreaImpl = ({
  node_id,
  ...div_props
}: { node_id: types.TNodeId } & React.HTMLProps<HTMLDivElement>) => {
  const state_text = useSelector((state) => state.data.nodes[node_id].text);
  const status = useSelector((state) => state.data.nodes[node_id].status);
  const dispatch = useDispatch();
  const [text_prev, setText_prev] = useState(state_text);

  const dispatch_set_text_action = useCallback(
    (e: React.ChangeEvent<HTMLDivElement>) => {
      const el = e.target;
      dispatch(
        set_text_action({
          k: node_id,
          text: el.innerText,
        }),
      );
    },
    [dispatch, node_id],
  );
  if (state_text !== text_prev) {
    setText_prev(state_text);
  }
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      onKeyDown={insert_plain_enter}
      onBlur={dispatch_set_text_action}
      className={utils.join(
        "textarea whitespace-pre-wrap overflow-wrap-anywhere w-[30em] overflow-hidden p-[0.125em]",
        status === "done"
          ? "text-red-300"
          : status === "dont"
          ? "text-gray-500"
          : undefined,
      )}
      {...div_props}
      ref={textAreaRefOf(node_id)}
    >
      {state_text}
    </div>
  );
};

const insert_plain_enter = (event: React.KeyboardEvent<HTMLElement>) => {
  if (event.key === "Enter") {
    document.execCommand("insertLineBreak");
    event.preventDefault();
  }
};

const LastRange = (props: { node_id: types.TNodeId }) => {
  const ranges = useSelector((state) => state.data.nodes[props.node_id].ranges);
  const last_range = last_range_of(ranges);
  return (
    <>
      {last_range &&
        last_range.end &&
        digits2((last_range.end - last_range.start) / (1000 * 3600))}
    </>
  );
};
const LastRange_of = memoize1((node_id: types.TNodeId) => (
  <LastRange node_id={node_id} />
));

const _suppress_missing_onChange_handler_warning = () => {};

const reducer_of_reducer_with_patch = (
  reducer_with_patch: (
    state: undefined | types.IState,
    action: types.TAnyPayloadAction,
  ) => {
    state: types.IState;
    patch: producer.TOperation[];
    reverse_patch: producer.TOperation[];
  },
) => {
  return (state: undefined | types.IState, action: types.TAnyPayloadAction) => {
    return reducer_with_patch(state, action).state;
  };
};

type AppDispatch = ThunkDispatch<types.IState, {}, types.TAnyPayloadAction>;
const useDispatch = () => _useDispatch<AppDispatch>();
const useSelector: TypedUseSelectorHook<types.IState> = _useSelector;

type TSetStateArg<T> = T | ((prev: T) => T);

const set_node_filter_query_fast_context = React.createContext(
  (_: TSetStateArg<string>) => {},
);
const set_node_filter_query_slow_context = React.createContext(
  (_: TSetStateArg<string>) => {},
);
const node_filter_query_fast_context = React.createContext("");
const node_filter_query_slow_context = React.createContext("");

const set_node_ids_context = React.createContext(
  (_: TSetStateArg<string>) => {},
);
const node_ids_context = React.createContext("");

const error_element = (
  <div className="flex justify-center h-[100vh] w-full items-center">
    <span>
      An error occured while loading the page.{" "}
      <a href=".">Please reload the page.</a>
    </span>
  </div>
);

export const main = () => {
  const container = document.getElementById("root");
  const root = ReactDOM.createRoot(container!);
  root.render(
    <React.StrictMode>
      <div className="flex justify-center h-[100vh] w-full items-center">
        <div className="animate-spin h-[3rem] w-[3rem] border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    </React.StrictMode>,
  );

  client.client
    .getDataOfUserUsersUserIdDataGet(USER_ID)
    .then((res) => {
      saver.set_parent_id(res.etag);
      saver.set_origin_id(res.etag);

      let state: types.IState;
      let patch: producer.TOperation[];
      // let reverse_patch: producer.TPatch[];
      if (res.body.data === null) {
        state = ops.emptyStateOf();
        const produced = producer.produce_with_patche(res.body, (draft) => {
          draft.data = state.data;
        });
        patch = produced.patch;
        // reverse_patch = produced.reverse_patch;
      } else {
        const parsed_data = types.parse_data({ data: res.body.data });
        if (!parsed_data.success) {
          root.render(error_element);
          return;
        }
        const caches: types.ICaches = {};
        for (const node_id in parsed_data.data.nodes) {
          if (types.is_TNodeId(node_id)) {
            caches[node_id] = ops.new_cache_of(parsed_data.data, node_id);
          }
        }

        state = {
          data: parsed_data.data,
          caches,
          predicted_next_nodes: [],
          n_unsaved_patches: 0,
        };
        patch = parsed_data.patch;
        // reverse_patch = parsed_data.reverse_patch;
      }
      saver.push_patch(USER_ID, patch);

      const start_time_and_node_id_list: [number, types.TNodeId][] = [];
      for (const node_id of ops.keys_of(state.data.queue)) {
        const node = state.data.nodes[node_id];
        if (node.status !== "todo") {
          continue;
        }
        for (const range of node.ranges) {
          start_time_and_node_id_list.push([range.start, node_id]);
        }
      }
      start_time_and_node_id_list.sort((a, b) => a[0] - b[0]);
      for (const [_, node_id] of start_time_and_node_id_list) {
        next_action_predictor3.fit(node_id);
        next_action_predictor2.fit(node_id);
      }
      set_predicted_next_nodes(state);

      const root_reducer = rtk.reducer_with_patch_of<types.IState>(
        () => state,
        root_reducer_def,
      );
      const store = createStore(
        reducer_of_reducer_with_patch(
          saver.patch_saver_of(
            undoable.undoable_of(root_reducer, history_type_set),
            USER_ID,
          ),
        ),
        applyMiddleware(thunk, saver.middleware),
      );

      saver.push_patch.add_before_process_hook((q) => {
        store.dispatch(set_n_unsaved_patches_action(q.length));
      });
      saver.push_patch.add_after_process_hook(() => {
        store.dispatch(set_n_unsaved_patches_action(0));
      });

      root.render(
        <React.StrictMode>
          <Provider store={store}>
            {is_mobile() ? <MobileApp /> : <App />}
          </Provider>
        </React.StrictMode>,
      );
    })
    .catch((e: unknown) => {
      console.error(e);
      root.render(error_element);
    });
};
