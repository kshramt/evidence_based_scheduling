import * as sequenceComparisons from "@kshramt/sequence-comparisons";
import * as immer from "immer";

import * as checks from "./checks";
import * as consts from "./consts";
import * as swapper from "./swapper";
import * as types from "./types";
import * as toast from "./toast";
import * as utils from "./utils";

export interface ITocNode {
  text: string;
  estimate: number;
  id: types.TNodeId;
  parent: null | ITocNode;
  children: ITocNode[];
}

const new_node_id_of = (state: types.TStateDraftWithReadonly) =>
  new_id_of(state) as types.TNodeId;
const new_edge_id_of = (state: types.TStateDraftWithReadonly) =>
  new_id_of(state) as types.TEdgeId;
const new_id_of = (state: types.TStateDraftWithReadonly) =>
  id_string_of_number(++state.data.id_seq);
const id_string_of_number = (x: number) => x.toString(36);

export const emptyStateOf = (): types.TState => {
  const id_seq = 0;
  const root = id_string_of_number(id_seq) as types.TNodeId;
  const nodes = {
    [root]: new_node_value_of([]),
  };
  const data = {
    covey_quadrants: {
      important_urgent: { nodes: [] },
      important_not_urgent: { nodes: [] },
      not_important_urgent: { nodes: [] },
      not_important_not_urgent: { nodes: [] },
    },
    edges: {},
    root,
    id_seq,
    nodes,
    pinned_sub_trees: [],
    queue: {},
    timeline: {
      year_begin: new Date().getFullYear(),
      count: 0,
      time_nodes: {},
    },
    showTodoOnly: false,
    version: types.VERSION,
  };
  const caches = {
    [root]: new_cache_of(0, []),
  };
  return {
    data,
    caches,
    predicted_next_nodes: [],
    swapped_caches: swapper.swapKeys(caches),
    swapped_edges: swapper.swapKeys(data.edges),
    swapped_nodes: swapper.swapKeys(data.nodes),
  };
};

export const new_time_node_of = (): types.TTimeNode => {
  const t = new Date();
  const t_msec = Number(t);
  return {
    created_at: t_msec,
    tz: t.getTimezoneOffset(),
    text: "",
    show_children: "partial",
    nodes: {},
  };
};

const new_node_value_of = (parent_edge_ids: types.TEdgeId[]): types.TNode => {
  const parents: types.TOrderedTEdgeIds = {};
  for (let i = 0; i < parent_edge_ids.length; ++i) {
    parents[parent_edge_ids[i]] = i;
  }
  return {
    children: {},
    end_time: null,
    estimate: consts.NO_ESTIMATION,
    parents,
    ranges: [] as types.TRange[],
    start_time: Date.now(),
    status: "todo" as types.TStatus,
    text_patches: [],
  };
};

const ACS = new sequenceComparisons.ApplyCompressedOpsForString([]);
export const new_cache_of = (
  n_hidden_child_edges: number,
  textPatches: readonly types.TTextPatch[],
): types.TCaches[types.TNodeId] => {
  ACS.reset([]);
  for (const patch of textPatches) {
    ACS.apply(patch.ops);
  }
  return {
    total_time: -1,
    percentiles: [],
    leaf_estimates_sum: -1,
    text: ACS.get(),
    n_hidden_child_edges,
  };
};

export const set_estimate = (
  payload: { node_id: types.TNodeId; estimate: number },
  state: types.TStateDraftWithReadonly,
) => {
  if (state.data.nodes[payload.node_id].estimate === payload.estimate) {
    return;
  }
  swapper.set(
    state.data.nodes,
    state.swapped_nodes,
    payload.node_id,
    "estimate",
    payload.estimate,
  );
};

export const add_node = (
  state: types.TStateDraftWithReadonly,
  parent_node_id: types.TNodeId,
  top_of_queue: boolean,
) => {
  if (state.data.nodes[parent_node_id].status !== "todo") {
    toast.add(
      "error",
      `No strong child can be added to a non-todo parent ${parent_node_id}.`,
    );
    return null;
  }
  const node_id = new_node_id_of(state);
  const edge_id = new_edge_id_of(state);
  const node = new_node_value_of([edge_id]);
  const edge = { p: parent_node_id, c: node_id, t: "strong" as const };
  swapper.add(state.data.nodes, state.swapped_nodes, node_id, node);
  swapper.add(state.data.edges, state.swapped_edges, edge_id, edge);
  swapper.set(
    state.data.nodes,
    state.swapped_nodes,
    parent_node_id,
    "children",
    immer.produce(state.data.nodes[parent_node_id].children, (children) => {
      children[edge_id] = getFrontIndex(children)[0];
    }),
  );
  state.data.queue[node_id] = (top_of_queue ? getFrontIndex : _back_value_of)(
    state.data.queue,
  )[0];
  swapper.add(
    state.caches,
    state.swapped_caches,
    node_id,
    new_cache_of(0, node.text_patches),
  );
  return node_id;
};

