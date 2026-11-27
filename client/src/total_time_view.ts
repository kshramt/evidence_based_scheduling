import type { Store } from "@reduxjs/toolkit";

import { totalTimeOf } from "./total_time_utils";
import type { TNodeId, TState } from "./types";

type Source = Pick<Store<TState>, "getState" | "subscribe">;
type Listener = () => void;
type Entry = {
  value: number;
  revision: number;
  listeners: Set<Listener>;
};
type Observation = {
  nodeId: TNodeId;
  visible: boolean;
  dispose: () => void;
};

const graphInputsOf = (state: TState) =>
  [
    state.swapped_nodes.children,
    state.swapped_nodes.ranges,
    state.swapped_edges.c,
    state.swapped_edges.t,
  ] as const;

class TotalTimeView {
  #entries = new Map<TNodeId, Entry>();
  #visible = new Map<TNodeId, number>();
  #targets = new WeakMap<Element, Observation>();
  #observer: IntersectionObserver | undefined;
  #observed = 0;
  #unsubscribe: (() => void) | undefined;
  #inputs: ReturnType<typeof graphInputsOf> | undefined;
  #revision = 0;

  constructor(private readonly source: Source) {}

  get = (nodeId: TNodeId) => this.#entries.get(nodeId)?.value ?? -1;

  subscribe = (nodeId: TNodeId, listener: Listener) => {
    const entry = this.#entryOf(nodeId);
    entry.listeners.add(listener);
    return () => {
      entry.listeners.delete(listener);
      this.#release(nodeId, entry);
    };
  };

  observe = (element: Element, nodeId: TNodeId) => {
    this.#targets.get(element)?.dispose();
    const observation: Observation = {
      nodeId,
      visible: false,
      dispose: () => {
        if (this.#targets.get(element) !== observation) return;
        this.#observer?.unobserve(element);
        this.#targets.delete(element);
        if (observation.visible) this.#leave(nodeId);
        if (--this.#observed === 0) {
          this.#unsubscribe?.();
          this.#unsubscribe = undefined;
          this.#inputs = undefined;
        }
      },
    };
    this.#observer ??= new IntersectionObserver(this.#onIntersect);
    this.#unsubscribe ??= this.source.subscribe(this.#refresh);
    this.#targets.set(element, observation);
    this.#observed++;
    this.#observer.observe(element);
    return observation.dispose;
  };

  #onIntersect: IntersectionObserverCallback = (entries) => {
    const entered = new Set<TNodeId>();
    for (const { target, isIntersecting } of entries) {
      const observation = this.#targets.get(target);
      if (!observation || observation.visible === isIntersecting) continue;
      const { nodeId } = observation;
      observation.visible = isIntersecting;
      if (isIntersecting) {
        this.#visible.set(nodeId, (this.#visible.get(nodeId) ?? 0) + 1);
        entered.add(nodeId);
      } else {
        this.#leave(nodeId);
        if (!this.#visible.has(nodeId)) entered.delete(nodeId);
      }
    }
    if (entered.size > 0) this.#refresh(entered);
  };

  #refresh = (entered?: Iterable<TNodeId>) => {
    const state = this.source.getState();
    const inputs = graphInputsOf(state);
    const changed = inputs.some(
      (input, index) => input !== this.#inputs?.[index],
    );
    if (changed) {
      this.#inputs = inputs;
      this.#revision++;
    }
    const nodes = changed ? this.#visible.keys() : entered;
    if (!nodes) return;
    const updated: Entry[] = [];
    for (const nodeId of nodes) {
      const entry = this.#entryOf(nodeId);
      if (entry.revision === this.#revision) continue;
      entry.revision = this.#revision;
      const value = Object.hasOwn(state.data.nodes, nodeId)
        ? totalTimeOf(state, nodeId)
        : -1;
      if (entry.value !== value) {
        entry.value = value;
        updated.push(entry);
      }
    }
    for (const entry of updated) {
      for (const listener of entry.listeners) listener();
    }
  };

  #entryOf(nodeId: TNodeId) {
    let entry = this.#entries.get(nodeId);
    if (!entry) {
      entry = { value: -1, revision: -1, listeners: new Set() };
      this.#entries.set(nodeId, entry);
    }
    return entry;
  }

  #leave(nodeId: TNodeId) {
    const count = this.#visible.get(nodeId) ?? 0;
    if (count > 1) {
      this.#visible.set(nodeId, count - 1);
      return;
    }
    this.#visible.delete(nodeId);
    const entry = this.#entries.get(nodeId);
    if (entry) this.#release(nodeId, entry);
  }

  #release(nodeId: TNodeId, entry: Entry) {
    if (
      !entry.listeners.size &&
      !this.#visible.has(nodeId) &&
      this.#entries.get(nodeId) === entry
    ) {
      this.#entries.delete(nodeId);
    }
  }
}

const views = new WeakMap<Source, TotalTimeView>();

export function totalTimeViewOf(source: Source) {
  let view = views.get(source);
  if (!view) {
    view = new TotalTimeView(source);
    views.set(source, view);
  }
  return view;
}
