import {
  configureStore,
  createAction,
  type UnknownAction,
} from "@reduxjs/toolkit";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { expect, test } from "vitest";

import { emptyStateOf } from "./ops";
import { QueueEntry } from "./QueueEntry";
import type { TNodeId, TState } from "./types";
import { useIsRunning } from "./utils";

function fixture() {
  const initial = emptyStateOf();
  const id = initial.data.root;
  const otherId = "other" as TNodeId;
  const statuses = initial.swapped_nodes.status;
  if (statuses === undefined) throw new Error("Expected task statuses");
  const reads = { ranges: 0, statuses: 0 };
  type Ranges = NonNullable<TState["swapped_nodes"]["ranges"]>;
  const setRanges = createAction<Ranges>("test/setRanges");
  const withRanges = (ranges: Ranges): TState => ({
    ...initial,
    swapped_nodes: {
      ...initial.swapped_nodes,
      get ranges() {
        reads.ranges++;
        return ranges;
      },
      get status() {
        reads.statuses++;
        return statuses;
      },
    },
  });
  const state = withRanges({ [id]: [], [otherId]: [] });
  const store = configureStore({
    reducer: (current: TState = state, action: UnknownAction) =>
      setRanges.match(action) ? withRanges(action.payload) : current,
    middleware: (getDefault) =>
      getDefault({ immutableCheck: false, serializableCheck: false }),
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  return {
    id,
    otherId,
    reads,
    store,
    host,
    root,
    setRanges,
    dispose() {
      root.unmount();
      host.remove();
    },
  };
}

function Running(props: { id: TNodeId | null; revision: number }) {
  const running = useIsRunning(props.id);
  return (
    <span>
      {running ? "running" : "stopped"}:{props.revision}
    </span>
  );
}

test("a parent render does not reread the running selector's unchanged snapshot", () => {
  const f = fixture();
  const render = (revision: number) => {
    flushSync(() =>
      f.root.render(
        <Provider store={f.store}>
          <Running id={f.id} revision={revision} />
        </Provider>,
      ),
    );
  };
  try {
    render(0);
    const reads = f.reads.ranges;
    expect(reads).toBeGreaterThan(0);
    render(1);
    expect(f.host.textContent).toBe("stopped:1");
    expect(f.reads.ranges).toBe(reads);
  } finally {
    f.dispose();
  }
});

test("the running selector follows timer updates, task replacement, and null", () => {
  const f = fixture();
  const render = (id: TNodeId | null) => {
    flushSync(() =>
      f.root.render(
        <Provider store={f.store}>
          <Running id={id} revision={0} />
        </Provider>,
      ),
    );
  };
  try {
    render(f.id);
    expect(f.host.textContent).toBe("stopped:0");
    flushSync(() => {
      f.store.dispatch(
        f.setRanges({ [f.id]: [{ start: 1, end: null }], [f.otherId]: [] }),
      );
    });
    expect(f.host.textContent).toBe("running:0");
    render(f.otherId);
    expect(f.host.textContent).toBe("stopped:0");
    render(null);
    expect(f.host.textContent).toBe("stopped:0");
    render(f.id);
    expect(f.host.textContent).toBe("running:0");
    flushSync(() => {
      f.store.dispatch(
        f.setRanges({ [f.id]: [{ start: 1, end: 2 }], [f.otherId]: [] }),
      );
    });
    expect(f.host.textContent).toBe("stopped:0");
  } finally {
    f.dispose();
  }
});

test("changing a queue row's index does not reread its unchanged status", () => {
  const f = fixture();
  const render = (index: number) => {
    flushSync(() =>
      f.root.render(
        <Provider store={f.store}>
          <QueueEntry node_id={f.id} index={index} />
        </Provider>,
      ),
    );
  };
  try {
    render(0);
    const reads = f.reads.statuses;
    expect(reads).toBeGreaterThan(0);
    render(1);
    expect(f.host.querySelector("span")?.textContent).toBe("1");
    expect(f.reads.statuses).toBe(reads);
  } finally {
    f.dispose();
  }
});
