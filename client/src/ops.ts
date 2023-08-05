import * as sequenceComparisons from "@kshramt/sequence-comparisons";

import * as checks from "./checks";
import * as consts from "./consts";
import * as types from "./types";
import * as toast from "./toast";
import { Draft } from "immer";

export interface ITocNode {
  text: string;
  estimate: number;
  id: types.TNodeId;
  parent: null | ITocNode;
  children: ITocNode[];
}

const new_node_id_of = (state: types.IState) =>
  new_id_of(state) as types.TNodeId;
const new_edge_id_of = (state: types.IState) =>
  new_id_of(state) as types.TEdgeId;
const new_id_of = (state: Draft<types.IState>) =>
  id_string_of_number(++state.data.id_seq);
const id_string_of_number = (x: number) => x.toString(36);

export const emptyStateOf = (): types.IState => {
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
    n_unsaved_patches: 0,
    todo_node_ids: [],
    non_todo_node_ids: [],
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
  textPatches: types.TTextPatch[],
) => {
  ACS.reset([]);
  for (const patch of textPatches) {
    ACS.apply(patch.ops);
  }
  return {
    total_time: -1,
    percentiles: [],
    leaf_estimates_sum: -1,
    text: ACS.get(),
    show_detail: false,
    n_hidden_child_edges,
  };
};

export const set_estimate = (
  payload: { node_id: types.TNodeId; estimate: number },
  draft: Draft<types.IState>,
) => {
  if (draft.data.nodes[payload.node_id].estimate === payload.estimate) {
    return;
  }
  draft.data.nodes[payload.node_id].estimate = payload.estimate;
};

export const add_node = (
  draft: Draft<types.IState>,
  parent_node_id: types.TNodeId,
  top_of_queue: boolean,
) => {
  if (draft.data.nodes[parent_node_id].status !== "todo") {
    toast.add(
      "error",
      `No strong child can be added to a non-todo parent ${parent_node_id}.`,
    );
    return null;
  }
  const node_id = new_node_id_of(draft);
  const edge_id = new_edge_id_of(draft);
  const node = new_node_value_of([edge_id]);
  const edge = { p: parent_node_id, c: node_id, t: "strong" as const };
  draft.data.nodes[node_id] = node;
  draft.data.edges[edge_id] = edge;
  draft.data.nodes[parent_node_id].children[edge_id] = _front_value_of(
    draft.data.nodes[parent_node_id].children,
  );
  draft.data.queue[node_id] = (top_of_queue ? _front_value_of : _back_value_of)(
    draft.data.queue,
  );
  if (top_of_queue) {
    draft.todo_node_ids.splice(0, 0, node_id);
  } else {
    draft.todo_node_ids.push(node_id);
  }
  draft.caches[node_id] = new_cache_of(0, node.text_patches);
  return node_id;
};

export const add_edges = (edges: types.TEdge[], draft: Draft<types.IState>) => {
  for (const edge of edges) {
    if (edge.c === draft.data.root) {
      toast.add(
        "error",
        `No node should have the root node as its child: ${edge}`,
      );
      continue;
    }
    if (!(edge.p in draft.data.nodes && edge.c in draft.data.nodes)) {
      toast.add("error", `Nodes for ${JSON.stringify(edge)} does not exist.`);
      continue;
    }
    if (checks.has_edge(edge.p, edge.c, draft)) {
      toast.add("error", `Edges for ${JSON.stringify(edge)} already exist.`);
      continue;
    }
    const edge_id = new_edge_id_of(draft);
    draft.data.edges[edge_id] = edge;
    draft.data.nodes[edge.c].parents[edge_id] = _front_value_of(
      draft.data.nodes[edge.c].parents,
    );
    draft.data.nodes[edge.p].children[edge_id] = _front_value_of(
      draft.data.nodes[edge.p].children,
    );
    if (checks.has_cycle_of(edge_id, draft)) {
      delete draft.data.edges[edge_id];
      delete draft.data.nodes[edge.c].parents[edge_id];
      delete draft.data.nodes[edge.p].children[edge_id];
      toast.add(
        "error",
        `Detected a cycle for ${JSON.stringify(JSON.stringify(edge))}.`,
      );
      continue;
    }
    {
      const status = draft.data.nodes[edge.c].status;
      switch (status) {
        case "todo": {
          break;
        }
        case "done": {
          move_down_to_boundary(draft, edge.c, (status) => status !== "todo");
          break;
        }
        case "dont": {
          move_down_to_boundary(draft, edge.c, (status) => status === "dont");
          break;
        }
        default: {
          const _: never = status;
          throw new Error(`Unsupported status: ${status}`);
        }
      }
    }
    if (edge.hide) {
      ++draft.caches[edge.p].n_hidden_child_edges;
    }
    toast.add("info", `Added a edge ${edge.p} -> ${edge.c}.`);
  }
};

