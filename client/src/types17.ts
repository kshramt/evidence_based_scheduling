import * as toast from "./toast";

import * as producer from "./producer";

import * as types_prev from "./types16";
import type {
  ICaches,
  IEdges,
  TNodes,
  TNodeId,
  TOrderedTNodeIds,
} from "./types16";
import {
  is_IEdges,
  is_TNodes,
  is_TNodeId,
  is_TOrderedTNodeIds,
  is_object,
  record_if_false_of,
} from "./types16";

export type {
  ICaches,
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
} from "./types16";
export {
  edge_type_values,
  is_IEdges,
  is_TNodes,
  is_TEdgeType,
  is_TNodeId,
  is_TOrderedTNodeIds,
  is_object,
  record_if_false_of,
} from "./types16";

export const VERSION = 17 as const;

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
  {
    const converted = current_of_prev({ data: parsed_prev.data });
    if (!converted.success) {
      return { success: false };
    }
    return {
      success: true,
      data: converted.data,
      patch: parsed_prev.patch.concat(converted.patch),
    };
  }
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
    // @ts-expect-error
    delete draft.data.showTodoOnly;
    delete draft.data.show_strong_edge_only;
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
  readonly caches: ICaches;
  readonly predicted_next_nodes: TNodeId[];
  readonly n_unsaved_patches: number;
}

export interface IData {
  readonly edges: IEdges;
  readonly root: TNodeId;
  id_seq: number;
  readonly nodes: TNodes;
  readonly queue: TOrderedTNodeIds;
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
  record_if_false(is_TNodes(data.nodes, record_if_false), "nodes") &&
  record_if_false(is_TOrderedTNodeIds(data.queue), "queue") &&
  record_if_false(data.version === VERSION, "version");
