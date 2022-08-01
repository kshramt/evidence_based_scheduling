import * as toast from "./toast";

import * as producer from "./producer";

import * as types_prev from "./types14";
import type { TEdgeId, TNodeId } from "./types14";
import { is_TEdgeId, is_TNodeId } from "./types14";

export type { TEdgeId, TNodeId } from "./types14";
export { is_TEdgeId, is_TNodeId } from "./types14";

export const VERSION = 15 as const;

export const parse_data = (
  x: any,
):
  | {
      success: true;
      data: IData;
      patch: producer.TOperation[];
      reverse_patch: producer.TOperation[];
    }
  | { success: false } => {
  const record_if_false = record_if_false_of();
  if (is_IData(x, record_if_false)) {
    return { success: true, data: x, patch: [], reverse_patch: [] };
  }
  const parsed_prev = types_prev.parse_data(x);
  if (!parsed_prev.success) {
    toast.add("error", `!is_IData: ${JSON.stringify(record_if_false.path)}`);
    console.warn("!is_IData", record_if_false.path);
    return { success: false };
  }
  {
    const converted = current_of_prev(parsed_prev.data);
    if (!converted.success) {
      return { success: false };
    }
    return {
      success: true,
      data: converted.data,
      patch: parsed_prev.patch.concat(converted.patch),
      reverse_patch: parsed_prev.reverse_patch.concat(
        converted.reverse_patch,
      ),
    };
  }
};

const current_of_prev = (
  data_prev: types_prev.IData,
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
    draft.version = VERSION;
    const queue: TOrderedTNodeIds = {};
    for (let i = 0; i < draft.queue.length; ++i) {
      queue[draft.queue[i]] = i;
    }
    // @ts-expect-error
    draft.queue = queue;
    for (const node of Object.values(draft.nodes)) {
      const children: TOrderedTEdgeIds = {};
      for (let i = 0; i < node.children.length; ++i) {
        children[node.children[i]] = i;
      }
      // @ts-expect-error
      node.children = children;
      const parents: TOrderedTEdgeIds = {};
      for (let i = 0; i < node.parents.length; ++i) {
        parents[node.parents[i]] = i;
      }
      // @ts-expect-error
      node.parents = parents;
    }
  });
  const record_if_false = record_if_false_of();
  const data = produced.value;
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

const is_object = (x: any) =>
  x && typeof x === "object" && x.constructor === Object;

export const record_if_false_of = () => {
  const path: string[] = [];
  const record_if_false = (x: boolean, k: string) => {
    if (!x) {
      path.push(k);
    }
    return x;
  };
  record_if_false.path = path;
  record_if_false.check_array = (x: any, pred: (x: any) => boolean) =>
    record_if_false(Array.isArray(x), "isArray") &&
    x.every((v: any, i: number) => record_if_false(pred(v), i.toString()));
  record_if_false.check_object = (x: any, pred: (x: any) => boolean) =>
    record_if_false(is_object(x), "is_object") &&
    Object.entries(x).every(([k, v]: [string, any]) =>
      record_if_false(pred(v), k),
    );
  return record_if_false;
};
type TRecordIfFalse = ReturnType<typeof record_if_false_of>;

// export type TNodeId = string & { readonly tag: unique symbol };
// export const is_TNodeId = (x: any): x is TNodeId => typeof x === "string";
// export type TEdgeId = string & { readonly tag: unique symbol };
// const is_TEdgeId = (x: any): x is TEdgeId => typeof x === "string";

export type TActionWithoutPayload = { type: string };
export type TActionWithPayload<Payload> = {
  type: string;
  payload: Payload;
};
export type TAnyPayloadAction = TActionWithoutPayload | TActionWithPayload<any>;

const status_values = ["done", "dont", "todo"] as const;
export type TStatus = typeof status_values[number];
const is_TStatus = (x: any): x is TStatus => status_values.includes(x);

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
  record_if_false: TRecordIfFalse,
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
const is_INodes = (x: any, record_if_false: TRecordIfFalse): x is INodes =>
  record_if_false.check_object(x, (v) => is_INode(v, record_if_false));

export interface INode {
  readonly children: TOrderedTEdgeIds;
  readonly end_time: null | number;
  readonly estimate: number;
  readonly parents: TOrderedTEdgeIds;
  readonly ranges: IRange[];
  readonly start_time: number;
  readonly status: TStatus;
  readonly style: IStyle;
  readonly text: string;
}
const is_INode = (x: any, record_if_false: TRecordIfFalse): x is INode =>
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
  record_if_false(is_IStyle(x.style), "style") &&
  record_if_false(typeof x.text === "string", "text");

export interface IEdges {
  [edge_id: TEdgeId]: IEdge;
}
const is_IEdges = (
  edges: any,
  record_if_false: TRecordIfFalse,
): edges is IEdges => record_if_false.check_object(edges, is_IEdge);

export const edge_type_values = ["weak", "strong"] as const;
export type TEdgeType = typeof edge_type_values[number];
export const is_TEdgeType = (x: any): x is TEdgeType =>
  edge_type_values.includes(x);

export interface IEdge {
  readonly c: TNodeId;
  readonly p: TNodeId;
  readonly t: TEdgeType;
  readonly hide?: boolean;
}
const is_IEdge = (x: any): x is IEdge =>
  is_object(x) &&
  is_TNodeId(x.c) &&
  is_TNodeId(x.p) &&
  is_TEdgeType(x.t) &&
  [undefined, true, false].includes(x.hide);

interface IStyle {
  readonly height: string;
}
const is_IStyle = (x: any): x is IStyle =>
  is_object(x) && typeof x.height === "string";

export interface IRange {
  readonly start: number;
  end: null | number;
}
const is_IRange = (x: any): x is IRange =>
  is_object(x) &&
  typeof x.start === "number" &&
  (x.end === null || typeof x.end === "number");

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

export type TOrderedTNodeIds = Record<TNodeId, number>;
const is_TOrderedTNodeIds = (x: any): x is TOrderedTNodeIds =>
  is_object(x) &&
  Object.entries(x).every(
    (kv) => is_TNodeId(kv[0]) && typeof kv[1] === "number",
  );
export type TOrderedTEdgeIds = Record<TEdgeId, number>;
const is_TOrderedTEdgeIds = (x: any): x is TOrderedTEdgeIds =>
  is_object(x) &&
  Object.entries(x).every(
    (kv) => is_TEdgeId(kv[0]) && typeof kv[1] === "number",
  );

export interface IVids {
  [k: TNodeId]: undefined | number;
}
