import { test, expect } from "vitest";
import * as types from "./types";
import * as T from "./ops";

test("_parse_toc", () => {
  const parsed = T._parse_toc(`0 a
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
  const root: T.ITocNode = {
    text: "",
    estimate: 0,
    id: "" as types.TNodeId,
    parent: null,
    children: [],
  };
  const a: T.ITocNode = {
    text: "a",
    estimate: 0,
    id: "" as types.TNodeId,
    parent: root,
    children: [],
  };
  root.children.push(a);
  const b: T.ITocNode = {
    text: "b",
    estimate: 1,
    id: "" as types.TNodeId,
    parent: root,
    children: [],
  };
  const ba: T.ITocNode = {
    text: "ba",
    estimate: 2,
    id: "" as types.TNodeId,
    parent: b,
    children: [],
  };
  b.children.push(ba);
  const bb: T.ITocNode = {
    text: "bb",
    estimate: 3,
    id: "" as types.TNodeId,
    parent: b,
    children: [],
  };
  const bba: T.ITocNode = {
    text: "bba",
    estimate: 4,
    id: "" as types.TNodeId,
    parent: bb,
    children: [],
  };
  const bbaa: T.ITocNode = {
    text: "bbaa",
    estimate: 5,
    id: "" as types.TNodeId,
    parent: bba,
    children: [],
  };
  bba.children.push(bbaa);
  bb.children.push(bba);
  b.children.push(bb);
  const bc: T.ITocNode = {
    text: "bc",
    estimate: 6,
    id: "" as types.TNodeId,
    parent: b,
    children: [],
  };
  const bca: T.ITocNode = {
    text: "bca",
    estimate: 7,
    id: "" as types.TNodeId,
    parent: bc,
    children: [],
  };
  bc.children.push(bca);
  b.children.push(bc);
  const bd: T.ITocNode = {
    text: "bd",
    estimate: 8,
    id: "" as types.TNodeId,
    parent: b,
    children: [],
  };
  const bda: T.ITocNode = {
    text: "bda",
    estimate: 9,
    id: "" as types.TNodeId,
    parent: bd,
    children: [],
  };
  bd.children.push(bda);
  b.children.push(bd);
  root.children.push(b);
  const c: T.ITocNode = {
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

const ITocNode_equal = (x: T.ITocNode, y: T.ITocNode) =>
  _ITocNode_equal(x, y, new Map());
const _ITocNode_equal = (
  x: T.ITocNode,
  y: T.ITocNode,
  seen: Map<T.ITocNode, Set<T.ITocNode>>,
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
  xs: T.ITocNode[],
  ys: T.ITocNode[],
  seen: Map<T.ITocNode, Set<T.ITocNode>>,
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
