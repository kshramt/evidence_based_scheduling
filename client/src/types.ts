import { ThunkDispatch } from "redux-thunk";
import {
  TypedUseSelectorHook,
  useDispatch as _useDispatch,
  useSelector as _useSelector,
} from "react-redux";
import * as sequenceComparisons from "@kshramt/sequence-comparisons";

import * as ops from "./ops";
import * as toast from "./toast";
import * as producer from "./producer";

import type {
  TAnyPayloadAction,
  TCoveyQuadrants,
  TEdges,
  TNodeId,
  TOrderedTNodeIds,
  TTimeline,
} from "./common_types1";
import {
  is_object,
  is_TCoveyQuadrants,
  is_TEdges,
  is_TNodeId,
  is_TOrderedTNodeIds,
  is_TTimeline,
  record_if_false_of,
} from "./common_types1";

import type { TCaches, TNodes } from "./commonTypes2";
import { is_TNodes } from "./commonTypes2";

import * as types_prev from "./types21";

export type {
  TActionWithoutPayload,
  TActionWithPayload,
  TAnyPayloadAction,
  TEdge,
  TEdgeId,
  TEdges,
  TEdgeType,
  TNodeId,
  TOrderedTEdgeIds,
  TOrderedTNodeIds,
  TRange,
  TStatus,
  TTimeline,
  TTimeNode,
  TTimeNodeId,
  TVids,
} from "./common_types1";
export {
  edge_type_values,
  is_TEdgeType,
  is_TNodeId,
  is_TOrderedTNodeIds,
  is_TTimeNodeId,
} from "./common_types1";

export type { TCaches, TNode, TNodes, TTextPatch } from "./commonTypes2";

export const VERSION = 22 as const;

export const parse_data = (x: {
  data: any;
}):
  | {
      success: true;
      data: TData;
      patch: producer.TOperation[];
    }
  | { success: false } => {
  const record_if_false = record_if_false_of();
  if (is_TData(x.data, record_if_false)) {
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
  data: types_prev.TData;
}):
  | { success: false }
  | {
      success: true;
      data: TData;
      patch: producer.TOperation[];
    } => {
  const fn = (draft: { data: types_prev.TData }): { data: TData } => {
    const dw = new sequenceComparisons.DiffWu();
    const nodes: TNodes = {};
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
  const record_if_false = record_if_false_of();
  const data = produced.value.data;
  if (!is_TData(data, record_if_false)) {
    toast.add("error", `!is_TData: ${JSON.stringify(record_if_false.path)}`);
    console.warn("!is_TData", record_if_false.path);
    return { success: false };
  }
  return {
    success: true,
    data,
    patch: produced.patch,
  };
};

export interface IState {
  readonly data: TData;
  readonly caches: TCaches;
  readonly predicted_next_nodes: TNodeId[];
  readonly n_unsaved_patches: number;
  readonly todo_node_ids: TNodeId[];
  readonly non_todo_node_ids: TNodeId[];
}

export interface TData {
  readonly covey_quadrants: TCoveyQuadrants;
  readonly edges: TEdges;
  readonly id_seq: number;
  readonly nodes: TNodes;
  readonly pinned_sub_trees: TNodeId[];
  readonly queue: TOrderedTNodeIds;
  readonly root: TNodeId;
  readonly timeline: TTimeline;
  readonly version: typeof VERSION;
}
export const is_TData = (
  data: any,
  record_if_false: ReturnType<typeof record_if_false_of>,
): data is TData =>
  record_if_false(is_object(data), "is_object") &&
  record_if_false(
    is_TCoveyQuadrants(data.covey_quadrants, record_if_false),
    "covey_quadrants",
  ) &&
  record_if_false(is_TEdges(data.edges, record_if_false), "edges") &&
  record_if_false(is_TNodeId(data.root), "root") &&
  record_if_false(typeof data.id_seq === "number", "id_seq") &&
  record_if_false(is_TNodes(data.nodes, record_if_false), "nodes") &&
  record_if_false(is_TOrderedTNodeIds(data.queue), "queue") &&
  record_if_false(is_TTimeline(data.timeline, record_if_false), "timeline") &&
  record_if_false.check_array(data.pinned_sub_trees, is_TNodeId) &&
  record_if_false(data.version === VERSION, "version");

export type AppDispatch = ThunkDispatch<IState, {}, TAnyPayloadAction>;

export const useDispatch = () => _useDispatch<AppDispatch>();
export const useSelector: TypedUseSelectorHook<IState> = _useSelector;
