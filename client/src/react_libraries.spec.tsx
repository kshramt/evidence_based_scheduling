import { MantineProvider, Switch, Textarea } from "@mantine/core";
import { configureStore, createSlice } from "@reduxjs/toolkit";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Provider, useSelector } from "react-redux";
import { expect, test } from "vitest";

const task = createSlice({
  name: "task",
  initialState: { text: "initial" },
  reducers: {
    rename: (state) => {
      state.text = "updated";
    },
  },
});

function TaskText() {
  const text = useSelector((state: { text: string }) => state.text);
  return <Textarea autosize readOnly value={text} />;
}

test("a Mantine task field displays Redux updates", () => {
  const store = configureStore({ reducer: task.reducer });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        <Provider store={store}>
          <MantineProvider>
            <TaskText />
          </MantineProvider>
        </Provider>,
      ),
    );
    expect(host.querySelector("textarea")?.value).toBe("initial");
    flushSync(() => {
      store.dispatch(task.actions.rename());
    });
    expect(host.querySelector("textarea")?.value).toBe("updated");
  } finally {
    root.unmount();
    host.remove();
  }
});

test("a Mantine task-view switch still toggles through its label", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        <MantineProvider>
          <Switch label="To Do" defaultChecked />
        </MantineProvider>,
      ),
    );
    const input = host.querySelector<HTMLInputElement>("input");
    const label = host.querySelector("label");
    expect(input?.checked).toBe(true);
    expect(label?.textContent).toBe("To Do");
    flushSync(() => label?.click());
    expect(input?.checked).toBe(false);
  } finally {
    root.unmount();
    host.remove();
  }
});