export const move_down_to_boundary = (
  state: Draft<types.IState>,
  node_id: types.TNodeId,
  is_different: (status: types.TStatus) => boolean,
) => {
  for (const edge_id of keys_of(state.data.nodes[node_id].parents)) {
    const children = state.data.nodes[state.data.edges[edge_id].p].children;
    const edge_ids = sorted_keys_of(children);
    const i_edge = edge_ids.indexOf(edge_id);
    if (i_edge + 1 === edge_ids.length) {
      continue;
    }
    let i_seek = i_edge + 1;
    for (; i_seek < edge_ids.length; ++i_seek) {
      if (
        is_different(
          state.data.nodes[state.data.edges[edge_ids[i_seek]].c].status,
        )
      ) {
        break;
      }
    }
    if (
      i_seek + 1 === edge_ids.length &&
      !is_different(
        state.data.nodes[state.data.edges[edge_ids[i_seek]].c].status,
      )
    ) {
      ++i_seek;
    }
    if (i_seek <= edge_ids.length && i_edge + 1 < i_seek) {
      move_before(children, i_edge, i_seek, edge_ids);
    }
  }
};

export const make_nodes_of_toc = (
  node_id: types.TNodeId,
  draft: Draft<types.IState>,
) => {
  if (draft.data.nodes[node_id].status !== "todo") {
    toast.add("error", "TOC cannot be created for used nodes.");
    return;
  }
  const toc_root = _parse_toc(draft.caches[node_id].text);
  if (toc_root === null) {
    toast.add("error", `Failed to parse the TOC of node ${node_id}.`);
    return;
  }
  toc_root.id = node_id;
  make_tree_from_toc(toc_root, draft);
  const edges = add_weak_edges_from_toc(toc_root, []);
  add_edges(edges, draft);
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

const make_tree_from_toc = (toc: ITocNode, draft: Draft<types.IState>) => {
  for (let i = toc.children.length - 1; -1 < i; --i) {
    const child_toc = toc.children[i];
    const node_id = add_node(draft, toc.id, false);
    if (node_id === null) {
      const msg = "Must not happen: node_id === null.";
      toast.add("error", msg);
      console.warn(msg);
      return;
    }
    child_toc.id = node_id;
    draft.caches[node_id].text = child_toc.text; // todo: Use set_text.
    set_estimate({ node_id, estimate: child_toc.estimate }, draft);
    make_tree_from_toc(child_toc, draft);
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

export function keys_of<K extends string | number | symbol, V>(
  kvs: Record<K, V>,
) {
  return Object.keys(kvs) as K[];
}

export function sorted_keys_of<K extends string | number | symbol>(
  kvs: Record<K, number>,
) {
  const ks = keys_of(kvs);
  ks.sort((a, b) => kvs[a] - kvs[b]);
  return ks;
}

export function move_up<K extends string | number | symbol>(
  kvs: Record<K, number>,
  k: K,
) {
  const ks = sorted_keys_of(kvs);
  const i = ks.indexOf(k);
  if (i < 1) {
    return;
  }
  move_before(kvs, i, i - 1, ks);
}

export function move_to_front<K extends string | number | symbol>(
  kvs: Record<K, number>,
  k: K,
) {
  kvs[k] = _front_value_of(kvs);
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

export function move_down<K extends string | number | symbol>(
  kvs: Record<K, number>,
  k: K,
) {
  const ks = sorted_keys_of(kvs);
  const i = ks.indexOf(k);
  if (i < 0 || ks.length <= i + 1) {
    return;
  }
  move_before(kvs, i, i + 2, ks);
}

export function move_up_todo_queue(
  state: types.IState,
  node_id: types.TNodeId,
) {
  const i = state.todo_node_ids.indexOf(node_id);
  if (i < 1) {
    return;
  }
  move(state.todo_node_ids, i, i - 1);
  if (i === 1) {
    state.data.queue[node_id] = _front_value_of(state.data.queue);
  } else {
    const ks = sorted_keys_of(state.data.queue);
    const i = ks.indexOf(node_id);
    state.data.queue[node_id] =
      (state.data.queue[ks[i - 2]] + state.data.queue[ks[i - 1]]) / 2;
  }
}

export function move_down_todo_queue(
  state: types.IState,
  node_id: types.TNodeId,
) {
  const i = state.todo_node_ids.indexOf(node_id);
  const n = state.todo_node_ids.length;
  if (i < 0 || n - 1 <= i) {
    return;
  }
  move(state.todo_node_ids, i, i + 1);
  if (i === n - 2) {
    state.data.queue[node_id] = _back_value_of(state.data.queue);
  } else {
    const ks = sorted_keys_of(state.data.queue);
    const i = ks.indexOf(node_id);
    state.data.queue[node_id] =
      (state.data.queue[ks[i + 1]] + state.data.queue[ks[i + 2]]) / 2;
  }
}

export function move_before<K extends string | number | symbol>(
  kvs: Record<K, number>,
  src: number,
  dst: number,
  ks?: K[],
) {
  if (ks === undefined) {
    ks = sorted_keys_of(kvs);
  }
  const n = ks.length;
  if (src < 0 || n <= src || dst < 0 || n < dst || src === dst) {
    return;
  }
  kvs[ks[src]] =
    dst === 0
      ? _front_value_of(kvs)
      : dst === n
      ? _back_value_of(kvs)
      : (kvs[ks[dst]] + kvs[ks[dst - 1]]) / 2;
}

function _back_value_of<K extends string | number | symbol>(
  kvs: Record<K, number>,
) {
  const vs = Object.values<number>(kvs);
  if (vs.length < 1) {
    return 0;
  }
  return Math.max(...vs) + 1;
}

function _front_value_of<K extends string | number | symbol>(
  kvs: Record<K, number>,
) {
  const vs = Object.values<number>(kvs);
  if (vs.length < 1) {
    return 0;
  }
  return Math.min(...vs) - 1;
}
