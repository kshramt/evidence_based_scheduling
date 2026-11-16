import { useEffect } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

function Observe({
  value,
  onChange,
}: {
  value: { name: string };
  onChange: (value: { name: string }) => void;
}) {
  useEffect(() => onChange(value), [value, onChange]);
  return null;
}

function Compiled({
  name,
  renderNumber,
  onChange,
}: {
  name: string;
  renderNumber: number;
  onChange: (value: { name: string }) => void;
}) {
  return (
    <>
      <span>{renderNumber}</span>
      <Observe value={{ name }} onChange={onChange} />
    </>
  );
}

test("the compiler reuses derived props across unrelated updates", () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  const onChange = vi.fn();
  try {
    flushSync(() =>
      root.render(
        <Compiled name="first" renderNumber={1} onChange={onChange} />,
      ),
    );
    flushSync(() =>
      root.render(
        <Compiled name="first" renderNumber={2} onChange={onChange} />,
      ),
    );
    expect(host.textContent).toBe("2");
    expect(onChange.mock.calls).toEqual([[{ name: "first" }]]);

    flushSync(() =>
      root.render(
        <Compiled name="second" renderNumber={3} onChange={onChange} />,
      ),
    );
    expect(onChange.mock.calls).toEqual([
      [{ name: "first" }],
      [{ name: "second" }],
    ]);
  } finally {
    root.unmount();
  }
});
