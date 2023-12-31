import * as Immer from "immer";

import * as consts from "src/consts";
import * as ops from "src/ops";
import * as swapper from "src/swapper";
import * as total_time_utils from "src/total_time_utils";
import * as types from "src/types";
import * as utils from "src/utils";

export const predict = (
  state: types.TStateDraftWithReadonly,
  k: types.TNodeId,
  vid: number,
) => {
  total_time_utils.setTotalTime(state, k, vid);
  const candidates = state.non_todo_node_ids.filter((node_id) => {
    const v = state.data.nodes[node_id];
    return v.estimate !== consts.NO_ESTIMATION;
  });
  const ratios = candidates.length
    ? candidates.map((node_id) => {
        const node = state.data.nodes[node_id];
        return (
          total_time_utils.setTotalTime(state, node_id, vid) /
          (1000 * 3600) /
          node.estimate
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
