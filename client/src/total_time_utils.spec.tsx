import { configureStore } from "@reduxjs/toolkit";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { afterEach, expect, test, vi } from "vitest";

import { TotalTime } from "./TotalTime";
import { emptyStateOf } from "./ops";
import * as T from "./total_time_utils";
import type { AppDispatch, TNodeId } from "./types";

afterEach(() => {
  vi.unstubAllGlobals();
  T.visible_node_ids._map.clear();
  T.updated_vids.clear();
  T.affected_vids.clear();
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

test("removing a visible total releases its target and ignores queued entries", () => {
  const observer = mockObserver();
  const dispatch = vi.fn<AppDispatch>();
  const nodeId = "a" as TNodeId;
  const target = document.createElement("span");
  const dispose = T.observe_of(dispatch)(target, nodeId);
  observer.emit(target, true);
  expect(T.visible_node_ids.has(nodeId)).toBe(true);
  expect(dispatch).toHaveBeenLastCalledWith(
    T.set_total_time_action({ node_ids: [nodeId] }),
  );

  dispose();
  expect(observer.unobserve).toHaveBeenCalledWith(target);
  expect(T.visible_node_ids.has(nodeId)).toBe(false);
  dispatch.mockClear();
  observer.emit(target, true);
  observer.emit(target, false);
  dispose();
  expect(dispatch).not.toHaveBeenCalled();
  expect(observer.unobserve).toHaveBeenCalledTimes(1);
  expect(T.visible_node_ids.has(nodeId)).toBe(false);
});

test("visibility stays balanced for repeated entries and multiple task copies", () => {
  const observer = mockObserver();
  const dispatch = vi.fn<AppDispatch>();
  const observe = T.observe_of(dispatch);
  const nodeId = "a" as TNodeId;
  const tree = document.createElement("span");
  const queue = document.createElement("span");
  const disposeTree = observe(tree, nodeId);
  const disposeQueue = observe(queue, nodeId);
  observer.emit(tree, true);
  observer.emit(tree, true);
  observer.emit(queue, true);
  observer.emit(tree, false);
  observer.emit(tree, false);
  disposeTree();
  expect(T.visible_node_ids.has(nodeId)).toBe(true);
  disposeQueue();
  expect(T.visible_node_ids.has(nodeId)).toBe(false);
});

test("offscreen entries do not dispatch total-time updates", () => {
  const observer = mockObserver();
  const dispatch = vi.fn<AppDispatch>();
  const nodeId = "a" as TNodeId;
  const target = document.createElement("span");
  const dispose = T.observe_of(dispatch)(target, nodeId);
  observer.emit(target, false);
  expect(dispatch).not.toHaveBeenCalled();
  T.updated_vids.set(nodeId, 1);
  observer.emit(target, true);
  expect(dispatch).not.toHaveBeenCalled();
  T.affected_vids.set(nodeId, 2);
  observer.emit(target, false);
  observer.emit(target, true);
  expect(dispatch).toHaveBeenCalledExactlyOnceWith(
    T.set_total_time_action({ node_ids: [nodeId] }),
  );
  dispose();
});

test("task displays share an observer only within their own store", () => {
  mockObserver();
  const dispatch = vi.fn<AppDispatch>();
  const otherDispatch = vi.fn<AppDispatch>();
  const observe = T.observe_of(dispatch);
  expect(T.observe_of(dispatch)).toBe(observe);
  expect(T.observe_of(otherDispatch)).not.toBe(observe);
  expect(IntersectionObserver).toHaveBeenCalledTimes(2);
});

test("React releases total-time observations on row removal and task replacement", () => {
  const observer = mockObserver();
  const initial = emptyStateOf();
  const first = initial.data.root;
  const second = "a" as TNodeId;
  initial.swapped_caches.total_time = { [first]: 0, [second]: 0 };
  const store = configureStore({ reducer: () => initial });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const render = (nodeId: TNodeId) => {
    flushSync(() => {
      root.render(
        <Provider store={store}>
          <TotalTime node_id={nodeId} />
        </Provider>,
      );
    });
  };
  try {
    render(first);
    const span = host.querySelector("span");
    if (!span) throw new Error("Expected total-time display");
    observer.emit(span, true);
    expect(T.visible_node_ids.has(first)).toBe(true);
    render(second);
    expect(T.visible_node_ids.has(first)).toBe(false);
    expect(observer.unobserve).toHaveBeenCalledWith(span);
    observer.emit(span, true);
    expect(T.visible_node_ids.has(second)).toBe(true);
    flushSync(() => root.render(null));
    expect(T.visible_node_ids.has(second)).toBe(false);
    expect(observer.unobserve).toHaveBeenCalledTimes(2);
    for (let i = 0; i < 25; i++) {
      render(first);
      expect(observer.targets.size).toBe(1);
      const span = host.querySelector("span");
      if (!span) throw new Error("Expected total-time display");
      observer.emit(span, true);
      flushSync(() => root.render(null));
      expect(observer.targets.size).toBe(0);
      expect(T.visible_node_ids.has(first)).toBe(false);
    }
  } finally {
    root.unmount();
    host.remove();
  }
});
