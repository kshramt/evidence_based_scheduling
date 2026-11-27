import {
  configureStore,
  createAction,
  type UnknownAction,
} from "@reduxjs/toolkit";
import { produce } from "immer";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { afterEach, expect, test, vi } from "vitest";

import { TotalTime } from "./TotalTime";
import { emptyStateOf } from "./ops";
import { swapKeys } from "./swapper";
import { invalidatePredictionTotals, setTotalTime } from "./total_time_utils";
import { totalTimeViewOf } from "./total_time_view";
import type { TEdgeId, TNodeId, TState } from "./types";
import {
  REDO_TYPE,
  UNDO_TYPE,
  register_history_type,
  undoableOf,
} from "./undoable";

afterEach(() => {
  vi.unstubAllGlobals();
  invalidatePredictionTotals();
});

function mockObserver() {
  const targets = new Set<Element>();
  const observer = {
    root: null,
    rootMargin: "0px",
    thresholds: [0],
    observe: vi.fn((target: Element) => {
      targets.add(target);
    }),
    unobserve: vi.fn((target: Element) => {
      targets.delete(target);
    }),
    disconnect: vi.fn(),
    takeRecords: () => [],
  };
  let notify: IntersectionObserverCallback = () => {};
  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn(function (callback: IntersectionObserverCallback) {
      notify = callback;
      return observer;
    }),
  );
  return {
    ...observer,
    targets,
    emit(target: Element, isIntersecting: boolean) {
      notify(
        [{ target, isIntersecting } as IntersectionObserverEntry],
        observer,
      );
    },
  };
}

const child = "1" as TNodeId;
const edge = "2" as TEdgeId;

function withRanges(end: number, edgeType: "strong" | "weak" = "strong") {
  const state = emptyStateOf();
  const root = state.data.root;
  const parent = state.data.nodes[root];
  const nodes: TState["data"]["nodes"] = {
    [root]: {
      ...parent,
      children: { [edge]: 0 },
      ranges: [{ start: 0, end: 10 }],
    },
    [child]: {
      ...parent,
      children: {},
      parents: { [edge]: 0 },
      ranges: [{ start: 5, end }],
    },
  };
  const edges: TState["data"]["edges"] = {
    [edge]: { p: root, c: child, t: edgeType },
  };
  return {
    ...state,
    data: { ...state.data, nodes, edges },
    swapped_nodes: swapKeys(nodes),
    swapped_edges: swapKeys(edges),
  };
}

function fixture(initial = withRanges(30)) {
  const replace = register_history_type(createAction<TState>("test/replace"));
  const store = configureStore({
    reducer: undoableOf(
      (state: TState, action: UnknownAction): TState =>
        replace.match(action) ? action.payload : state,
      initial,
    ),
  });
  return {
    store,
    replace,
    root: initial.data.root,
    view: totalTimeViewOf(store),
  };
}

test("visibility only notifies displays of the same task and releases removed targets", () => {
  const observer = mockObserver();
  const { store, root, view } = fixture();
  const storeListener = vi.fn();
  const rootListener = vi.fn();
  const childListener = vi.fn();
  const otherCopyListener = vi.fn();
  const dropStoreListener = store.subscribe(storeListener);
  const dropRoot = view.subscribe(root, rootListener);
  const dropChild = view.subscribe(child, childListener);
  const dropOtherCopy = view.subscribe(root, otherCopyListener);
  const element = document.createElement("span");
  const stop = view.observe(element, root);

  observer.emit(element, true);
  observer.emit(element, true);
  expect(view.get(root)).toBe(30);
  expect(rootListener).toHaveBeenCalledTimes(1);
  expect(otherCopyListener).toHaveBeenCalledTimes(1);
  expect(childListener).not.toHaveBeenCalled();
  expect(storeListener).not.toHaveBeenCalled();
  stop();
  observer.emit(element, false);
  observer.emit(element, true);
  stop();
  expect(rootListener).toHaveBeenCalledTimes(1);
  expect(observer.unobserve).toHaveBeenCalledExactlyOnceWith(element);
  dropRoot();
  dropChild();
  dropOtherCopy();
  dropStoreListener();
  expect(view.get(root)).toBe(-1);
});

