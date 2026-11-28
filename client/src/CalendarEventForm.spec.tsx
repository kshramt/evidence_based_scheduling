import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import CalendarEventForm from "./CalendarEventForm";
import type { TEvent } from "./types";

test("cleared event dates stay blank and block saving an existing event", () => {
  const start = Date.UTC(2026, 4, 4, 12);
  const onSubmit = vi.fn<(event: TEvent) => void>();
  const event: TEvent = {
    status: [start],
    interval_set: {
      start: { f: start },
      end: { f: start + 60_000 },
      delta: 86_400_000,
      limit: { f: start + 86_400_000 },
    },
  };
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        <CalendarEventForm
          event={event}
          onSubmit={onSubmit}
          onDelete={() => {}}
        />,
      ),
    );
    flushSync(() => host.querySelector("button")?.click());
    const startInput = host.querySelector<HTMLInputElement>(
      'input[aria-label="Event start"]',
    );
    const untilInput = host.querySelector<HTMLInputElement>(
      'input[aria-label="Repeat until"]',
    );
    const save = host.querySelector<HTMLButtonElement>("button");
    const nativeValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    );
    if (!startInput || !untilInput || !save || !nativeValue) {
      throw new Error("Missing event fields");
    }
    const enter = (input: HTMLInputElement, value: string) =>
      flushSync(() => {
        nativeValue.set?.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    const originalStart = startInput.value;
    const originalUntil = untilInput.value;
    enter(startInput, "");
    expect(startInput.value).toBe("");
    expect(save.disabled).toBe(true);
    save.click();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(event.interval_set.start).toEqual({ f: start });

    enter(untilInput, "");
    enter(startInput, originalStart);
    expect(untilInput.value).toBe("");
    expect(save.disabled).toBe(true);
    enter(untilInput, originalUntil);
    expect(save.disabled).toBe(false);
    flushSync(() => save.click());
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(event);
  } finally {
    root.unmount();
    host.remove();
  }
});
