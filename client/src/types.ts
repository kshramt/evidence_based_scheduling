import * as Rtk from "@reduxjs/toolkit";
import * as immer from "immer";
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
import * as types_prev from "./types22";
export type {
  TAnyPayloadAction,
  TActionWithPayload,
  TActionWithoutPayload,
  TVids,
} from "./common_types1";
export { tEdgeId, tNodeId, tTimeNodeId } from "./common_types1";
export type { TNodeId, TEdgeId, TTimeNodeId } from "./common_types1";

export const VERSION = 23 as const;

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
export const tEvent = rt.$object({
  status: rt.$readonly(
    rt.$tuple([rt.$number()], rt.$number()), // Timestamps in milliseconds.
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
  percentiles: rt.$readonly(
    rt.$union(
      rt.$tuple([]),
      rt.$tuple([
        rt.$number(),
        rt.$number(),
        rt.$number(),
        rt.$number(),
        rt.$number(),
        rt.$number(),
        rt.$number(),
      ]),
    ),
  ), // 0, 10, 33, 50, 67, 90, 100
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
  readonly todo_node_ids: TNodeId[];
  readonly non_todo_node_ids: TNodeId[];
};
export type TGanttZoom = "D" | "W" | "M" | "Q" | "Y";

type TStateOmitted = Omit<TState, "caches" | "data"> & {
  data: Omit<TState["data"], "edges" | "nodes">;
};
type TStateDraft = immer.Draft<TState>;
export type TStateDraftWithReadonly = Omit<
  TStateDraft,
  "caches" | "data" | "swapped_caches" | "swapped_edges" | "swapped_nodes"
> &
  immer.Immutable<
    Pick<
      TStateDraft,
      "caches" | "swapped_caches" | "swapped_edges" | "swapped_nodes"
    >
  > & {
    readonly data: Omit<TStateDraft["data"], "nodes" | "edges"> &
      immer.Immutable<Pick<TStateDraft["data"], "nodes" | "edges">>;
  };

export type AppDispatch = Rtk.ThunkDispatch<
  TState,
  Record<string, never>,
  TAnyPayloadAction
>;

export const useDispatch = () => _useDispatch<AppDispatch>();
export const useSelector: TypedUseSelectorHook<TStateOmitted> = _useSelector;

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
  data: rt.$infer<typeof types_prev.tData>;
}):
  | { success: false }
  | {
      success: true;
      data: rt.$infer<typeof tData>;
      patch: producer.TOperation[];
    } => {
  const fn = (
    draft: immer.Draft<{
      data: rt.$infer<typeof types_prev.tData>;
    }>,
  ) => {
    // Reset the number part.
    {
      const resetIndexes = <K extends PropertyKey>(kvs: Record<K, number>) => {
        let i = 0;
        for (const k of ops.sorted_keys_of(kvs)) {
          kvs[k] = i;
          ++i;
        }
      };
      const resetIndexesWithStatus = (
        edgeIndexes: Record<rt.$infer<typeof tEdgeId>, number>,
      ) => {
        const todos: rt.$infer<typeof tEdgeId>[] = [];
        const dones: rt.$infer<typeof tEdgeId>[] = [];
        const donts: rt.$infer<typeof tEdgeId>[] = [];
        for (const edgeId of ops.sorted_keys_of(edgeIndexes)) {
          const status = draft.data.nodes[draft.data.edges[edgeId].c].status;
          if (status === "todo") {
            todos.push(edgeId);
          } else if (status === "done") {
            dones.push(edgeId);
          } else if (status === "dont") {
            donts.push(edgeId);
          }
        }
        const sorter = (
          a: rt.$infer<typeof tEdgeId>,
          b: rt.$infer<typeof tEdgeId>,
        ) =>
          (draft.data.nodes[draft.data.edges[a].c].end_time ?? 0) -
          (draft.data.nodes[draft.data.edges[b].c].end_time ?? 0);
        dones.sort(sorter);
        donts.sort(sorter);
        let i = 0;
        for (const edgeId of donts.concat(dones, todos)) {
          edgeIndexes[edgeId] = i;
          ++i;
        }
      };
      resetIndexes(draft.data.queue);
      for (const timeNode of Object.values(draft.data.timeline.time_nodes)) {
        resetIndexes(timeNode.nodes);
      }
      for (const node of Object.values(draft.data.nodes)) {
        resetIndexesWithStatus(node.children);
        resetIndexesWithStatus(node.parents);
      }
    }

    // Change `data.nodes.events[].status`
    {
      for (const node of Object.values(draft.data.nodes)) {
        if (node.events === undefined) {
          continue;
        }
        for (const event of node.events) {
          // @ts-expect-error current_of_prev
          event.status = [event.created_at];
          // @ts-expect-error current_of_prev
          delete event.created_at;
        }
      }
    }

    // @ts-expect-error current_of_prev
    draft.data.version = VERSION;
  };
  const produced = producer.produce_with_patche(data_prev, fn);
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
