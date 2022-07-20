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
const new_id_of = (state: types.IState) =>
  id_string_of_number(++state.data.id_seq);
const id_string_of_number = (x: number) => x.toString(36);

export const emptyStateOf = (): types.IState => {
  const id_seq = 0;
  const root = id_string_of_number(id_seq) as types.TNodeId;
  const nodes = {
    [root]: newNodeValueOf([]),
  };
  const data = {
    edges: {},
    root,
    id_seq,
    nodes,
    queue: {},
    showTodoOnly: false,
    version: types.VERSION,
  };
  data.nodes[root].text = "root";
  const caches = {
    [root]: new_cache_of(data, root),
  };
  return {
    data,
    caches,
    is_loading: true,
    is_error: false,
  };
};

const newNodeValueOf = (parent_edge_ids: types.TEdgeId[]) => {
  const parents: types.TOrderedTEdgeIds = {};
  for (let i = 0; i < parent_edge_ids.length; ++i) {
    parents[parent_edge_ids[i]] = i;
  }
  return {
    children: {},
    end_time: null,
    estimate: consts.NO_ESTIMATION,
    parents,
    ranges: [] as types.IRange[],
    start_time: Number(new Date()),
    status: "todo" as types.TStatus,
    style: { height: "3ex" },
    text: "",
  };
};

export const new_cache_of = (data: types.IData, node_id: types.TNodeId) => {
  const parent_edges = filter_object(
    data.edges,
    keys_of(data.nodes[node_id].parents),
  );
  const parent_nodes = filter_object(
    data.nodes,
    keys_of(data.nodes[node_id].parents).map(
      (edge_id) => data.edges[edge_id].p,
    ),
  );
  const child_edges = filter_object(
    data.edges,
    keys_of(data.nodes[node_id].children),
  );
  const child_nodes = filter_object(
    data.nodes,
    keys_of(data.nodes[node_id].children).map(
      (edge_id) => data.edges[edge_id].c,
    ),
  );
  return {
    total_time: -1,
    percentiles: [],
    leaf_estimates_sum: -1,
    show_detail: false,
    parent_edges,
    parent_nodes,
    child_edges,
    child_nodes,
  };
};

const filter_object = <T extends {}>(kvs: T, ks: (keyof T)[]) => {
  const res = {} as T;
  for (const k of ks) {
    res[k] = kvs[k];
  }
  return res;
};

export const set_estimate = (
  payload: { node_id: types.TNodeId; estimate: number },
  draft: Draft<types.IState>,
) => {
  if (draft.data.nodes[payload.node_id].estimate === payload.estimate) {
    return;
  }
  draft.data.nodes[payload.node_id].estimate = payload.estimate;
  update_node_caches(payload.node_id, draft);
};

export const new_ = (
  parent_node_id: types.TNodeId,
  draft: Draft<types.IState>,
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
  const node = newNodeValueOf([edge_id]);
  const edge = { p: parent_node_id, c: node_id, t: "strong" as const };
  draft.data.nodes[node_id] = node;
  draft.data.edges[edge_id] = edge;
  draft.data.nodes[parent_node_id].children[edge_id] = -Number(new Date());
  draft.data.queue[node_id] = Number(new Date());
  draft.caches[node_id] = new_cache_of(draft.data, node_id);
  draft.caches[edge.p].child_edges[edge_id] = edge;
  draft.caches[edge.p].child_nodes[node_id] = node;
  return node_id;
};

export const add_edges = (edges: types.IEdge[], draft: Draft<types.IState>) => {
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
    draft.data.nodes[edge.c].parents[edge_id] = -Number(new Date());
    draft.data.nodes[edge.p].children[edge_id] = -Number(new Date());
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
    update_edge_caches(edge_id, draft);
    update_node_caches(edge.p, draft);
    update_node_caches(edge.c, draft);
    toast.add("info", `Added a edge ${edge.p} -> ${edge.c}.`);
  }
};

export const make_nodes_of_toc = (
  node_id: types.TNodeId,
  draft: Draft<types.IState>,
) => {
  if (
    draft.data.nodes[node_id].status !== "todo" ||
    keys_of(draft.data.nodes[node_id].children).length !== 0
  ) {
    toast.add("error", "TOC cannot be created for used nodes.");
    return;
  }
  const toc_root = _parse_toc(draft.data.nodes[node_id].text);
  if (toc_root === null) {
    toast.add("error", `Failed to parse the TOC of node ${node_id}.`);
    return;
  }
  toc_root.id = node_id;
  make_tree_from_toc(toc_root, draft);
  const edges = add_weak_edges_from_toc(toc_root, []);
  add_edges(edges, draft);
};

const add_weak_edges_from_toc = (toc: ITocNode, edges: types.IEdge[]) => {
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
    const node_id = new_(toc.id, draft);
    if (node_id === null) {
      const msg = "Must not happen: node_id === null.";
      toast.add("error", msg);
      console.warn(msg);
      return;
    }
    child_toc.id = node_id;
    draft.data.nodes[node_id].text = child_toc.text; // todo: Use set_text.
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

export const update_node_caches = (
  node_id: types.TNodeId,
  state: types.IState,
) => {
  const node = state.data.nodes[node_id];
  for (const edge_id of keys_of(node.parents)) {
    state.caches[state.data.edges[edge_id].p].child_nodes[node_id] = node;
  }
  for (const edge_id of keys_of(node.children)) {
    state.caches[state.data.edges[edge_id].c].parent_nodes[node_id] = node;
  }
};

export const update_edge_caches = (
  edge_id: types.TEdgeId,
  state: types.IState,
) => {
  const edge = state.data.edges[edge_id];
  state.caches[edge.p].child_edges[edge_id] = edge;
  state.caches[edge.c].parent_edges[edge_id] = edge;
};

export function keys_of<K extends string | number | symbol>(
  kvs: Record<K, number>,
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
  const ks = sorted_keys_of(kvs);
  const i = ks.indexOf(k);
  if (i < 1) {
    return;
  }
  move_before(kvs, i, 0, ks);
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
      ? -Number(new Date())
      : dst === n
      ? Number(new Date())
      : (kvs[ks[dst]] + kvs[ks[dst - 1]]) / 2;
}
