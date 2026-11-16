import { MantineProvider, Textarea } from "@mantine/core";
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
