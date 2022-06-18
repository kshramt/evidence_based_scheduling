import * as types from "./types";
import * as utils from "./utils";

export const is_deletable_node = (
  node_id: types.TNodeId,
  state: types.IState,
) => {
  return (
    node_id !== state.data.root &&
    state.data.kvs[node_id].children.every((edge_id) =>
      is_deletable_edge(edge_id, state),
    )
  );
};

export const is_deletable_edge = (
  edge_id: types.TEdgeId,
  state: types.IState,
) => {
  if (state.data.edges[edge_id].t !== "strong") {
    return true;
  }
  let count = 0;
  for (const peid of state.data.kvs[state.data.edges[edge_id].c].parents) {
    if (state.data.edges[peid].t === "strong") {
      count += 1;
      if (1 < count) {
        return true;
      }
    }
  }
  return false;
};

export const has_multiple_edges = (
  parent_node_id: types.TNodeId,
  child_node_id: types.TNodeId,
  state: types.IState,
) => {
  let count = 0;
  for (const parent_edge_id of state.data.kvs[child_node_id].parents) {
    if (state.data.edges[parent_edge_id].p === parent_node_id) {
      count += 1;
      if (1 < count) {
        return true;
      }
    }
  }
  return false;
};

export const has_edge = (
  p: types.TNodeId,
  c: types.TNodeId,
  state: types.IState,
) => {
  return state.data.kvs[c].parents.some(
    (edge_id) => state.data.edges[edge_id].p === p,
  );
};

export const has_cycle = (edge_id: types.TEdgeId, state: types.IState) => {
  const edge = state.data.edges[edge_id];
  const vid = utils.visit_counter_of();
  types.cache_of(state.caches, edge.c).visited = vid;
  return _has_cycle(edge.p, state, vid, edge.c);
};
const _has_cycle = (
  node_id: types.TNodeId,
  state: types.IState,
  vid: number,
  origin_node_id: types.TNodeId,
) => {
  if (node_id === origin_node_id) {
    return true;
  }
  if (types.cache_of(state.caches, node_id).visited === vid) {
    return false;
  }
  types.cache_of(state.caches, node_id).visited = vid;
  for (const edge_id of state.data.kvs[node_id].parents) {
    if (_has_cycle(state.data.edges[edge_id].p, state, vid, origin_node_id)) {
      return true;
    }
  }
  return false;
};
