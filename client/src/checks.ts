import * as immer from "immer";

import * as ops from "./ops";
import * as types from "./types";
import * as utils from "./utils";

export const is_uncompletable_node_of = (
  node_id: types.TNodeId,
  state: immer.Immutable<types.TState>,
) => {
  const node = state.data.nodes[node_id];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (node === undefined) {
    return false;
  }
  return is_uncompletable_node_of_nodes_and_edges(
    ops.keys_of(node.parents),
    state.data.nodes,
    state.data.edges,
  );
};
export const is_uncompletable_node_of_nodes_and_edges = (
  parents: types.TEdgeId[],
  nodes: immer.Immutable<types.TNodes>,
  edges: immer.Immutable<types.TEdges>,
) => {
  return parents.some((edge_id) => {
    const edge = edges[edge_id];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return edge?.t === "strong" && nodes[edge.p]?.status === "todo";
  });
};

export const is_completable_node_of = (
  node_id: types.TNodeId,
  state: immer.Immutable<types.TState>,
) => {
  const node = state.data.nodes[node_id];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (node === undefined) {
    return false;
  }
  return is_completable_node_of_nodes_and_edges(
    ops.keys_of(node.children),
    state.data.nodes,
    state.data.edges,
  );
};
export const is_completable_node_of_nodes_and_edges = (
  children: types.TEdgeId[],
  nodes: immer.Immutable<types.TNodes>,
  edges: immer.Immutable<types.TEdges>,
) => {
  return !children.some((edge_id) => {
    const edge = edges[edge_id];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return edge?.t === "strong" && nodes[edge.c]?.status === "todo";
  });
};

export const is_deletable_node = (
  node_id: types.TNodeId,
  state: immer.Immutable<types.TState>,
) => {
  if (node_id === state.data.root) {
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const children = state.data.nodes[node_id]?.children;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!children) {
    return false;
  }
  return ops
    .keys_of(children)
    .every((edge_id) => is_deletable_edge_of(edge_id, state));
};

export const is_deletable_edge_of = (
  edge_id: types.TEdgeId,
  state: immer.Immutable<types.TState>,
) => {
  const edge = state.data.edges[edge_id];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (edge === undefined) {
    return false;
  }
  return is_deletable_edge_of_nodes_and_edges(
    edge,
    state.data.nodes,
    state.data.edges,
  );
};
export const is_deletable_edge_of_nodes_and_edges = (
  edge: types.TEdge,
  nodes: immer.Immutable<types.TNodes>,
  edges: immer.Immutable<types.TEdges>,
) => {
  if (edge.t !== "strong") {
    return true;
  }
  let count = 0;
  for (const parent_edge_id of ops.keys_of(nodes[edge.c].parents)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (edges[parent_edge_id]?.t === "strong") {
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
  state: immer.Immutable<types.TState>,
) => {
  let count = 0;
  for (const parent_edge_id of ops.keys_of(
    state.data.nodes[child_node_id].parents,
  )) {
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
  state: immer.Immutable<types.TState>,
) => {
  return ops
    .keys_of(state.data.nodes[c].parents)
    .some((edge_id) => state.data.edges[edge_id].p === p);
};

export const has_cycle_of = (
  edge_id: types.TEdgeId,
  state: immer.Immutable<types.TState>,
) => {
  const edge = state.data.edges[edge_id];
  const vid = utils.visit_counter_of();
  utils.vids[edge.c] = vid;
  return _has_cycle_of(edge.p, state, vid, edge.c);
};
const _has_cycle_of = (
  node_id: types.TNodeId,
  state: immer.Immutable<types.TState>,
  vid: number,
  origin_node_id: types.TNodeId,
): boolean => {
  if (node_id === origin_node_id) {
    return true;
  }
  if (utils.vids[node_id] === vid) {
    return false;
  }
  utils.vids[node_id] = vid;
  return ops
    .keys_of(state.data.nodes[node_id].parents)
    .some((edge_id) =>
      _has_cycle_of(state.data.edges[edge_id].p, state, vid, origin_node_id),
    );
};