test("visible copies update once after range changes and undo or redo", () => {
  const observer = mockObserver();
  const first = withRanges(30);
  const { store, replace, root, view } = fixture(first);
  const notify = vi.fn();
  const stopListening = view.subscribe(root, notify);
  const tree = document.createElement("span");
  const queue = document.createElement("span");
  const stopTree = view.observe(tree, root);
  const stopQueue = view.observe(queue, root);
  observer.emit(tree, true);
  observer.emit(queue, true);
  expect(notify).toHaveBeenCalledTimes(1);

  stopTree();
  store.dispatch(replace(withRanges(40)));
  expect(view.get(root)).toBe(40);
  expect(notify).toHaveBeenCalledTimes(2);
  store.dispatch(replace(withRanges(40, "weak")));
  expect(view.get(root)).toBe(10);
  store.dispatch({ type: UNDO_TYPE });
  expect(view.get(root)).toBe(40);
  store.dispatch({ type: REDO_TYPE });
  expect(view.get(root)).toBe(10);

  observer.emit(queue, false);
  notify.mockClear();
  store.dispatch(replace(withRanges(50)));
  expect(notify).not.toHaveBeenCalled();
  observer.emit(queue, true);
  expect(view.get(root)).toBe(50);
  expect(notify).toHaveBeenCalledTimes(1);
  stopQueue();
  stopListening();
});

test("shares one source subscription and keeps different stores independent", () => {
  const observer = mockObserver();
  const first = fixture();
  const second = fixture(withRanges(60));
  const stop = vi.fn();
  const source = {
    getState: () => first.store.getState(),
    subscribe: vi.fn(() => stop),
  };
  const view = totalTimeViewOf(source);
  expect(totalTimeViewOf(source)).toBe(view);
  const element = document.createElement("span");
  const stopFirst = view.observe(element, first.root);
  const stopSecond = view.observe(document.createElement("span"), first.root);
  expect(source.subscribe).toHaveBeenCalledTimes(1);
  observer.emit(element, true);
  expect(view.get(first.root)).toBe(30);
  const otherElement = document.createElement("span");
  const stopOther = second.view.observe(otherElement, second.root);
  observer.emit(otherElement, true);
  expect(second.view.get(second.root)).toBe(60);
  expect(view.get(first.root)).toBe(30);
  stopFirst();
  expect(stop).not.toHaveBeenCalled();
  stopSecond();
  expect(stop).toHaveBeenCalledTimes(1);
  stopOther();
});

test("prediction refreshes a cached total after history invalidation", () => {
  const first = withRanges(30);
  const nodeId = first.data.root;
  const cached = produce(first, (draft) => {
    setTotalTime(draft, nodeId, 1);
  });
  expect(cached.caches[nodeId].total_time).toBe(30);

  const restored = { ...withRanges(50), caches: cached.caches };
  invalidatePredictionTotals();
  const refreshed = produce(restored, (draft) => {
    setTotalTime(draft, nodeId, 2);
  });
  expect(refreshed.caches[nodeId].total_time).toBe(50);
});

test("React releases total-time observations on row removal and task replacement", () => {
  const observer = mockObserver();
  const { root: nodeId, store, replace } = fixture(withRanges(3_600_000));
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const render = (node: TNodeId) => {
    flushSync(() => {
      root.render(
        <Provider store={store}>
          <TotalTime node_id={node} />
        </Provider>,
      );
    });
  };
  try {
    render(nodeId);
    const span = host.querySelector("span");
    if (!span) throw new Error("Expected total-time display");
    expect(span.textContent).toBe("-");
    flushSync(() => observer.emit(span, true));
    expect(span.textContent).toBe("1");
    flushSync(() => {
      store.dispatch(replace(withRanges(7_200_000)));
    });
    expect(span.textContent).toBe("2");
    render(child);
    expect(observer.unobserve).toHaveBeenCalledWith(span);
    observer.emit(span, true);
    flushSync(() => root.render(null));
    expect(observer.unobserve).toHaveBeenCalledTimes(2);

    for (let i = 0; i < 25; i++) {
      render(nodeId);
      expect(observer.targets.size).toBe(1);
      const span = host.querySelector("span");
      if (!span) throw new Error("Expected total-time display");
      observer.emit(span, true);
      flushSync(() => root.render(null));
      expect(observer.targets.size).toBe(0);
    }
  } finally {
    root.unmount();
    host.remove();
  }
});
