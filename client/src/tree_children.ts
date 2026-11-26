import { lruMemoize } from "@reduxjs/toolkit";

import { sorted_keys_of } from "./ops";
import type { TEdgeId, TNodeId, TOrderedTEdgeIds, TState } from "./types";
import { assertV } from "./utils";

type ChildEntry = readonly [TEdgeId, TNodeId];
type TreeState = Pick<TState, "swapped_nodes" | "swapped_edges">;

export const sameChildEntries = (
  left: ChildEntry[] | null,
  right: ChildEntry[] | null,
) =>
  left === right ||
  (left !== null &&
    right !== null &&
    left.length === right.length &&
    left.every(
      ([edgeId, childId], i) =>
        edgeId === right[i][0] && childId === right[i][1],
    ));

export function createTreeChildSelector(
  nodeId: TNodeId,
  showTodoOnly: boolean,
  showStrongEdgeOnly: boolean,
) {
  const selectEntries = lruMemoize(
    (
      children: TOrderedTEdgeIds,
      statuses: TreeState["swapped_nodes"]["status"],
      edges: TreeState["swapped_edges"],
    ) => {
      const edgeIds = sorted_keys_of(children);
      if (edgeIds.length === 0) return null;
      const childStatuses = assertV(statuses);
      const todos: ChildEntry[] = [];
      const dones: ChildEntry[] = [];
      const donts: ChildEntry[] = [];
      for (const edgeId of edgeIds) {
        const childId = edges.c?.[edgeId];
        if (childId === undefined) continue;
        const status = childStatuses[childId];
        if (
          edges.hide?.[edgeId] ||
          (showStrongEdgeOnly && edges.t?.[edgeId] === "weak") ||
          (showTodoOnly && status !== "todo")
        ) {
          continue;
        }
        if (status === "todo") {
          todos.push([edgeId, childId]);
        } else if (status === "done") {
          dones.push([edgeId, childId]);
        } else if (status === "dont") {
          donts.push([edgeId, childId]);
        }
      }
      return todos.concat(dones, donts);
    },
  );

  return ({ swapped_nodes, swapped_edges }: TreeState) =>
    selectEntries(
      assertV(swapped_nodes.children?.[nodeId]),
      swapped_nodes.status,
      swapped_edges,
    );
}
