import * as toast from "./toast";

import * as producer from "./producer";

import type {
  TNodeId,
  TEdges,
  TOrderedTNodeIds,
  TNodes,
  TTimeline,
  TCaches,
  TCoveyQuadrants,
} from "./common_types1";
import {
  is_TNodeId,
  is_object,
  is_TEdges,
  record_if_false_of,
  is_TOrderedTNodeIds,
  is_TNodes,
  is_TTimeline,
  is_TCoveyQuadrants,
} from "./common_types1";
import * as types_prev from "./types19";

export const VERSION = 20 as const;

export const parse_data = (x: {
  data: any;
}):
  | {
      success: true;
      data: IData;
      patch: producer.TOperation[];
    }
  | { success: false } => {
  const record_if_false = record_if_false_of();
  if (is_IData(x.data, record_if_false)) {
    return { success: true, data: x.data, patch: [] };
  }
  const parsed_prev = types_prev.parse_data(x);
  if (!parsed_prev.success) {
    toast.add("error", `!is_IData: ${JSON.stringify(record_if_false.path)}`);
    console.warn("!is_IData", record_if_false.path);
    return { success: false };
  }
  const converted = current_of_prev({ data: parsed_prev.data });
  if (!converted.success) {
    return { success: false };
  }
  return {
    success: true,
    data: converted.data,
    patch: parsed_prev.patch.concat(converted.patch),
  };
};

const current_of_prev = (data_prev: {
  data: types_prev.IData;
}):
  | { success: false }
  | {
      success: true;
      data: IData;
      patch: producer.TOperation[];
    } => {
  const fn = (draft: { data: types_prev.IData }): { data: IData } => {
    const cqs: TCoveyQuadrants = {
      important_urgent: { nodes: [] },
      important_not_urgent: { nodes: [] },
      not_important_urgent: { nodes: [] },
      not_important_not_urgent: { nodes: [] },
    };
    return {
      data: {
        covey_quadrants: cqs,
        edges: draft.data.edges,
        root: draft.data.root,
        id_seq: draft.data.id_seq,
        nodes: draft.data.nodes,
        queue: draft.data.queue,
        timeline: draft.data.timeline,
        version: VERSION,
      },
    };
  };
  const produced = producer.produce_with_patche(
    data_prev,
    // @ts-expect-error
    fn,
  );
  const record_if_false = record_if_false_of();
  const data = produced.value.data;
  if (!is_IData(data, record_if_false)) {
    toast.add("error", `!is_IData: ${JSON.stringify(record_if_false.path)}`);
    console.warn("!is_IData", record_if_false.path);
    return { success: false };
  }
  return {
    success: true,
    data,
    patch: produced.patch,
  };
};

export interface IState {
  readonly data: IData;
  readonly caches: TCaches;
  readonly predicted_next_nodes: TNodeId[];
  readonly n_unsaved_patches: number;
  readonly todo_node_ids: TNodeId[];
  readonly non_todo_node_ids: TNodeId[];
}

export interface IData {
  readonly covey_quadrants: TCoveyQuadrants;
  readonly edges: TEdges;
  readonly root: TNodeId;
  readonly id_seq: number;
  readonly nodes: TNodes;
  readonly queue: TOrderedTNodeIds;
  readonly timeline: TTimeline;
  readonly version: typeof VERSION;
}
export const is_IData = (
  data: any,
  record_if_false: ReturnType<typeof record_if_false_of>,
): data is IData =>
  record_if_false(is_object(data), "is_object") &&
  record_if_false(
    is_TCoveyQuadrants(data.covey_quadrants, record_if_false),
    "covey_quadrants",
  ) &&
  record_if_false(is_TEdges(data.edges, record_if_false), "edges") &&
  record_if_false(is_TNodeId(data.root), "root") &&
  record_if_false(typeof data.id_seq === "number", "id_seq") &&
  record_if_false(is_TNodes(data.nodes, record_if_false), "nodes") &&
  record_if_false(is_TOrderedTNodeIds(data.queue), "queue") &&
  record_if_false(is_TTimeline(data.timeline, record_if_false), "timeline") &&
  record_if_false(data.version === VERSION, "version");
