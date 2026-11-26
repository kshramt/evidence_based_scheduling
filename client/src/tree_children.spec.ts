import { expect, test } from "vitest";

import { createTreeChildSelector } from "./tree_children";
import type { TEdgeId, TNodeId, TState } from "./types";

const parent = "parent" as TNodeId;
const leaf = "leaf" as TNodeId;
const a = "a" as TNodeId;
const b = "b" as TNodeId;
const c = "c" as TNodeId;
const ea = "ea" as TEdgeId;
const eb = "eb" as TEdgeId;
const ec = "ec" as TEdgeId;
const state = {
  swapped_nodes: {
    children: { [parent]: { [ea]: 1, [eb]: 2, [ec]: 3 }, [leaf]: {} },
    status: { [a]: "todo", [b]: "todo", [c]: "done" },
  },
  swapped_edges: {
    c: { [ea]: a, [eb]: b, [ec]: c },
    t: { [ea]: "strong", [eb]: "weak", [ec]: "strong" },
  },
} satisfies Pick<TState, "swapped_nodes" | "swapped_edges">;

test("reuses the child list when a timer update changes only ranges", () => {
  const select = createTreeChildSelector(parent, false, false);
  const entries = select(state);
  expect(entries).toEqual([
    [eb, b],
    [ea, a],
    [ec, c],
  ]);
  expect(
    select({
      ...state,
      swapped_nodes: { ...state.swapped_nodes, ranges: { [a]: [] } },
    }),
  ).toBe(entries);
});

test("refreshes when child order, status, or edge visibility changes", () => {
  const select = createTreeChildSelector(parent, false, false);
  expect(select(state)).toEqual([
    [eb, b],
    [ea, a],
    [ec, c],
  ]);
  expect(
    select({
      ...state,
      swapped_nodes: {
        ...state.swapped_nodes,
        children: { [parent]: { [ea]: 3, [eb]: 2, [ec]: 1 } },
      },
    }),
  ).toEqual([
    [ea, a],
    [eb, b],
    [ec, c],
  ]);
  expect(
    select({
      ...state,
      swapped_nodes: {
        ...state.swapped_nodes,
        status: { [a]: "done", [b]: "done", [c]: "todo" },
      },
    }),
  ).toEqual([
    [ec, c],
    [eb, b],
    [ea, a],
  ]);
  expect(
    select({
      ...state,
      swapped_edges: { ...state.swapped_edges, hide: { [eb]: true } },
    }),
  ).toEqual([
    [ea, a],
    [ec, c],
  ]);
});

test("honors both filters and skips empty branches", () => {
  expect(createTreeChildSelector(parent, true, true)(state)).toEqual([[ea, a]]);
  expect(createTreeChildSelector(leaf, false, false)(state)).toBeNull();
});
