import * as toast from "./toast";

import * as producer from "./producer";

import * as types_prev from "./types15";
import type {
  TNodeId,
  TOrderedTNodeIds,
  TOrderedTEdgeIds,
  IRange,
  IEdges,
  TStatus,
} from "./types15";
import {
  is_TNodeId,
  is_TOrderedTNodeIds,
  is_TOrderedTEdgeIds,
  is_IRange,
  is_IEdges,
  is_object,
  is_TStatus,
  record_if_false_of,
} from "./types15";

export type {
  TEdgeId,
  TNodeId,
  TOrderedTNodeIds,
  TOrderedTEdgeIds,
  IVids,
  IRange,
  IEdges,
  IEdge,
  TEdgeType,
  TStatus,
  TActionWithoutPayload,
  TActionWithPayload,
  TAnyPayloadAction,
} from "./types15";
export {
  is_TEdgeId,
  is_TNodeId,
  is_TOrderedTNodeIds,
  is_TOrderedTEdgeIds,
  is_IRange,
  is_IEdges,
  edge_type_values,
  is_TEdgeType,
  is_object,
  is_TStatus,
  record_if_false_of,
} from "./types15";

export const VERSION = 16 as const;

export const parse_data = (
  x: {data: any},
):
  | {
      success: true;
      data: IData;
      patch: producer.TOperation[];
      reverse_patch: producer.TOperation[];
    }
  | { success: false } => {
  const record_if_false = record_if_false_of();
  if (is_IData(x.data, record_if_false)) {
    return { success: true, data: x.data, patch: [], reverse_patch: [] };
  }
  const parsed_prev = types_prev.parse_data(x);
  if (!parsed_prev.success) {
    toast.add("error", `!is_IData: ${JSON.stringify(record_if_false.path)}`);
    console.warn("!is_IData", record_if_false.path);
    return { success: false };
  }
  {
    const converted = current_of_prev({ data: parsed_prev.data });
    if (!converted.success) {
      return { success: false };
    }
    return {
      success: true,
      data: converted.data,
      patch: parsed_prev.patch.concat(converted.patch),
      reverse_patch: parsed_prev.reverse_patch.concat(converted.reverse_patch),
    };
  }
};

const current_of_prev = (
  data_prev: {data: types_prev.IData},
):
  | { success: false }
  | {
      success: true;
      data: IData;
      patch: producer.TOperation[];
      reverse_patch: producer.TOperation[];
    } => {
  const produced = producer.produce_with_patche(data_prev, (draft) => {
    // @ts-expect-error
    draft.data.version = VERSION;
    for (const node of Object.values(draft.data.nodes)) {
      // @ts-expect-error
      delete node.style;
    }
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
    reverse_patch: produced.reverse_patch,
  };
};

export interface IState {
  readonly data: IData;
  readonly caches: ICaches;
  readonly predicted_next_nodes: TNodeId[];
  readonly n_unsaved_patches: number;
}

export interface IData {
  readonly edges: IEdges;
  readonly root: TNodeId;
  id_seq: number;
  readonly nodes: INodes;
  readonly queue: TOrderedTNodeIds;
  readonly showTodoOnly: boolean;
  readonly show_strong_edge_only?: boolean;
  readonly version: typeof VERSION;
}
export const is_IData = (
  data: any,
  record_if_false: ReturnType<typeof record_if_false_of>,
): data is IData =>
  record_if_false(is_object(data), "is_object") &&
  record_if_false(is_IEdges(data.edges, record_if_false), "edges") &&
  record_if_false(is_TNodeId(data.root), "root") &&
  record_if_false(typeof data.id_seq === "number", "id_seq") &&
  record_if_false(is_INodes(data.nodes, record_if_false), "nodes") &&
  record_if_false(is_TOrderedTNodeIds(data.queue), "queue") &&
  record_if_false(typeof data.showTodoOnly === "boolean", "showTodoOnly") &&
  record_if_false(
    [undefined, true, false].includes(data.show_strong_edge_only),
    "show_strong_edge_only",
  ) &&
  record_if_false(data.version === VERSION, "version");

export interface INodes {
  [k: TNodeId]: INode;
}
const is_INodes = (
  x: any,
  record_if_false: ReturnType<typeof record_if_false_of>,
): x is INodes =>
  record_if_false.check_object(x, (v) => is_INode(v, record_if_false));

export interface INode {
  readonly children: TOrderedTEdgeIds;
  readonly end_time: null | number;
  readonly estimate: number;
  readonly parents: TOrderedTEdgeIds;
  readonly ranges: IRange[];
  readonly start_time: number;
  readonly status: TStatus;
  readonly text: string;
}
const is_INode = (
  x: any,
  record_if_false: ReturnType<typeof record_if_false_of>,
): x is INode =>
  record_if_false(is_object(x), "is_object") &&
  record_if_false(is_TOrderedTEdgeIds(x.children), "children") &&
  record_if_false(
    x.end_time === null || typeof x.end_time === "number",
    "end_time",
  ) &&
  record_if_false(typeof x.estimate === "number", "estimate") &&
  record_if_false(is_TOrderedTEdgeIds(x.parents), "parents") &&
  record_if_false(record_if_false.check_array(x.ranges, is_IRange), "ranges") &&
  record_if_false(typeof x.start_time === "number", "start_time") &&
  record_if_false(is_TStatus(x.status), "status") &&
  record_if_false(typeof x.text === "string", "text");

export interface ICaches {
  [k: TNodeId]: ICache;
}

interface ICache {
  total_time: number;
  percentiles: number[]; // 0, 10, 33, 50, 67, 90, 100
  leaf_estimates_sum: number;
  show_detail: boolean;
  parent_edges: IEdges;
  parent_nodes: INodes;
  child_edges: IEdges;
  child_nodes: INodes;
}
