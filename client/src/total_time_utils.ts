import * as types from "./types";
import { MultiSet } from "./multiset";

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
