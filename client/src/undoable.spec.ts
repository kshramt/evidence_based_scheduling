import { createAction, createReducer } from "@reduxjs/toolkit";
import { expect, test } from "vitest";

import * as actions from "./actions";
import { BiGramPredictor, TriGramPredictor } from "./next_action_predictor";
import { emptyStateOf } from "./ops";
import { getRootReducer } from "./reducers";
import type { TNodeId, TState } from "./types";
import {
  REDO_TYPE,
  UNDO_TYPE,
  register_history_type,
  undoableOf,
} from "./undoable";

const estimate = register_history_type(createAction<number>("test/estimate"));
const cache = createAction<number>("test/cache");
const open = createAction<TNodeId>("test/open");
const close = createAction("test/close");
const appendRange = register_history_type(
  createAction<number>("test/appendRange"),
);
const removeRange = register_history_type(createAction("test/removeRange"));

function fixture() {
  const initial = emptyStateOf();
  const id = initial.data.root;
  const reducer = createReducer(initial, (builder) => {
    builder.addCase(estimate, (state, action) => {
      state.data.nodes[id].estimate = action.payload;
    });
    builder.addCase(cache, (state, action) => {
      state.caches[id].total_time = action.payload;
    });
    builder.addCase(open, (state, action) => {
      state.drawerStack.push(action.payload);
    });
    builder.addCase(close, (state) => {
      state.drawerStack.pop();
    });
    builder.addCase(appendRange, (state, action) => {
      state.data.nodes[id].ranges.push({ start: action.payload, end: null });
      state.data.queue[id] = action.payload;
    });
    builder.addCase(removeRange, (state) => {
      state.data.nodes[id].ranges.splice(0, 1);
      delete state.data.queue[id];
    });
  });
  const reduce = undoableOf(reducer, initial);
  return { initial, id, reducer, reduce };
}

test("undo and redo replay arrays, deleted keys, and complete state values", () => {
  const f = fixture();
  const actions = [
    estimate(1),
    appendRange(10),
    appendRange(20),
    removeRange(),
    estimate(2),
  ];
  const snapshots = [f.initial];
  let state: TState = f.initial;
  for (const action of actions) {
    snapshots.push(f.reducer(snapshots.at(-1), action));
    state = f.reduce(state, action);
    expect(state).toEqual(snapshots.at(-1));
  }
  for (const expected of snapshots.slice(0, -1).reverse()) {
    state = f.reduce(state, { type: UNDO_TYPE });
    expect(state).toEqual(expected);
  }
  expect(f.reduce(state, { type: UNDO_TYPE })).toEqual(f.initial);
  for (const expected of snapshots.slice(1)) {
    state = f.reduce(state, { type: REDO_TYPE });
    expect(state).toEqual(expected);
  }
  expect(f.reduce(state, { type: REDO_TYPE })).toEqual(snapshots.at(-1));
});

test("untracked changes are included in the next tracked snapshot", () => {
  const f = fixture();
  const first = f.reduce(f.initial, estimate(1));
  const cached = f.reduce(f.reduce(first, cache(10)), cache(11));
  const second = f.reduce(cached, estimate(2));
  const transient = f.reduce(second, cache(99));
  const undone = f.reduce(transient, { type: UNDO_TYPE });
  expect(undone).toEqual(first);
  const redone = f.reduce(undone, { type: REDO_TYPE });
  expect(redone).toEqual(second);
  expect(redone.caches[f.id].total_time).toBe(11);
});

test("history boundaries discard untracked changes like snapshots do", () => {
  const f = fixture();
  expect(f.reduce(f.reduce(f.initial, cache(10)), { type: UNDO_TYPE })).toEqual(
    f.initial,
  );
  expect(f.reduce(f.reduce(f.initial, cache(20)), { type: REDO_TYPE })).toEqual(
    f.initial,
  );
  const tracked = f.reduce(f.initial, estimate(1));
  expect(f.reduce(f.reduce(tracked, cache(30)), { type: REDO_TYPE })).toEqual(
    tracked,
  );
});

test("multiple untracked array edits replay in the original order", () => {
  const f = fixture();
  const opened = f.reduce(f.reduce(f.initial, open(f.id)), open(f.id));
  const first = f.reduce(opened, estimate(1));
  const second = f.reduce(f.reduce(first, close()), estimate(2));
  const undone = f.reduce(second, { type: UNDO_TYPE });
  expect(undone).toEqual(first);
  const beginning = f.reduce(undone, { type: UNDO_TYPE });
  expect(beginning).toEqual(f.initial);
  const redone = f.reduce(beginning, { type: REDO_TYPE });
  expect(redone).toEqual(first);
  expect(f.reduce(redone, { type: REDO_TYPE })).toEqual(second);
});

