import { MantineProvider } from "@mantine/core";
import { configureStore, createAction } from "@reduxjs/toolkit";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { expect, test } from "vitest";

import { emptyStateOf } from "src/ops";
import type { TState, TStatus } from "src/types";
import { component } from ".";

test("the task drawer shows saved dates, status and labelled sections", async () => {
  const initial = emptyStateOf();
  const id = initial.data.root;
  const title = "A task whose title is longer than thirty characters";
  const created = Date.UTC(1969, 11, 31, 23, 59, 59);
  const withStatus = (status: TStatus, end: number | null): TState => ({
    ...initial,
    drawerStack: [id],
    swapped_caches: { ...initial.swapped_caches, text: { [id]: title } },
    swapped_nodes: {
      ...initial.swapped_nodes,
      start_time: { [id]: created },
      status: { [id]: status },
      end_time: { [id]: end },
    },
  });
  const setStatus = createAction<TStatus>("test/setStatus");
  const store = configureStore({
    reducer: (state: TState = withStatus("todo", null), action): TState =>
      setStatus.match(action) ? withStatus(action.payload, 0) : state,
  });
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        <Provider store={store}>
          <MantineProvider>{component}</MantineProvider>
        </Provider>,
      ),
    );
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) throw new Error("Expected the task drawer");
    await expect
      .poll(() => {
        const titleId = dialog.getAttribute("aria-labelledby");
        return titleId && document.getElementById(titleId)?.textContent;
      })
      .toBe(title);

    const summary = () =>
      [...dialog.querySelectorAll("dl > *")].map((item) => item.textContent);
    const times = () =>
      [...dialog.querySelectorAll("time")].map((item) => item.dateTime);
    expect(summary().slice(0, 3)).toEqual(["Status", "To do", "Created"]);
    expect(times()).toEqual(["1969-12-31T23:59:59.000Z"]);
    expect(dialog.querySelector("time")?.textContent).toBe(
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "long",
      }).format(created),
    );
    const sections = [...dialog.querySelectorAll("section")].map(
      (section) => section.querySelector("h2")?.textContent,
    );
    expect(sections).toEqual([
      "Dependencies",
      "Time records",
      "Planned events",
    ]);
    for (const text of [
      "No parent tasks",
      "No child tasks",
      "No time records",
    ]) {
      expect(dialog.textContent).toContain(text);
    }
    expect(
      dialog.querySelector('[aria-label="Close task details"]'),
    ).not.toBeNull();

    flushSync(() => store.dispatch(setStatus("done")));
    expect(summary()).toContain("Done");
    expect(summary()).toContain("Completed");
    expect(times()).toEqual([
      "1969-12-31T23:59:59.000Z",
      "1970-01-01T00:00:00.000Z",
    ]);
    flushSync(() => store.dispatch(setStatus("dont")));
    expect(summary()).toContain("Won't do");
    expect(summary()).toContain("Closed");
  } finally {
    root.unmount();
    host.remove();
  }
});
