import * as toast from "./toast";
import * as producer from "./producer";

const VERSION = 14 as const;

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
  toast.add("error", `!is_IData: ${JSON.stringify(record_if_false.path)}`);
  console.warn("!is_IData", record_if_false.path);
  return { success: false };
};

const is_object = (x: any) =>
  x && typeof x === "object" && x.constructor === Object;

const record_if_false_of = () => {
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
export const is_TEdgeId = (x: any): x is TEdgeId => typeof x === "string";

const status_values = ["done", "dont", "todo"] as const;
type TStatus = (typeof status_values)[number];
const is_TStatus = (x: any): x is TStatus => status_values.includes(x);

export interface IData {
  readonly edges: IEdges;
  readonly root: TNodeId;
  id_seq: number;
  readonly nodes: INodes;
  readonly queue: TNodeId[];
  readonly showTodoOnly: boolean;
  readonly show_strong_edge_only?: boolean;
  readonly version: typeof VERSION;
}
const is_IData = (data: any, record_if_false: TRecordIfFalse): data is IData =>
  record_if_false(is_object(data), "is_object") &&
  record_if_false(is_IEdges(data.edges, record_if_false), "edges") &&
  record_if_false(is_TNodeId(data.root), "root") &&
  record_if_false(typeof data.id_seq === "number", "id_seq") &&
  record_if_false(is_INodes(data.nodes, record_if_false), "nodes") &&
  record_if_false(
    record_if_false.check_array(data.queue, is_TNodeId),
    "queue",
  ) &&
  record_if_false(typeof data.showTodoOnly === "boolean", "showTodoOnly") &&
  record_if_false(
    [undefined, true, false].includes(data.show_strong_edge_only),
    "show_strong_edge_only",
  ) &&
  record_if_false(data.version === VERSION, "version");

interface INodes {
  [k: TNodeId]: INode;
}
const is_INodes = (x: any, record_if_false: TRecordIfFalse): x is INodes =>
  record_if_false.check_object(x, (v) => is_INode(v, record_if_false));

interface INode {
  readonly children: TEdgeId[];
  readonly end_time: null | number;
  readonly estimate: number;
  readonly parents: TEdgeId[];
  readonly ranges: IRange[];
  readonly start_time: number;
  readonly status: TStatus;
  readonly style: IStyle;
  readonly text: string;
}
const is_INode = (x: any, record_if_false: TRecordIfFalse): x is INode =>
  record_if_false(is_object(x), "is_object") &&
  record_if_false(Array.isArray(x.children), "children") &&
  record_if_false(
    record_if_false.check_array(x.children, is_TEdgeId),
    "children",
  ) &&
  record_if_false(
    x.end_time === null || typeof x.end_time === "number",
    "end_time",
  ) &&
  record_if_false(typeof x.estimate === "number", "estimate") &&
  record_if_false(
    record_if_false.check_array(x.parents, is_TEdgeId),
    "parents",
  ) &&
  record_if_false(record_if_false.check_array(x.ranges, is_IRange), "ranges") &&
  record_if_false(typeof x.start_time === "number", "start_time") &&
  record_if_false(is_TStatus(x.status), "status") &&
  record_if_false(is_IStyle(x.style), "style") &&
  record_if_false(typeof x.text === "string", "text");

interface IEdges {
  [edge_id: TEdgeId]: IEdge;
}
const is_IEdges = (
  edges: any,
  record_if_false: TRecordIfFalse,
): edges is IEdges => record_if_false.check_object(edges, is_IEdge);

const edge_type_values = ["weak", "strong"] as const;
type TEdgeType = (typeof edge_type_values)[number];
const is_TEdgeType = (x: any): x is TEdgeType => edge_type_values.includes(x);

interface IEdge {
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

interface IRange {
  readonly start: number;
  end: null | number;
}
const is_IRange = (x: any): x is IRange =>
  is_object(x) &&
  typeof x.start === "number" &&
  (x.end === null || typeof x.end === "number");