export const add_edges = (
  edges: types.TEdge[],
  state: types.TStateDraftWithReadonly,
) => {
  for (const edge of edges) {
    if (edge.c === state.data.root) {
      toast.add(
        "error",
        `No node should have the root node as its child: ${JSON.stringify(
          edge,
        )}`,
      );
      continue;
    }
    if (!(edge.p in state.data.nodes && edge.c in state.data.nodes)) {
      toast.add("error", `Nodes for ${JSON.stringify(edge)} does not exist.`);
      continue;
    }
    if (checks.has_edge(edge.p, edge.c, state)) {
      toast.add("error", `Edges for ${JSON.stringify(edge)} already exist.`);
      continue;
    }
    const edge_id = new_edge_id_of(state);
    swapper.add(state.data.edges, state.swapped_edges, edge_id, edge);
    swapper.set(
      state.data.nodes,
      state.swapped_nodes,
      edge.c,
      "parents",
      immer.produce(state.data.nodes[edge.c].parents, (parents) => {
        parents[edge_id] = getFrontIndex(parents)[0];
      }),
    );
    swapper.set(
      state.data.nodes,
      state.swapped_nodes,
      edge.p,
      "children",
      immer.produce(state.data.nodes[edge.p].children, (children) => {
        children[edge_id] = getFrontIndex(children)[0];
      }),
    );
    if (checks.has_cycle_of(edge_id, state)) {
      swapper.del(state.data.edges, state.swapped_edges, edge_id);
      swapper.set(
        state.data.nodes,
        state.swapped_nodes,
        edge.c,
        "parents",
        immer.produce(state.data.nodes[edge.c].parents, (parents) => {
          delete parents[edge_id];
        }),
      );
      swapper.set(
        state.data.nodes,
        state.swapped_nodes,
        edge.p,
        "children",
        immer.produce(state.data.nodes[edge.p].children, (children) => {
          delete children[edge_id];
        }),
      );
      toast.add(
        "error",
        `Detected a cycle for ${JSON.stringify(JSON.stringify(edge))}.`,
      );
      continue;
    }
    {
      const status = state.data.nodes[edge.c].status;
      switch (status) {
        case "todo": {
          break;
        }
        case "done": {
          moveToFrontOfChildren(state, edge.c);
          break;
        }
        case "dont": {
          moveToFrontOfChildren(state, edge.c);
          break;
        }
        default: {
          const _: never = status;
          throw new Error(`Unsupported status: ${status}`);
        }
      }
    }
    if (edge.hide) {
      swapper.set(
        state.caches,
        state.swapped_caches,
        edge.p,
        "n_hidden_child_edges",
        state.caches[edge.p].n_hidden_child_edges + 1,
      );
    }
    toast.add("info", `Added a edge ${edge.p} -> ${edge.c}.`);
  }
};

export const moveToFrontOfChildren = (
  state: types.TStateDraftWithReadonly,
  node_id: types.TNodeId,
) => {
  for (const edge_id of keys_of(state.data.nodes[node_id].parents)) {
    const parentNodeId = state.data.edges[edge_id].p;
    const children = state.data.nodes[parentNodeId].children;
    const [newIndex, currentFront] = getFrontIndex(children);
    if (children[edge_id] === currentFront) {
      continue;
    }
    swapper.set(
      state.data.nodes,
      state.swapped_nodes,
      parentNodeId,
      "children",
      immer.produce(children, (children) => {
        children[edge_id] = newIndex;
      }),
    );
  }
};

export const makeNodesOfToc = (
  payload: { nodeId: types.TNodeId; text: string },
  state: types.TStateDraftWithReadonly,
) => {
  if (state.data.nodes[payload.nodeId].status !== "todo") {
    toast.add("error", "TOC cannot be created for used nodes.");
    return;
  }
  const toc_root = _parse_toc(payload.text);
  if (toc_root === null) {
    toast.add("error", `Failed to parse the TOC of node ${payload.nodeId}.`);
    return;
  }
  toc_root.id = payload.nodeId;
  make_tree_from_toc(toc_root, state);
  const edges = add_weak_edges_from_toc(toc_root, []);
  add_edges(edges, state);
};