test("editing after undo replaces the redo branch including pending changes", () => {
  const f = fixture();
  const first = f.reduce(f.initial, estimate(1));
  const second = f.reduce(first, estimate(2));
  const third = f.reduce(second, estimate(3));
  const undone = f.reduce(f.reduce(third, { type: UNDO_TYPE }), {
    type: UNDO_TYPE,
  });
  expect(undone).toEqual(first);
  const replacement = f.reduce(f.reduce(undone, cache(25)), estimate(4));
  expect(f.reduce(replacement, { type: REDO_TYPE })).toEqual(replacement);
  const previous = f.reduce(replacement, { type: UNDO_TYPE });
  expect(previous).toEqual(first);
  expect(f.reduce(previous, { type: REDO_TYPE })).toEqual(replacement);
});

test("no-op tracked actions preserve redo and pending changes still form a step", () => {
  const f = fixture();
  const first = f.reduce(f.initial, estimate(1));
  const second = f.reduce(first, estimate(2));
  const undone = f.reduce(second, { type: UNDO_TYPE });
  const noop = f.reduce(undone, estimate(1));
  expect(f.reduce(noop, { type: REDO_TYPE })).toEqual(second);
  const cached = f.reduce(second, cache(10));
  const cacheOnlyStep = f.reduce(cached, estimate(2));
  const previous = f.reduce(cacheOnlyStep, { type: UNDO_TYPE });
  expect(previous).toEqual(second);
  expect(f.reduce(previous, { type: UNDO_TYPE })).toEqual(first);
});

test("all steps remain available beyond a thousand edits", () => {
  const f = fixture();
  let state: TState = f.initial;
  for (let n = 1; n <= 1200; n++) state = f.reduce(state, estimate(n));
  for (let n = 1199; n >= 0; n--) {
    state = f.reduce(state, { type: UNDO_TYPE });
    expect(state.data.nodes[f.id].estimate).toBe(n);
  }
  for (let n = 1; n <= 1200; n++) {
    state = f.reduce(state, { type: REDO_TYPE });
    expect(state.data.nodes[f.id].estimate).toBe(n);
  }
});

test("real task edits replay data and swapped caches together", () => {
  const initial = emptyStateOf();
  const reduce = undoableOf(
    getRootReducer(
      initial,
      new BiGramPredictor<TNodeId>(0.9),
      new TriGramPredictor<TNodeId>(0.9),
      10,
    ),
    initial,
  );
  const snapshots = [initial];
  let state = reduce(
    initial,
    actions.add_action({ node_id: initial.data.root, show_mobile: false }),
  );
  snapshots.push(state);
  const id = Object.keys(state.data.queue)[0] as TNodeId;
  for (const action of [
    actions.set_text_action({ k: id, text: "task" }),
    actions.start_action({ node_id: id, is_concurrent: false }),
    actions.stop_action(id),
    actions.toggle_show_children(initial.data.root),
    actions.add_action({ node_id: id, show_mobile: false }),
    actions.toggle_show_children(initial.data.root),
  ]) {
    const next = reduce(state, action);
    if (next !== state) snapshots.push(next);
    state = next;
  }
  for (const expected of snapshots.slice(0, -1).reverse()) {
    state = reduce(state, { type: UNDO_TYPE });
    expect(state).toEqual(expected);
  }
  for (const expected of snapshots.slice(1)) {
    state = reduce(state, { type: REDO_TYPE });
    expect(state).toEqual(expected);
  }
});

test("reducers that return a replacement state can still undo and redo", () => {
  const initial = emptyStateOf();
  const reduce = undoableOf(
    (state, action) =>
      estimate.match(action)
        ? { ...state, predicted_next_nodes: [initial.data.root] }
        : state,
    initial,
  );
  const next = reduce(initial, estimate(1));
  expect(next.predicted_next_nodes).toEqual([initial.data.root]);
  expect(initial.predicted_next_nodes).toEqual([]);
  const previous = reduce(next, { type: UNDO_TYPE });
  expect(previous).toEqual(initial);
  expect(reduce(previous, { type: REDO_TYPE })).toEqual(next);
});
