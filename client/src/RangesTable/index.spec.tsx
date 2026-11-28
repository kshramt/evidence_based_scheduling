import { configureStore, createAction } from "@reduxjs/toolkit";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { expect, test } from "vitest";

import { emptyStateOf } from "src/ops";
import type { TRange, TState } from "src/types";
import { getStringOfLocalTime } from "src/utils";
import RangesTable from ".";

test("time records stay visible when the offset is cleared or a page shrinks", () => {
  const initial = emptyStateOf();
  const id = initial.data.root;
  const records = Array.from({ length: 11 }, (_, index) => ({
    start: index * 2000 - 1000,
    end: index * 2000,
  }));
  const replaceRanges = createAction<TRange[]>("test/replaceRanges");
  const withRanges = (ranges: TRange[]): TState => ({
    ...initial,
    swapped_nodes: { ...initial.swapped_nodes, ranges: { [id]: ranges } },
  });
  const startingState = withRanges(records);
  const store = configureStore({
    reducer: (state: TState = startingState, action): TState =>
      replaceRanges.match(action) ? withRanges(action.payload) : state,
  });
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        <Provider store={store}>
          <RangesTable node_id={id} />
        </Provider>,
      ),
    );
    const input = host.querySelector<HTMLInputElement>('input[type="number"]');
    const previous = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Previous time records"]',
    );
    const next = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Next time records"]',
    );
    const valueProperty = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    );
    if (!input || !previous || !next || !valueProperty) {
      throw new Error("Expected time record pagination controls");
    }
    const rows = () => host.querySelectorAll("tbody tr").length;
    const enterOffset = (value: string) =>
      flushSync(() => {
        valueProperty.set?.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });

    expect(rows()).toBe(10);
    flushSync(() => next.click());
    expect(input.value).toBe("10");
    expect(rows()).toBe(1);
    const epochEnd = host.querySelector<HTMLInputElement>(
      'input[aria-label="Time record end"]',
    );
    expect(epochEnd?.value).toBe(getStringOfLocalTime(0).slice(0, 16));
    enterOffset("");
    expect(input.value).toBe("");
    expect(rows()).toBe(10);
    enterOffset("999");
    expect(input.value).toBe("10");

    flushSync(() => store.dispatch(replaceRanges(records.slice(1))));
    expect(input.value).toBe("9");
    expect(rows()).toBe(1);
    expect(previous.disabled).toBe(false);
    flushSync(() => previous.click());
    expect(input.value).toBe("0");
    expect(rows()).toBe(10);

    flushSync(() => store.dispatch(replaceRanges([])));
    expect(host.textContent).toContain("No time records");
    expect(host.querySelector('[aria-label="Time record offset"]')).toBeNull();
    expect(rows()).toBe(0);

    flushSync(() => store.dispatch(replaceRanges([{ start: 0, end: null }])));
    expect(rows()).toBe(1);
    expect(host.querySelector("tbody")?.textContent).toContain("Running");
    expect(
      host.querySelector('input[aria-label="Time record end"]'),
    ).toBeNull();
  } finally {
    root.unmount();
    host.remove();
  }
});
