import * as types from "./types";
import { MultiSet } from "./multiset";
import * as utils from "./utils";
import * as rtk from "./rtk";

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

export const set_total_time_action = rtk.action_of_of<{
  node_ids: types.TNodeId[];
  force?: true;
}>("set_total_time_action");
