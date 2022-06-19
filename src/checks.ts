import * as types from "./types";
import * as utils from "./utils";

export const is_completable_node_of = (
  node_id: types.TNodeId,
  state: types.IState,
) => {
  return is_completable_node_of_nodes_and_edges(
    state.data.nodes[node_id].children,
    state.data.nodes,
    state.data.edges,
  );
};
export const is_completable_node_of_nodes_and_edges = (
  children: types.TEdgeId[],
  nodes: types.INodes,
  edges: types.IEdges,
) => {
  return !children.some((edge_id) => {
    const edge = edges[edge_id];
    return edge.t === "strong" && nodes[edge.c].status === "todo";
  });
};

export const is_deletable_node = (
  node_id: types.TNodeId,
  state: types.IState,
) => {
  return (
    node_id !== state.data.root &&
    state.data.nodes[node_id].children.every((edge_id) =>
      is_deletable_edge_of(edge_id, state),
    )
  );
};

export const is_deletable_edge_of = (
  edge_id: types.TEdgeId,
  state: types.IState,
) => {
  return is_deletable_edge_of_nodes_and_edges(
    state.data.edges[edge_id],
    state.data.nodes,
    state.data.edges,
  );
};
export const is_deletable_edge_of_nodes_and_edges = (
  edge: types.IEdge,
  nodes: types.INodes,
  edges: types.IEdges,
) => {
  if (edge.t !== "strong") {
    return true;
  }
  let count = 0;
  for (const parent_edge_id of nodes[edge.c].parents) {
    if (edges[parent_edge_id].t === "strong") {
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
  for (const parent_edge_id of state.data.nodes[child_node_id].parents) {
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
  return state.data.nodes[c].parents.some(
    (edge_id) => state.data.edges[edge_id].p === p,
  );
};

export const has_cycle = (edge_id: types.TEdgeId, state: types.IState) => {
  const edge = state.data.edges[edge_id];
  const vid = utils.visit_counter_of();
  utils.vids[edge.c] = vid;
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
  if (utils.vids[node_id] === vid) {
    return false;
  }
  utils.vids[node_id] = vid;
  for (const edge_id of state.data.nodes[node_id].parents) {
    if (_has_cycle(state.data.edges[edge_id].p, state, vid, origin_node_id)) {
      return true;
    }
  }
  return false;
};
