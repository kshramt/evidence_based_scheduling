import * as sequenceComparisons from "@kshramt/sequence-comparisons";

import * as commonTypes1 from "./common_types1";

type TTextPatch = {
  readonly created_at: number;
  readonly ops: sequenceComparisons.TCompressedOp[];
};
const isTTextPatch = (
  x: any,
  record_if_false: ReturnType<typeof commonTypes1.record_if_false_of>,
): x is TTextPatch => {
  return (
    record_if_false(typeof x.created_at === "number", "created_at") &&
    record_if_false(
      record_if_false.check_array(x.ops, sequenceComparisons.isTCompressedOp),
      "ops",
    )
  );
};

export type TNode = {
  readonly children: commonTypes1.TOrderedTEdgeIds;
  readonly end_time: null | number;
  readonly estimate: number;
  readonly parents: commonTypes1.TOrderedTEdgeIds;
  readonly ranges: commonTypes1.TRange[];
  readonly start_time: number;
  readonly status: commonTypes1.TStatus;
  readonly text_patches: TTextPatch[]; // The initial text is the empty string.
};
const is_TNode = (
  x: any,
  record_if_false: ReturnType<typeof commonTypes1.record_if_false_of>,
): x is TNode =>
  record_if_false(commonTypes1.is_object(x), "is_object") &&
  record_if_false(commonTypes1.is_TOrderedTEdgeIds(x.children), "children") &&
  record_if_false(
    x.end_time === null || typeof x.end_time === "number",
    "end_time",
  ) &&
  record_if_false(typeof x.estimate === "number", "estimate") &&
  record_if_false(commonTypes1.is_TOrderedTEdgeIds(x.parents), "parents") &&
  record_if_false(
    record_if_false.check_array(x.ranges, commonTypes1.is_TRange),
    "ranges",
  ) &&
  record_if_false(typeof x.start_time === "number", "start_time") &&
  record_if_false(commonTypes1.is_TStatus(x.status), "status") &&
  record_if_false(
    record_if_false.check_array(x.text_patches, (v) =>
      isTTextPatch(v, record_if_false),
    ),
    "text_patches",
  );

export type TNodes = {
  [k: commonTypes1.TNodeId]: TNode;
};
export const is_TNodes = (
  x: any,
  record_if_false: ReturnType<typeof commonTypes1.record_if_false_of>,
): x is TNodes =>
  record_if_false.check_object(x, (v) => is_TNode(v, record_if_false));

export type TCaches = {
  [node_id: commonTypes1.TNodeId]: TCache;
};

type TCache = {
  total_time: number;
  percentiles: number[]; // 0, 10, 33, 50, 67, 90, 100
  leaf_estimates_sum: number;
  show_detail: boolean;
  n_hidden_child_edges: number;
  text: string;
};
