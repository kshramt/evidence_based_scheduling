/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import * as toast from "./toast";

import * as producer from "./producer";

import type {
  TNodeId,
  TEdges,
  TNodes,
  TOrderedTNodeIds,
} from "./common_types1";
import {
  is_TNodeId,
  is_TEdges,
  is_object,
  record_if_false_of,
  is_TNodes,
  is_TOrderedTNodeIds,
} from "./common_types1";
import * as types_prev from "./types17";

export const VERSION = 18 as const;

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
    // @ts-expect-error current_of_prev
    draft.data.version = VERSION;
    // @ts-expect-error current_of_prev
    draft.data.timeline = {
      year_begin: new Date().getFullYear(),
      count: 0,
      time_nodes: {},
    };
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
  readonly timeline: TTimeline;
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
  record_if_false(is_TTimeline(data.timeline, record_if_false), "timeline") &&
  record_if_false(data.version === VERSION, "version");

export type TTimeline = {
  readonly year_begin: number;
  readonly count: number;
  readonly time_nodes: { [time_node_id: TTimeNodeId]: TTimeNode };
};
export const is_TTimeline = (
  data: any,
  record_if_false: ReturnType<typeof record_if_false_of>,
): data is TTimeline =>
  record_if_false(is_object(data), "is_object") &&
  record_if_false(typeof data.year_begin === "number", "year_begin") &&
  record_if_false(typeof data.count === "number", "count") &&
  record_if_false.check_object(data.time_nodes, (v) =>
    is_TTimeNode(v, record_if_false),
  );

export type TTimeNode = {
  readonly created_at: number;
  readonly nodes: { readonly [node_id: TNodeId]: number };
  readonly show_children: boolean;
  readonly text: string;
  readonly tz: number;
};
export const is_TTimeNode = (
  data: any,
  record_if_false: ReturnType<typeof record_if_false_of>,
): data is TTimeNode =>
  record_if_false(is_object(data), "is_object") &&
  record_if_false(typeof data.created_at === "number", "created_at") &&
  record_if_false(typeof data.tz === "number", "tz") &&
  record_if_false(typeof data.text === "string", "text") &&
  record_if_false(typeof data.show_children === "boolean", "show_children") &&
  record_if_false(is_TOrderedTNodeIds(data.nodes), "nodes");

export type TTimeNodeId = string & { readonly tag: unique symbol };
export const is_TTimeNodeId = (x: any): x is TTimeNodeId =>
  typeof x === "string";
