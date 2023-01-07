import { ThunkDispatch } from "redux-thunk";

import * as toast from "./toast";

import * as producer from "./producer";

import * as types_prev from "./types19";
import type {
  IEdges,
  TNodes,
  TAnyPayloadAction,
  TNodeId,
  TOrderedTNodeIds,
  TTimeline,
} from "./types19";
import {
  is_IEdges,
  is_TNodes,
  is_TNodeId,
  is_TOrderedTNodeIds,
  is_TTimeline,
  is_object,
  record_if_false_of,
} from "./types19";

export type {
  IEdge,
  IEdges,
  TNode,
  TNodes,
  IRange,
  IVids,
  TActionWithPayload,
  TActionWithoutPayload,
  TAnyPayloadAction,
  TEdgeId,
  TEdgeType,
  TNodeId,
  TOrderedTEdgeIds,
  TOrderedTNodeIds,
  TStatus,
  TTimeline,
  TTimeNodeId,
  TTimeNode,
} from "./types19";
export {
  edge_type_values,
  is_IEdges,
  is_TNodes,
  is_TEdgeType,
  is_TNodeId,
  is_TOrderedTNodeIds,
  is_TTimeline,
  is_TTimeNodeId,
  is_object,
  record_if_false_of,
} from "./types19";

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
  const produced = producer.produce_with_patche(data_prev, (draft) => {
    // @ts-expect-error
    draft.data.version = VERSION;
    const cqs: TCoveyQuadrants = {
      important_urgent: { nodes: [] },
      important_not_urgent: { nodes: [] },
      not_important_urgent: { nodes: [] },
      not_important_not_urgent: { nodes: [] },
    };
    // @ts-expect-error
    draft.data.covey_quadrants = cqs;
  });
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
}

export type TCaches = {
  [node_id: TNodeId]: TCache;
};

type TCache = {
  total_time: number;
  percentiles: number[]; // 0, 10, 33, 50, 67, 90, 100
  leaf_estimates_sum: number;
  show_detail: boolean;
  n_hidden_child_edges: number;
};

export interface IData {
  readonly covey_quadrants: TCoveyQuadrants;
  readonly edges: IEdges;
  readonly root: TNodeId;
  id_seq: number;
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
  record_if_false(is_IEdges(data.edges, record_if_false), "edges") &&
  record_if_false(is_TNodeId(data.root), "root") &&
  record_if_false(typeof data.id_seq === "number", "id_seq") &&
  record_if_false(is_TNodes(data.nodes, record_if_false), "nodes") &&
  record_if_false(is_TOrderedTNodeIds(data.queue), "queue") &&
  record_if_false(is_TTimeline(data.timeline, record_if_false), "timeline") &&
  record_if_false(data.version === VERSION, "version");

type TCoveyQuadrants = {
  readonly important_urgent: TCoveyQuadrant;
  readonly not_important_urgent: TCoveyQuadrant;
  readonly important_not_urgent: TCoveyQuadrant;
  readonly not_important_not_urgent: TCoveyQuadrant;
};
const is_TCoveyQuadrants = (
  data: any,
  record_if_false: ReturnType<typeof record_if_false_of>,
): data is TCoveyQuadrants => {
  return (
    record_if_false(is_object(data), "is_object") &&
    record_if_false(
      is_TCoveyQuadrant(data.important_urgent, record_if_false),
      "important_urgent",
    ) &&
    record_if_false(
      is_TCoveyQuadrant(data.not_important_urgent, record_if_false),
      "not_important_urgent",
    ) &&
    record_if_false(
      is_TCoveyQuadrant(data.important_not_urgent, record_if_false),
      "important_not_urgent",
    ) &&
    record_if_false(
      is_TCoveyQuadrant(data.not_important_not_urgent, record_if_false),
      "not_important_not_urgent",
    )
  );
};

type TCoveyQuadrant = {
  nodes: TNodeId[];
};
const is_TCoveyQuadrant = (
  data: any,
  record_if_false: ReturnType<typeof record_if_false_of>,
): data is TCoveyQuadrant => {
  return (
    record_if_false(is_object(data), "is_object", data) &&
    record_if_false(
      record_if_false.check_array(data.nodes, is_TNodeId),
      "nodes",
    )
  );
};

export type AppDispatch = ThunkDispatch<IState, {}, TAnyPayloadAction>;
