import { configureStore, createAction } from "@reduxjs/toolkit";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Provider, useSelector } from "react-redux";
import { expect, test, vi } from "vitest";

test("an unchanged selection caches the latest Redux snapshot", () => {
  const setRevision = createAction<number>("test/setRevision");
  const setSelection = createAction<string>("test/setSelection");
  const initialState = { revision: 0, selection: "initial" };
  type State = typeof initialState;
  const store = configureStore({
    reducer: (state: State = initialState, action): State => {
      if (setRevision.match(action)) {
        return { ...state, revision: action.payload };
      }
      if (setSelection.match(action)) {
        return { ...state, selection: action.payload };
      }
      return state;
    },
  });
  const select = vi.fn((state: State) => state.selection);
  function Selection() {
    return <span>{useSelector(select)}</span>;
  }

  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    flushSync(() => {
      root.render(
        <Provider stabilityCheck="never" store={store}>
          <Selection />
        </Provider>,
      );
    });
    select.mockClear();
    flushSync(() => {
      store.dispatch(setRevision(1));
    });
    expect(select).toHaveBeenCalledWith(store.getState());
    const callsAfterRevision = select.mock.calls.length;

    flushSync(() => {
      store.dispatch({ type: "test/noop" });
    });
    expect(select).toHaveBeenCalledTimes(callsAfterRevision);
    expect(container.textContent).toBe("initial");

    flushSync(() => {
      store.dispatch(setSelection("updated"));
    });
    expect(container.textContent).toBe("updated");
  } finally {
    root.unmount();
    container.remove();
  }
});
