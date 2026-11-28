import { expect, test, vi } from "vitest";
import {
  add_action,
  delete_range_action,
  eval_,
  set_estimate_action,
  set_range_value_action,
  show_path_to_selected_node,
  start_action,
  stop_action,
  todoToDone,
  toggle_show_children,
} from "./actions";
import { BiGramPredictor, TriGramPredictor } from "./next_action_predictor";
import { emptyStateOf, keys_of } from "./ops";
import { getRootReducer } from "./reducers";
import type { TNodeId } from "./types";
import { getStringOfLocalTime } from "./utils";

test("opening a path leaves visible edges and their parent counts alone", () => {
  const initial = emptyStateOf();
  const root = initial.data.root;
  const reduce = getRootReducer(
    initial,
    new BiGramPredictor<TNodeId>(0.9),
    new TriGramPredictor<TNodeId>(0.9),
    10,
  );
  const withParent = reduce(
    initial,
    add_action({ node_id: root, show_mobile: false }),
  );
  const parent = keys_of(withParent.data.queue)[0];
  const state = reduce(
    withParent,
    add_action({ node_id: parent, show_mobile: false }),
  );
  const child = keys_of(state.data.nodes).find(
    (id) => id !== root && id !== parent,
  );
  if (child === undefined) throw new Error("Expected child task");
  const edge = keys_of(state.data.nodes[child].parents)[0];

  expect(reduce(state, show_path_to_selected_node(child))).toBe(state);
  const collapsed = reduce(state, toggle_show_children(parent));
  expect(collapsed.data.edges[edge].hide).toBe(true);
  expect(collapsed.swapped_caches.n_hidden_child_edges?.[parent]).toBe(1);

  const reopened = reduce(collapsed, show_path_to_selected_node(child));
  expect(reopened.data.edges[edge].hide).toBeUndefined();
  expect(reopened.swapped_caches.n_hidden_child_edges?.[parent]).toBe(0);
  expect(reopened.swapped_caches.n_hidden_child_edges?.[root]).toBe(0);
  expect(reduce(reopened, show_path_to_selected_node(child))).toBe(reopened);
});

test("deleting a completed time record refreshes the next prediction", () => {
  const initial = emptyStateOf();
  const root = initial.data.root;
  const reduce = getRootReducer(
    initial,
    new BiGramPredictor<TNodeId>(0.9),
    new TriGramPredictor<TNodeId>(0.9),
    10,
  );
  const add = add_action({ node_id: root, show_mobile: false });
  let state = reduce(initial, add);
  const completed = keys_of(state.data.queue)[0];
  state = reduce(state, add);
  const pending = keys_of(state.data.queue).find((id) => id !== completed);
  if (pending === undefined) throw new Error("Expected a second task");
  state = reduce(
    state,
    set_estimate_action({ node_id: completed, estimate: 1 }),
  );
  state = reduce(state, set_estimate_action({ node_id: pending, estimate: 2 }));

  const withoutHistory = reduce(state, eval_(root));
  expect(withoutHistory.caches[root].percentiles).toEqual(
    Array<number>(7).fill(3),
  );
  const withUnrecordedCompletion = reduce(
    reduce(state, todoToDone(completed)),
    eval_(root),
  );
  expect(withUnrecordedCompletion.data.nodes[completed].ranges).toEqual([]);
  expect(withUnrecordedCompletion.caches[root].percentiles).toEqual(
    Array<number>(7).fill(0),
  );

  try {
    vi.setSystemTime(1_000);
    state = reduce(
      state,
      start_action({ node_id: completed, is_concurrent: false }),
    );
    vi.setSystemTime(7_201_000);
    state = reduce(state, stop_action(completed));
  } finally {
    vi.useRealTimers();
  }
  state = reduce(state, todoToDone(completed));
  state = reduce(state, eval_(root));
  expect(state.caches[root].total_time).toBe(7_200_000);
  expect(state.caches[root].percentiles).toEqual(Array<number>(7).fill(4));

  state = reduce(
    state,
    delete_range_action({ node_id: completed, i_range: 0 }),
  );
  state = reduce(state, eval_(root));
  expect(state.caches[root].total_time).toBe(0);
  expect(state.caches[root].percentiles).toEqual(Array<number>(7).fill(0));
});

test("invalid and unchanged time record edits leave state unchanged", () => {
  const initial = emptyStateOf();
  const reduce = getRootReducer(
    initial,
    new BiGramPredictor<TNodeId>(0.9),
    new TriGramPredictor<TNodeId>(0.9),
    10,
  );
  let state = reduce(
    initial,
    add_action({ node_id: initial.data.root, show_mobile: false }),
  );
  const node_id = keys_of(state.data.queue)[0];
  const start = 1_701_000_000_000;
  const end = start + 60_000;
  try {
    vi.setSystemTime(start);
    state = reduce(state, start_action({ node_id, is_concurrent: false }));
    vi.setSystemTime(end);
    state = reduce(state, stop_action(node_id));
  } finally {
    vi.useRealTimers();
  }

  const editEnd = (value: number, i_range = 0) =>
    set_range_value_action({
      node_id,
      i_range,
      k: "end",
      v: getStringOfLocalTime(value),
    });
  expect(reduce(state, editEnd(end))).toBe(state);
  expect(reduce(state, editEnd(start - 1000))).toBe(state);
  expect(reduce(state, editEnd(end, 1))).toBe(state);
  expect(reduce(state, delete_range_action({ node_id, i_range: -1 }))).toBe(
    state,
  );

  const edited = reduce(state, editEnd(end + 1000));
  expect(edited.data.nodes[node_id].ranges).toEqual([
    { start, end: end + 1000 },
  ]);
});