const add_weak_edges_from_toc = (toc: ITocNode, edges: types.TEdge[]) => {
  let current = toc;
  while (current.parent) {
    const i = current.parent.children.indexOf(current);
    if (0 < i) {
      edges.push({
        p: toc.id,
        c: current.parent.children[i - 1].id,
        t: "weak",
        hide: true,
      });
      break;
    }
    current = current.parent;
  }
  for (const child_toc of toc.children) {
    add_weak_edges_from_toc(child_toc, edges);
  }
  return edges;
};

const make_tree_from_toc = (
  toc: ITocNode,
  state: types.TStateDraftWithReadonly,
) => {
  for (let i = toc.children.length - 1; -1 < i; --i) {
    const child_toc = toc.children[i];
    const node_id = add_node(state, toc.id, false);
    if (node_id === null) {
      const msg = "Must not happen: node_id === null.";
      toast.add("error", msg);
      console.warn(msg);
      return;
    }
    child_toc.id = node_id;
    setText(state, node_id, child_toc.text);
    set_estimate({ node_id, estimate: child_toc.estimate }, state);
    make_tree_from_toc(child_toc, state);
  }
};

const DIFF_WU = new sequenceComparisons.DiffWu();
export const setText = (
  state: types.TStateDraftWithReadonly,
  nodeId: types.TNodeId,
  text: string,
) => {
  const cache = state.caches[nodeId];
  if (text !== cache.text) {
    const xs = Array.from(cache.text);
    const ys = Array.from(text);
    const ops = sequenceComparisons.compressOpsForString(
      DIFF_WU.call(xs, ys),
      ys,
    );
    swapper.set(
      state.data.nodes,
      state.swapped_nodes,
      nodeId,
      "text_patches",
      immer.produce(state.data.nodes[nodeId].text_patches, (text_patches) => {
        text_patches.push({ created_at: Date.now(), ops });
      }),
    );
    swapper.set(state.caches, state.swapped_caches, nodeId, "text", text);
  }
};

export const _parse_toc = (s: string) => {
  const lines = s.split("\n");
  const root: ITocNode = {
    text: "",
    estimate: 0,
    children: [],
    id: "" as types.TNodeId,
    parent: null,
  };
  let prev_level = -1;
  let prev_node = root;
  for (let i_line = 0; i_line < lines.length; ++i_line) {
    const line = lines[i_line];
    if (line === "") {
      continue;
    }
    const level = leading_spaces_of(line);
    const [estimate, text] = parse_line(line);
    if (isNaN(estimate)) {
      toast.add("error", `Line ${i_line} contains invalid estimate: ${s}`);
      return null;
    }
    if (prev_level < level) {
      if (prev_level + 1 < level) {
        toast.add("error", `Line ${i_line} of ${s} is indented too much.`);
        return null;
      }
      const new_node = {
        text: text,
        estimate: estimate,
        children: [],
        id: "" as types.TNodeId,
        parent: prev_node,
      };
      new_node.parent.children.push(new_node);
      prev_node = new_node;
    } else if (prev_level === level) {
      if (prev_node.parent === null) {
        toast.add(
          "error",
          `Must not happen: prev_node.parent === null in line ${i_line} of ${s}`,
        );
        return null;
      }
      const new_node = {
        text: text,
        estimate: estimate,
        children: [],
        id: "" as types.TNodeId,
        parent: prev_node.parent,
      };
      new_node.parent.children.push(new_node);
      prev_node = new_node;
    } else {
      while (level <= prev_level) {
        --prev_level;
        if (prev_node.parent === null) {
          toast.add(
            "error",
            `Must not happen: prev_node.parent === null in line ${i_line} of ${s}`,
          );
          return null;
        }
        prev_node = prev_node.parent;
      }
      const new_node = {
        text: text,
        estimate: estimate,
        children: [],
        id: "" as types.TNodeId,
        parent: prev_node,
      };
      new_node.parent.children.push(new_node);
      prev_node = new_node;
    }
    prev_level = level;
  }
  return root;
};

const parse_line = (l: string): [number, string] => {
  l = l.trim();
  const i = l.indexOf(" ");
  if (i < 1) {
    return [NaN, l];
  }
  const estimate = parseFloat(l.slice(0, i));
  const text = l.slice(i + 1);
  return [estimate, text];
};

const leading_spaces_of = (l: string) => {
  let res = 0;
  for (const c of l) {
    if (c !== " ") {
      break;
    }
    res += 1;
  }
  return res;
};

