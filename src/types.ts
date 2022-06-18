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

export type TNodeId = string & { readonly tag: unique symbol };
export const is_TNodeId = (x: any): x is TNodeId => typeof x === "string";
export type TEdgeId = string & { readonly tag: unique symbol };
const is_TEdgeId = (x: any): x is TEdgeId => typeof x === "string";

export type AnyPayloadAction =
  | {
      readonly type: string;
    }
  | {
      readonly type: string;
      readonly payload: any;
    };

const status_values = ["done", "dont", "todo"] as const;
export type TStatus = typeof status_values[number];
const is_TStatus = (x: any): x is TStatus => status_values.includes(x);

export interface IListProps {
  readonly node_id_list: TNodeId[];
}

export interface IState {
  readonly data: IData;
  readonly caches: ICaches;
}

export interface IData {
  readonly current_entry: null | TNodeId;
  readonly edges: IEdges;
  readonly root: TNodeId;
  id_seq: number;
  readonly kvs: IKvs;
  readonly queue: TNodeId[];
  readonly showTodoOnly: boolean;
  readonly version: number;
}
export const is_IData = (
  data: any,
  record_if_false: TRecordIfFalse,
): data is IData =>
  record_if_false(is_object(data), "is_object") &&
  record_if_false(
    data.current_entry === null || is_TNodeId(data.current_entry),
    "current_entry",
  ) &&
  record_if_false(is_IEdges(data.edges, record_if_false), "edges") &&
  record_if_false(is_TNodeId(data.root), "root") &&
  record_if_false(typeof data.id_seq === "number", "id_seq") &&
  record_if_false(is_IKvs(data.kvs, record_if_false), "kvs") &&
  record_if_false(
    record_if_false.check_array(data.queue, is_TNodeId),
    "queue",
  ) &&
  record_if_false(typeof data.showTodoOnly === "boolean", "showTodoOnly") &&
  record_if_false(typeof data.version === "number", "version");

export interface IKvs {
  readonly [k: TNodeId]: IEntry;
}
const is_IKvs = (x: any, record_if_false: TRecordIfFalse): x is IKvs =>
  record_if_false.check_object(x, (v) => is_IEntry(v, record_if_false));

export interface IEntry {
  readonly children: TEdgeId[];
  readonly end_time: null | string;
  readonly estimate: number;
  readonly parents: TEdgeId[];
  readonly ranges: IRange[];
  readonly show_children: boolean;
  readonly start_time: string;
  readonly status: TStatus;
  readonly style: IStyle;
  readonly text: string;
}
const is_IEntry = (x: any, record_if_false: TRecordIfFalse): x is IEntry =>
  record_if_false(is_object(x), "is_object") &&
  record_if_false(Array.isArray(x.children), "children") &&
  record_if_false(
    record_if_false.check_array(x.children, is_TEdgeId),
    "children",
  ) &&
  record_if_false(
    x.end_time === null || typeof x.end_time === "string",
    "end_time",
  ) &&
  record_if_false(typeof x.estimate === "number", "estimate") &&
  record_if_false(
    record_if_false.check_array(x.parents, is_TEdgeId),
    "parents",
  ) &&
  record_if_false(record_if_false.check_array(x.ranges, is_IRange), "ranges") &&
  record_if_false(typeof x.show_children === "boolean", "show_children") &&
  record_if_false(typeof x.start_time === "string", "start_time") &&
  record_if_false(is_TStatus(x.status), "status") &&
  record_if_false(is_IStyle(x.style), "style") &&
  record_if_false(typeof x.text === "string", "text");

export interface IEdges {
  readonly [edge_id: TEdgeId]: IEdge;
}
const is_IEdges = (
  edges: any,
  record_if_false: TRecordIfFalse,
): edges is IEdges => record_if_false.check_object(edges, is_IEdge);

export const edge_type_values = ["strong", "weak"] as const;
export type TEdgeType = typeof edge_type_values[number];
export const is_TEdgeType = (x: any): x is TEdgeType => edge_type_values.includes(x);

export interface IEdge {
  readonly c: TNodeId;
  readonly p: TNodeId;
  readonly t: TEdgeType;
}
const is_IEdge = (x: any): x is IEdge =>
  is_object(x) && is_TNodeId(x.c) && is_TNodeId(x.p) && is_TEdgeType(x.t);

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
export const cache_of = (caches: ICaches, node_id: TNodeId) => {
  return caches[node_id] === undefined
    ? (caches[node_id] = {
        total_time: -1,
        percentiles: [],
        visited: -1,
        show_detail: false,
      })
    : caches[node_id];
};

interface ICache {
  total_time: number;
  percentiles: number[]; // 0, 10, 33, 50, 67, 90, 100
  visited: number;
  show_detail: boolean;
}
