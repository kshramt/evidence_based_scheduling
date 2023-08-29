import { ThunkDispatch } from "redux-thunk";
import {
  TypedUseSelectorHook,
  useDispatch as _useDispatch,
  useSelector as _useSelector,
} from "react-redux";
import * as sequenceComparisons from "@kshramt/sequence-comparisons";
import * as rt from "@kshramt/runtime-type-validator";

import * as ops from "./ops";
import * as toast from "./toast";
import * as producer from "./producer";
import * as intervals from "src/intervals";
import * as swapper from "src/swapper";

import type { TAnyPayloadAction } from "./common_types1";
import { tEdgeId, tNodeId, tTimeNodeId } from "./common_types1";
import * as types_prev from "./types21";
export type {
  TAnyPayloadAction,
  TActionWithPayload,
  TActionWithoutPayload,
  TVids,
} from "./common_types1";
export type { TNodeId, TEdgeId, TTimeNodeId } from "./common_types1";
export { is_TNodeId, is_TEdgeId, is_TTimeNodeId } from "./common_types1";

export const VERSION = 22 as const;

const tStatus = rt.$union(
  rt.$literal("done"),
  rt.$literal("dont"),
  rt.$literal("todo"),
);
export const edgeTypeValues = ["weak", "strong"] as const;
const tEdgeType = rt.$union(
  rt.$literal(edgeTypeValues[0]),
  rt.$literal(edgeTypeValues[1]),
);
const tOrderedTNodeIds = rt.$record(tNodeId, rt.$number());
const tOrderedTEdgeIds = rt.$record(tEdgeId, rt.$number());
const tRange = rt.$object({
  start: rt.$readonly(rt.$number()),
  end: rt.$readonly(rt.$union(rt.$null(), rt.$number())),
});
const tTextPatch = rt.$object({
  created_at: rt.$readonly(rt.$number()),
  ops: rt.$readonly(
    rt.$array(rt.$typeGuard(sequenceComparisons.isTCompressedOp)),
  ),
});
const tEdge = rt.$object({
  c: rt.$readonly(tNodeId),
  p: rt.$readonly(tNodeId),
  t: rt.$readonly(tEdgeType),
  hide: rt.$readonly(rt.$optional(rt.$boolean())),
});
const tEvent = rt.$object({
  created_at: rt.$readonly(rt.$number()), // Timestamp in milliseconds.
  status: rt.$readonly(
    rt.$union(rt.$literal("created"), rt.$literal("deleted")),
  ),
  interval_set: rt.$readonly(intervals.tIntervalSet),
});
const tNode = rt.$object({
  children: rt.$readonly(tOrderedTEdgeIds),
  end_time: rt.$readonly(rt.$union(rt.$null(), rt.$number())),
  estimate: rt.$readonly(rt.$number()),
  events: rt.$readonly(rt.$optional(rt.$array(tEvent))),
  parents: rt.$readonly(tOrderedTEdgeIds),
  ranges: rt.$readonly(rt.$array(tRange)),
  start_time: rt.$readonly(rt.$number()),
  status: rt.$readonly(tStatus),
  text_patches: rt.$readonly(rt.$array(tTextPatch)), // The initial text is the empty string.
});
const tNodes = rt.$record(tNodeId, tNode);
const tEdges = rt.$record(tEdgeId, tEdge);
const tTimeNode = rt.$object({
  created_at: rt.$readonly(rt.$number()),
  nodes: rt.$readonly(tOrderedTNodeIds),
  show_children: rt.$readonly(
    rt.$union(rt.$literal("none"), rt.$literal("partial"), rt.$literal("full")),
  ),
  text: rt.$readonly(rt.$string()),
  tz: rt.$readonly(rt.$number()),
});
const tTimeline = rt.$object({
  year_begin: rt.$readonly(rt.$number()),
  count: rt.$readonly(rt.$number()),
  time_nodes: rt.$record(tTimeNodeId, rt.$readonly(tTimeNode)),
});
const tCoveyQuadrant = rt.$object({
  nodes: rt.$readonly(rt.$array(tNodeId)),
});
const tCoveyQuadrants = rt.$object({
  important_urgent: rt.$readonly(tCoveyQuadrant),
  not_important_urgent: rt.$readonly(tCoveyQuadrant),
  important_not_urgent: rt.$readonly(tCoveyQuadrant),
  not_important_not_urgent: rt.$readonly(tCoveyQuadrant),
});
const tCache = rt.$object({
  total_time: rt.$number(),
  percentiles: rt.$readonly(rt.$array(rt.$number())), // 0, 10, 33, 50, 67, 90, 100
  leaf_estimates_sum: rt.$readonly(rt.$number()),
  n_hidden_child_edges: rt.$readonly(rt.$number()),
  text: rt.$readonly(rt.$string()),
});
const tCaches = rt.$record(tNodeId, tCache);
export const tData = rt.$object({
  covey_quadrants: rt.$readonly(tCoveyQuadrants),
  edges: rt.$readonly(tEdges),
  id_seq: rt.$readonly(rt.$number()),
  nodes: rt.$readonly(tNodes),
  pinned_sub_trees: rt.$readonly(rt.$array(tNodeId)),
  queue: rt.$readonly(tOrderedTNodeIds),
  root: rt.$readonly(tNodeId),
  timeline: rt.$readonly(tTimeline),
  version: rt.$readonly(rt.$literal(VERSION)),
});
const ref = {};
export const is_TEdgeType = (x: unknown): x is TEdgeType => tEdgeType(x, ref);
export type TEvent = rt.$infer<typeof tEvent>;
export type TCaches = rt.$infer<typeof tCaches>;
export type TOrderedTEdgeIds = rt.$infer<typeof tOrderedTEdgeIds>;
export type TEdgeType = rt.$infer<typeof tEdgeType>;
export type TTimeNode = rt.$infer<typeof tTimeNode>;
export type TTextPatch = rt.$infer<typeof tTextPatch>;
export type TStatus = rt.$infer<typeof tStatus>;
export type TRange = rt.$infer<typeof tRange>;
export type TEdges = rt.$infer<typeof tEdges>;
export type TNodes = rt.$infer<typeof tNodes>;
export type TEdge = rt.$infer<typeof tEdge>;
export type TNode = rt.$infer<typeof tNode>;
type TData = rt.$infer<typeof tData>;
type TNodeId = rt.$infer<typeof tNodeId>;
export type TState = {
  readonly data: TData;
  readonly caches: TCaches;
  readonly predicted_next_nodes: TNodeId[];
  readonly swapped_caches: swapper.TSwapped1<TCaches>;
  readonly swapped_edges: swapper.TSwapped1<TData["edges"]>;
  readonly swapped_nodes: swapper.TSwapped1<TData["nodes"]>;
  readonly n_unsaved_patches: number;
  readonly todo_node_ids: TNodeId[];
  readonly non_todo_node_ids: TNodeId[];
};

