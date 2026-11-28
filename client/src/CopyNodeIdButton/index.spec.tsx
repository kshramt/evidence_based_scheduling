import { notifications } from "@mantine/notifications";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { emptyStateOf } from "src/ops";
import CopyNodeIdButton from ".";

test("reports an unavailable or denied clipboard and lets users retry", async () => {
  const id = emptyStateOf().data.root;
  const native = navigator.clipboard;
  const getClipboard = vi
    .spyOn(navigator, "clipboard", "get")
    .mockReturnValueOnce(undefined as unknown as Clipboard);
  const write = vi
    .spyOn(native, "writeText")
    .mockRejectedValueOnce(new Error("Permission denied"))
    .mockResolvedValueOnce(undefined);
  const show = vi.spyOn(notifications, "show").mockReturnValue("");
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<CopyNodeIdButton node_id={id} />));
    const button = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Copy task ID"]',
    );
    if (!button) throw new Error("Missing copy button");
    button.click();
    await vi.waitFor(() => expect(show).toHaveBeenCalledTimes(1));
    expect(write).not.toHaveBeenCalled();
    expect(show).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: "Could not copy to the clipboard." }),
    );

    button.click();
    await vi.waitFor(() => expect(show).toHaveBeenCalledTimes(2));
    expect(write).toHaveBeenCalledWith(id);

    button.click();
    await vi.waitFor(() => expect(button.textContent).toBe("done"));
    expect(show).toHaveBeenCalledTimes(2);
  } finally {
    root.unmount();
    host.remove();
    show.mockRestore();
    write.mockRestore();
    getClipboard.mockRestore();
  }
});
