import { configureStore, type UnknownAction } from "@reduxjs/toolkit";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { expect, test } from "vitest";

import { set_text_action } from "./actions";
import { emptyStateOf } from "./ops";
import { TextArea } from "./TextArea";
import type { TState } from "./types";

test("leaving a task editor saves only a change to its text", () => {
  const state = emptyStateOf();
  const nodeId = state.data.root;
  const saves: ReturnType<typeof set_text_action>["payload"][] = [];
  const store = configureStore({
    reducer: (current: TState = state, action: UnknownAction): TState => {
      if (set_text_action.match(action)) saves.push(action.payload);
      return current;
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        <Provider store={store}>
          <TextArea node_id={nodeId} className="" />
        </Provider>,
      ),
    );
    const field = host.querySelector("textarea");
    if (!field) throw new Error("Expected the task editor");

    field.focus();
    expect(document.activeElement).toBe(field);
    field.blur();
    expect(saves).toEqual([]);

    field.focus();
    const editedText = `${field.value} edited`;
    field.value = editedText;
    field.blur();
    expect(saves).toEqual([{ k: nodeId, text: editedText }]);
  } finally {
    root.unmount();
    host.remove();
  }
});
