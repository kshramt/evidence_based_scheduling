import { createContext, use, version } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";

test("stable React renders a context provider with the React 19 API", () => {
  expect(version).toMatch(/^19\.\d+\.\d+$/);
  const Message = createContext("default");
  function Resource() {
    return <span>{use(Message)}</span>;
  }
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        <Message value="ready">
          <Resource />
        </Message>,
      ),
    );
    expect(host.textContent).toBe("ready");
  } finally {
    root.unmount();
  }
});