export const parse_data = (x: {
  data: unknown;
}):
  | {
      success: true;
      data: rt.$infer<typeof tData>;
      patch: producer.TOperation[];
    }
  | { success: false } => {
  const parsed = rt.parse(tData, x.data);
  if (parsed.success) {
    return { success: true, data: parsed.value, patch: [] };
  }
  const parsed_prev = types_prev.parse_data(x);
  if (!parsed_prev.success) {
    toast.add("error", `!is_IData: ${JSON.stringify(parsed.path)}`);
    console.warn("!is_IData", parsed.path);
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
  data: types_prev.TData;
}):
  | { success: false }
  | {
      success: true;
      data: rt.$infer<typeof tData>;
      patch: producer.TOperation[];
    } => {
  const fn = (draft: {
    data: types_prev.TData;
  }): { data: rt.$infer<typeof tData> } => {
    const dw = new sequenceComparisons.DiffWu();
    const nodes: rt.$infer<typeof tNodes> = {};
    for (const nodeId of ops.keys_of(draft.data.nodes)) {
      const node = draft.data.nodes[nodeId];
      const ys = Array.from(node.text);
      nodes[nodeId] = {
        children: node.children,
        end_time: node.end_time,
        estimate: node.estimate,
        parents: node.parents,
        ranges: node.ranges,
        start_time: node.start_time,
        status: node.status,
        text_patches: [
          {
            created_at: node.start_time,
            ops: sequenceComparisons.compressOpsForString(dw.call([], ys), ys),
          },
        ],
      };
    }
    return {
      data: {
        covey_quadrants: draft.data.covey_quadrants,
        edges: draft.data.edges,
        id_seq: draft.data.id_seq,
        nodes,
        pinned_sub_trees: draft.data.pinned_sub_trees,
        queue: draft.data.queue,
        root: draft.data.root,
        timeline: draft.data.timeline,
        version: VERSION,
      },
    };
  };
  const produced = producer.produce_with_patche(
    data_prev,
    // @ts-expect-error
    fn,
  );
  const data = produced.value.data;
  const parsed = rt.parse(tData, data);
  if (!parsed.success) {
    toast.add("error", `!is_TData: ${JSON.stringify(parsed.path)}`);
    console.warn("!is_TData", parsed.path);
    return { success: false };
  }
  return {
    success: true,
    data: parsed.value,
    patch: produced.patch,
  };
};

export type AppDispatch = ThunkDispatch<TState, {}, TAnyPayloadAction>;

export const useDispatch = () => _useDispatch<AppDispatch>();
export const useSelector: TypedUseSelectorHook<
  Omit<TState, "caches" | "data"> & {
    data: Omit<TState["data"], "edges" | "nodes">;
  }
> = _useSelector;
