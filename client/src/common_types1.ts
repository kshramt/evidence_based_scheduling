import * as rt from "@kshramt/runtime-type-validator";

export const tTimeNodeId = rt.$opaque("TTimeNodeId", rt.$string());
export const tNodeId = rt.$opaque("TNodeId", rt.$string());
export const tEdgeId = rt.$opaque("TEdgeId", rt.$string());

const ref = {}
export const is_TNodeId = (x: any): x is TNodeId => tNodeId(x, ref);
export const is_TTimeNodeId = (x: any): x is TTimeNodeId => tTimeNodeId(x, ref);
export const is_TEdgeId = (x: any): x is TEdgeId => tEdgeId(x, ref);

export type TTimeNodeId = rt.$infer<typeof tTimeNodeId>;
export type TNodeId = rt.$infer<typeof tNodeId>;
export type TEdgeId = rt.$infer<typeof tEdgeId>;

export const is_object = (x: any) =>
  x && typeof x === "object" && x.constructor === Object;

export type TRange = {
  readonly start: number;
  end: null | number;
};
export const is_TRange = (x: any): x is TRange =>
  is_object(x) &&
  typeof x.start === "number" &&
  (x.end === null || typeof x.end === "number");

export type TEdges = {
  [edge_id: TEdgeId]: TEdge;
};
export const is_TEdges = (
  edges: any,
  record_if_false: ReturnType<typeof record_if_false_of>,
): edges is TEdges => record_if_false.check_object(edges, is_TEdge);

export const edge_type_values = ["weak", "strong"] as const;
export type TEdgeType = (typeof edge_type_values)[number];
export const is_TEdgeType = (x: any): x is TEdgeType =>
  edge_type_values.includes(x);

export type TEdge = {
  readonly c: TNodeId;
  readonly p: TNodeId;
  readonly t: TEdgeType;
  readonly hide?: boolean;
};
const is_TEdge = (x: any): x is TEdge =>
  is_object(x) &&
  is_TNodeId(x.c) &&
  is_TNodeId(x.p) &&
  is_TEdgeType(x.t) &&
  [undefined, true, false].includes(x.hide);

export const record_if_false_of = () => {
  const path: string[] = [];
  const record_if_false = (x: boolean, k: string, v: any = undefined) => {
    if (!x) {
      path.push(k);
      path.push(v);
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

const status_values = ["done", "dont", "todo"] as const;
export type TStatus = (typeof status_values)[number];
export const is_TStatus = (x: any): x is TStatus => status_values.includes(x);

export type TVids = {
  [k: TNodeId]: undefined | number;
};

export type TNode = {
  readonly children: TOrderedTEdgeIds;
  readonly end_time: null | number;
  readonly estimate: number;
  readonly parents: TOrderedTEdgeIds;
  readonly ranges: TRange[];
  readonly start_time: number;
  readonly status: TStatus;
  readonly text: string;
};
const is_TNode = (
  x: any,
  record_if_false: ReturnType<typeof record_if_false_of>,
): x is TNode =>
  record_if_false(is_object(x), "is_object") &&
  record_if_false(is_TOrderedTEdgeIds(x.children), "children") &&
  record_if_false(
    x.end_time === null || typeof x.end_time === "number",
    "end_time",
  ) &&
  record_if_false(typeof x.estimate === "number", "estimate") &&
  record_if_false(is_TOrderedTEdgeIds(x.parents), "parents") &&
  record_if_false(record_if_false.check_array(x.ranges, is_TRange), "ranges") &&
  record_if_false(typeof x.start_time === "number", "start_time") &&
  record_if_false(is_TStatus(x.status), "status") &&
  record_if_false(typeof x.text === "string", "text");

export type TOrderedTNodeIds = Record<TNodeId, number>;
export const is_TOrderedTNodeIds = (x: any): x is TOrderedTNodeIds =>
  is_object(x) &&
  Object.entries(x).every(
    (kv) => is_TNodeId(kv[0]) && typeof kv[1] === "number",
  );
export type TOrderedTEdgeIds = Record<TEdgeId, number>;
export const is_TOrderedTEdgeIds = (x: any): x is TOrderedTEdgeIds =>
  is_object(x) &&
  Object.entries(x).every(
    (kv) => is_TEdgeId(kv[0]) && typeof kv[1] === "number",
  );

export type TNodes = {
  [k: TNodeId]: TNode;
};
export const is_TNodes = (
  x: any,
  record_if_false: ReturnType<typeof record_if_false_of>,
): x is TNodes =>
  record_if_false.check_object(x, (v) => is_TNode(v, record_if_false));

export type TActionWithoutPayload = { type: string };
export type TActionWithPayload<Payload> = {
  type: string;
  payload: Payload;
};
export type TAnyPayloadAction = TActionWithoutPayload | TActionWithPayload<any>;

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
  readonly show_children: "none" | "partial" | "full";
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
  record_if_false(
    data.show_children === "none" ||
      data.show_children === "partial" ||
      data.show_children === "full",
    "show_children",
    data.show_children,
  ) &&
  record_if_false(is_TOrderedTNodeIds(data.nodes), "nodes");

export type TCoveyQuadrants = {
  readonly important_urgent: TCoveyQuadrant;
  readonly not_important_urgent: TCoveyQuadrant;
  readonly important_not_urgent: TCoveyQuadrant;
  readonly not_important_not_urgent: TCoveyQuadrant;
};
export const is_TCoveyQuadrants = (
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
