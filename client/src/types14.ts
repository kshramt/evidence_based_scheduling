/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import * as toast from "./toast";
import * as producer from "./producer";
import type { TNodeId, TEdgeId, TRange, TEdges } from "./common_types1";
import {
  is_TNodeId,
  is_TEdgeId,
  is_TRange,
  is_TEdges,
  is_object,
} from "./common_types1";

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

const status_values = ["done", "dont", "todo"] as const;
type TStatus = (typeof status_values)[number];
const is_TStatus = (x: any): x is TStatus => status_values.includes(x);

export interface IData {
  readonly edges: TEdges;
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
  record_if_false(is_TEdges(data.edges, record_if_false), "edges") &&
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
  readonly ranges: TRange[];
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
  record_if_false(record_if_false.check_array(x.ranges, is_TRange), "ranges") &&
  record_if_false(typeof x.start_time === "number", "start_time") &&
  record_if_false(is_TStatus(x.status), "status") &&
  record_if_false(is_IStyle(x.style), "style") &&
  record_if_false(typeof x.text === "string", "text");

interface IStyle {
  readonly height: string;
}
const is_IStyle = (x: any): x is IStyle =>
  is_object(x) && typeof x.height === "string";
