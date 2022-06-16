import * as types from "./types";

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
