import * as Immer from "immer";

import * as consts from "src/consts";
import * as ops from "src/ops";
import * as swapper from "src/swapper";
import * as total_time_utils from "src/total_time_utils";
import * as types from "src/types";
import * as utils from "src/utils";

// For each leaf node, we sample `n_mc` ratios (actually ratio × the leaf estimate) from the historical data.
// Time complexity: Θ(n_leaves × n_history × (n_mc × time_per_sample + time_per_weight_computation))
// Space complexity: Θ(n_leaves × n_mc + n_history)
// When n_mc === 2000 and n_leaves === 10000 (the number of to-do tasks will grow slowly), space requirement is about 80 MB.
export const predict = (
  state: types.TStateDraftWithReadonly,
  k: types.TNodeId,
) => {
  const leafNodeIds = Array.from(
    todo_leafs_of(k, state, (edge) => edge.t === "strong"),
  )
    .filter(([_, node]) => node.estimate !== consts.NO_ESTIMATION)
    .map(([nodeId, _]) => nodeId);
  const leafEstimates = leafNodeIds.map((nodeId) => {
    return state.data.nodes[nodeId].estimate;
  });
  const vid = utils.visit_counter_of();
  total_time_utils.setTotalTime(state, k, vid);

  const candidateNodeIds = state.non_todo_node_ids.filter((node_id) => {
    return state.data.nodes[node_id].estimate !== consts.NO_ESTIMATION;
  });
  const candidateRatios = candidateNodeIds.map((node_id) => {
    const node = state.data.nodes[node_id];
    return (
      total_time_utils.setTotalTime(state, node_id, vid) /
      (1000 * 3600 * node.estimate)
    );
  });
  // Early return if there is no candidate (historical data).
  if (candidateNodeIds.length < 1) {
    const leafEstimateSum = utils.sum(leafEstimates);
    setPrediction(state, k, leafEstimateSum, [
      leafEstimateSum,
      leafEstimateSum,
      leafEstimateSum,
      leafEstimateSum,
      leafEstimateSum,
      leafEstimateSum,
      leafEstimateSum,
    ]);
    return;
  }
  const n_mc = 2000;

  const leafFeatures = leafNodeIds.map((nodeId) => {
    return getFeature(state, nodeId);
  });
  const candidateFeatures = candidateNodeIds.map((nodeId) => {
    return getFeature(state, nodeId);
  });

  const weights = new Float32Array(candidateFeatures.length);
  const samples = new Float32Array(n_mc * leafFeatures.length);

  console.warn(candidateRatios);
  for (let iLeaf = 0; iLeaf < leafFeatures.length; ++iLeaf) {
    const leafFeature = leafFeatures[iLeaf];
    for (
      let iCandidate = 0;
      iCandidate < candidateFeatures.length;
      ++iCandidate
    ) {
      const candidateFeature = candidateFeatures[iCandidate];
      weights[iCandidate] = getLogWeight(leafFeature, candidateFeature);
    }
    toExp(weights);
    console.warn(weights);
    const rng = new utils.Multinomial(weights);
    const leafEstimate = leafEstimates[iLeaf];
    for (let iMc = 0; iMc < n_mc; iMc++) {
      samples[leafFeatures.length * iMc + iLeaf] =
        candidateRatios[rng.sample()] * leafEstimate;
    }
  }
  const ts = new Float32Array(n_mc);
  for (let iMc = 0; iMc < n_mc; iMc++) {
    let t = 0;
    for (let iLeaf = 0; iLeaf < leafFeatures.length; ++iLeaf) {
      t += samples[leafFeatures.length * iMc + iLeaf];
    }
    ts[iMc] = t;
  }
  ts.sort();
  setPrediction(state, k, utils.sum(leafEstimates), [
    ts[0],
    ts[Math.round(n_mc / 10)],
    ts[Math.round(n_mc / 3)],
    ts[Math.round(n_mc / 2)],
    ts[Math.round((n_mc * 2) / 3)],
    ts[Math.round((n_mc * 9) / 10)],
    ts[n_mc - 1],
  ]);
};

const toExp = (weights: Float32Array) => {
  let max = -Infinity;
  for (let i = 0; i < weights.length; ++i) {
    max = Math.max(max, weights[i]);
  }
  for (let i = 0; i < weights.length; ++i) {
    weights[i] = Math.exp(weights[i] - max);
  }
};

const LOG2 = Math.log(2);

const getLogWeight = (
  leafFeature: ReturnType<typeof getFeature>,
  candidateFeature: ReturnType<typeof getFeature>,
) => {
  const wT =
    -(LOG2 * Math.abs(leafFeature.start_time - candidateFeature.start_time)) /
    (1000 * 86400 * 365.25);
  const wAncestors =
    (LOG2 / 2) *
    countIntersection(leafFeature.ancestors, candidateFeature.ancestors);
  return wT + wAncestors;
};

const countIntersection = <T>(a: Set<T>, b: Set<T>) => {
  let res = 0;
  for (const x of a) {
    if (b.has(x)) {
      ++res;
    }
  }
  return res;
};

const setPrediction = (
  state: types.TStateDraftWithReadonly,
  nodeId: types.TNodeId,
  leafEstimateSum: number,
  percentiles: [number, number, number, number, number, number, number],
) => {
  swapper.set(
    state.caches,
    state.swapped_caches,
    nodeId,
    "leaf_estimates_sum",
    leafEstimateSum,
  );
  swapper.set(
    state.caches,
    state.swapped_caches,
    nodeId,
    "percentiles",
    percentiles,
  );
};

const getFeature = (
  state: types.TStateDraftWithReadonly,
  nodeId: types.TNodeId,
) => {
  const node = state.data.nodes[nodeId];
  const feature = {
    start_time: node.start_time,
    ancestors: getAncestors(state, nodeId, new Set()),
  };
  return feature;
};

const getAncestors = (
  state: types.TStateDraftWithReadonly,
  nodeId: types.TNodeId,
  res: Set<types.TNodeId>,
) => {
  if (res.has(nodeId)) {
    return res;
  }
  res.add(nodeId);
  const node = state.data.nodes[nodeId];
  for (const edgeId of ops.keys_of(node.parents)) {
    const edge = state.data.edges[edgeId];
    getAncestors(state, edge.p, res);
  }
  return res;
};

const todo_leafs_of = (
  node_id: types.TNodeId,
  state: Immer.Immutable<types.TState>,
  edge_filter: (edge: types.TEdge) => boolean,
) => {
  return _todo_leafs_of(node_id, state, edge_filter, utils.visit_counter_of());
};
function* _todo_leafs_of(
  node_id: types.TNodeId,
  state: Immer.Immutable<types.TState>,
  edge_filter: (edge: types.TEdge) => boolean,
  vid: number,
): Iterable<[types.TNodeId, Immer.Immutable<types.TNode>]> {
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
