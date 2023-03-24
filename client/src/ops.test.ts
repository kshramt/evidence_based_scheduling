import { it, expect, vi } from "vitest";
import * as ops from "./ops";
import * as types from "./types";

vi.mock("./toast", () => {
  const original = vi.importActual("./toast");
  return {
    ...original,
    add: console.log,
  };
});

it("_parse_toc", () => {
  const parsed = ops._parse_toc(`0 a
1 b
 2 ba
 3 bb
  4 bba
   5 bbaa
 6 bc
  7 bca
 8 bd
  9 bda
10.5 c
`);
  const root: ops.ITocNode = {
    text: "",
    estimate: 0,
    id: "" as types.TNodeId,
    parent: null,
    children: [],
  };
  const a: ops.ITocNode = {
    text: "a",
    estimate: 0,
    id: "" as types.TNodeId,
    parent: root,
    children: [],
  };
  root.children.push(a);
  const b: ops.ITocNode = {
    text: "b",
    estimate: 1,
    id: "" as types.TNodeId,
    parent: root,
    children: [],
  };
  const ba: ops.ITocNode = {
    text: "ba",
    estimate: 2,
    id: "" as types.TNodeId,
    parent: b,
    children: [],
  };
  b.children.push(ba);
  const bb: ops.ITocNode = {
    text: "bb",
    estimate: 3,
    id: "" as types.TNodeId,
    parent: b,
    children: [],
  };
  const bba: ops.ITocNode = {
    text: "bba",
    estimate: 4,
    id: "" as types.TNodeId,
    parent: bb,
    children: [],
  };
  const bbaa: ops.ITocNode = {
    text: "bbaa",
    estimate: 5,
    id: "" as types.TNodeId,
    parent: bba,
    children: [],
  };
  bba.children.push(bbaa);
  bb.children.push(bba);
  b.children.push(bb);
  const bc: ops.ITocNode = {
    text: "bc",
    estimate: 6,
    id: "" as types.TNodeId,
    parent: b,
    children: [],
  };
  const bca: ops.ITocNode = {
    text: "bca",
    estimate: 7,
    id: "" as types.TNodeId,
    parent: bc,
    children: [],
  };
  bc.children.push(bca);
  b.children.push(bc);
  const bd: ops.ITocNode = {
    text: "bd",
    estimate: 8,
    id: "" as types.TNodeId,
    parent: b,
    children: [],
  };
  const bda: ops.ITocNode = {
    text: "bda",
    estimate: 9,
    id: "" as types.TNodeId,
    parent: bd,
    children: [],
  };
  bd.children.push(bda);
  b.children.push(bd);
  root.children.push(b);
  const c: ops.ITocNode = {
    text: "c",
    estimate: 10.5,
    id: "" as types.TNodeId,
    parent: root,
    children: [],
  };
  root.children.push(c);
  expect(parsed !== null).toBeTruthy();
  if (parsed !== null) {
    expect(ITocNode_equal(parsed, root)).toBeTruthy();
  }
});

export const ITocNode_equal = (x: ops.ITocNode, y: ops.ITocNode) =>
  _ITocNode_equal(x, y, new Map());
export const _ITocNode_equal = (
  x: ops.ITocNode,
  y: ops.ITocNode,
  seen: Map<ops.ITocNode, Set<ops.ITocNode>>,
): boolean => {
  let seen_x = seen.get(x);
  if (seen_x) {
    if (seen_x.has(y)) {
      return true;
    }
  } else {
    seen_x = new Set();
    seen.set(x, seen_x);
  }
  seen_x.add(y);
  return (
    x === y ||
    (x.id === y.id &&
      x.text === y.text &&
      x.estimate === y.estimate &&
      (x.parent === y.parent ||
        (x.parent !== null &&
          y.parent !== null &&
          _ITocNode_equal(x.parent, y.parent, seen))) &&
      ITocNode_list_equal(x.children, y.children, seen))
  );
};
const ITocNode_list_equal = (
  xs: ops.ITocNode[],
  ys: ops.ITocNode[],
  seen: Map<ops.ITocNode, Set<ops.ITocNode>>,
) => {
  if (xs === ys) {
    return true;
  }
  if (xs.length !== ys.length) {
    return false;
  }
  for (let i = 0; i < xs.length; ++i) {
    if (!_ITocNode_equal(xs[i], ys[i], seen)) {
      return false;
    }
  }
  return true;
};