export function keys_of<K extends PropertyKey, V>(kvs: Readonly<Record<K, V>>) {
  return Object.keys(kvs) as K[];
}

// Sort the keys of 'kvs' in descending order based on their values.
// Since move-to-front operations are frequent, descending order is more space-efficient because it eliminates the need for minus signs.
export function sorted_keys_of<K extends PropertyKey>(
  kvs: Readonly<Record<K, number>>,
) {
  const ks = keys_of(kvs);
  ks.sort((a, b) => kvs[b] - kvs[a]);
  return ks;
}

export function move_up<K extends PropertyKey>(
  kvs: Readonly<Record<K, number>>,
  k: K,
) {
  const ks = sorted_keys_of(kvs);
  const i = ks.indexOf(k);
  if (i < 1) {
    return null;
  }
  return move_before(kvs, i, i - 1, ks);
}

export function delete_at_val<T>(xs: T[], x: T) {
  let res = 0;
  while (true) {
    const i = xs.indexOf(x);
    if (i < 0) {
      return res;
    }
    xs.splice(i, 1);
    ++res;
  }
}

export function move<T>(xs: T[], src: number, dst: number) {
  if (src === dst) {
    return xs;
  }
  const x = xs[src];
  xs.splice(src, 1);
  xs.splice(dst, 0, x);
  return xs;
}

export function move_down<K extends PropertyKey>(
  kvs: Readonly<Record<K, number>>,
  k: K,
) {
  const ks = sorted_keys_of(kvs);
  const i = ks.indexOf(k);
  if (i < 0 || ks.length <= i + 1) {
    return null;
  }
  return move_before(kvs, i, i + 2, ks);
}

export function move_up_todo_queue(
  state: types.TStateDraftWithReadonly,
  node_id: types.TNodeId,
) {
  const todoNodeIds = utils.getQueues(
    state.data.queue,
    state.swapped_nodes.status,
    state.swapped_nodes.start_time,
  ).todoQueue;
  const i = todoNodeIds.indexOf(node_id);
  if (i < 1) {
    return;
  }
  if (i === 1) {
    state.data.queue[node_id] = getFrontIndex(state.data.queue)[0];
  } else {
    const ks = sorted_keys_of(state.data.queue);
    const i = ks.indexOf(node_id);
    state.data.queue[node_id] =
      (state.data.queue[ks[i - 2]] + state.data.queue[ks[i - 1]]) / 2;
  }
}

export function move_down_todo_queue(
  state: types.TStateDraftWithReadonly,
  node_id: types.TNodeId,
) {
  const todoNodeIds = utils.getQueues(
    state.data.queue,
    state.swapped_nodes.status,
    state.swapped_nodes.start_time,
  ).todoQueue;
  const i = todoNodeIds.indexOf(node_id);
  const n = todoNodeIds.length;
  if (i < 0 || n - 1 <= i) {
    return;
  }
  if (i === n - 2) {
    state.data.queue[node_id] = _back_value_of(state.data.queue)[0];
  } else {
    const ks = sorted_keys_of(state.data.queue);
    const i = ks.indexOf(node_id);
    state.data.queue[node_id] =
      (state.data.queue[ks[i + 1]] + state.data.queue[ks[i + 2]]) / 2;
  }
}

export function move_before<K extends PropertyKey>(
  kvs: Readonly<Record<K, number>>,
  src: number,
  dst: number,
  ks?: K[],
) {
  if (ks === undefined) {
    ks = sorted_keys_of(kvs);
  }
  const n = ks.length;
  if (src < 0 || n <= src || dst < 0 || n < dst || src === dst) {
    return null;
  }
  return [
    ks[src],
    dst === 0
      ? getFrontIndex(kvs)[0]
      : dst === n
        ? _back_value_of(kvs)[0]
        : (kvs[ks[dst]] + kvs[ks[dst - 1]]) / 2,
  ] as const;
}

function _back_value_of<K extends PropertyKey>(
  kvs: Readonly<Record<K, number>>,
) {
  const vs = Object.values<number>(kvs);
  if (vs.length < 1) {
    return [0, 0];
  }
  const min = Math.min(...vs);
  return [Math.floor(min - 1), min];
}

export function getFrontIndex<K extends PropertyKey>(
  kvs: Readonly<Record<K, number>>,
) {
  const vs = Object.values<number>(kvs);
  if (vs.length < 1) {
    return [0, 0];
  }
  const max = Math.max(...vs);
  return [Math.ceil(max + 1), max];
}
