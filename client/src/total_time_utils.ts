import * as Immer from "immer";
import * as Rtk from "@reduxjs/toolkit";

import * as ops from "src/ops";
import * as swapper from "./swapper";
import * as types from "./types";
import { MultiSet } from "./multiset";
import * as utils from "./utils";

export const updated_vids = new Map<types.TNodeId, number>();
export const affected_vids = new Map<types.TNodeId, number>();

export const visible_node_ids = new MultiSet<types.TNodeId>();

export const should_update = (node_id: types.TNodeId) => {
  const uvid = updated_vids.get(node_id);
  if (uvid === undefined) {
    return true;
  }
  const avid = affected_vids.get(node_id);
  if (avid === undefined) {
    return false;
  }
  return uvid < avid;
};

export const observe_of = utils.memoize1((dispatch: types.AppDispatch) => {
  const node_id_of_element = new WeakMap<Element, types.TNodeId>();
  const observer = new IntersectionObserver((entries) => {
    const node_ids = [];
    for (const entry of entries) {
      const node_id = node_id_of_element.get(entry.target);
      if (node_id === undefined) {
        continue;
      }
      if (entry.isIntersecting) {
        visible_node_ids.add(node_id);
        if (should_update(node_id)) {
          node_ids.push(node_id);
        }
      } else {
        visible_node_ids.delete(node_id);
      }
    }
    dispatch(set_total_time_action({ node_ids }));
  });
  return (el: HTMLElement, node_id: types.TNodeId) => {
    node_id_of_element.set(el, node_id);
    observer.observe(el);
  };
});

export const set_total_time_action = Rtk.createAction<{
  node_ids: types.TNodeId[];
  force?: true;
}>("set_total_time_action");

export const setTotalTime = (
  state: types.TStateDraftWithReadonly,
  node_id: types.TNodeId,
  vid: number,
  force: boolean = false,
) => {
  if (force || should_update(node_id)) {
    updated_vids.set(node_id, vid);
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
  state: Immer.Immutable<types.TState>,
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
  state: Immer.Immutable<types.TState>,
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

export const setTotalTimeOfAncestors = (
  state: types.TStateDraftWithReadonly,
  node_id: types.TNodeId,
  vid: number,
) => {
  if (affected_vids.get(node_id) === vid) {
    return;
  }
  affected_vids.set(node_id, vid);
  if (visible_node_ids.has(node_id)) {
    setTotalTime(state, node_id, vid);
  }
  for (const parent_edge_id of ops.keys_of(state.data.nodes[node_id].parents)) {
    setTotalTimeOfAncestors(state, state.data.edges[parent_edge_id].p, vid);
  }
};
