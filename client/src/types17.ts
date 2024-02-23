/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import * as toast from "./toast";

import * as producer from "./producer";

import type {
  TNodeId,
  TEdges,
  TOrderedTNodeIds,
  TNodes,
} from "./common_types1";
import {
  is_TNodeId,
  is_object,
  is_TEdges,
  record_if_false_of,
  is_TOrderedTNodeIds,
  is_TNodes,
} from "./common_types1";
import * as types_prev from "./types16";

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
    // @ts-expect-error current_of_prev
    draft.data.version = VERSION;
    // @ts-expect-error current_of_prev
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

export interface IData {
  readonly edges: TEdges;
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
  record_if_false(is_TEdges(data.edges, record_if_false), "edges") &&
  record_if_false(is_TNodeId(data.root), "root") &&
  record_if_false(typeof data.id_seq === "number", "id_seq") &&
  record_if_false(is_TNodes(data.nodes, record_if_false), "nodes") &&
  record_if_false(is_TOrderedTNodeIds(data.queue), "queue") &&
  record_if_false(data.version === VERSION, "version");
