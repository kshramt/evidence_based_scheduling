import * as sequenceComparisons from "@kshramt/sequence-comparisons";
import * as rt from "@kshramt/runtime-type-validator";

import * as ops from "./ops";
import * as toast from "./toast";
import * as producer from "./producer";
import * as intervals from "src/intervals";

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
const tRange = rt.$readonly(
  rt.$required({
    start: rt.$number(),
    end: rt.$union(rt.$null(), rt.$number()),
  }),
);
const tTextPatch = rt.$readonly(
  rt.$required({
    created_at: rt.$number(),
    ops: rt.$array(rt.$typeGuard(sequenceComparisons.isTCompressedOp)),
  }),
);
const tEdge = rt.$readonly(
  rt.$intersection(
    rt.$required({
      c: tNodeId,
      p: tNodeId,
      t: tEdgeType,
    }),
    rt.$optional({
      hide: rt.$boolean(),
    }),
  ),
);
const tEvent = rt.$readonly(
  rt.$required({
    created_at: rt.$number(), // Timestamp in milliseconds.
    status: rt.$union(rt.$literal("created"), rt.$literal("deleted")),
    interval_set: intervals.tIntervalSet,
  }),
);
const tNode = rt.$intersection(
  rt.$required({
    children: tOrderedTEdgeIds,
    end_time: rt.$union(rt.$null(), rt.$number()),
    estimate: rt.$number(),
    parents: tOrderedTEdgeIds,
    ranges: rt.$array(tRange),
    start_time: rt.$number(),
    status: tStatus,
    text_patches: rt.$array(tTextPatch), // The initial text is the empty string.
  }),
  rt.$optional({
    events: rt.$array(tEvent),
  }),
);
const tNodes = rt.$record(tNodeId, tNode);
const tEdges = rt.$record(tEdgeId, tEdge);
const tTimeNode = rt.$readonly(
  rt.$required({
    created_at: rt.$number(),
    nodes: tOrderedTNodeIds,
    show_children: rt.$union(
      rt.$literal("none"),
      rt.$literal("partial"),
      rt.$literal("full"),
    ),
    text: rt.$string(),
    tz: rt.$number(),
  }),
);
const tTimeline = rt.$readonly(
  rt.$required({
    year_begin: rt.$number(),
    count: rt.$number(),
    time_nodes: rt.$record(tTimeNodeId, tTimeNode),
  }),
);
const tCoveyQuadrant = rt.$readonly(
  rt.$required({
    nodes: rt.$array(tNodeId),
  }),
);
const tCoveyQuadrants = rt.$readonly(
  rt.$required({
    important_urgent: tCoveyQuadrant,
    not_important_urgent: tCoveyQuadrant,
    important_not_urgent: tCoveyQuadrant,
    not_important_not_urgent: tCoveyQuadrant,
  }),
);
export const tData = rt.$readonly(
  rt.$required({
    covey_quadrants: tCoveyQuadrants,
    edges: tEdges,
    id_seq: rt.$number(),
    nodes: tNodes,
    pinned_sub_trees: rt.$array(tNodeId),
    queue: tOrderedTNodeIds,
    root: tNodeId,
    timeline: tTimeline,
    version: rt.$literal(VERSION),
  }),
);
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
    // @ts-expect-error Just ignore the error.
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
