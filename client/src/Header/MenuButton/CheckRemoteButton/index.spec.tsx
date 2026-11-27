import { MantineProvider, Menu } from "@mantine/core";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import CheckRemoteButton from ".";

test("reports the result of a remote check and lets the user retry", async () => {
  const first = Promise.withResolvers<boolean>();
  const checkRemote = vi
    .fn<() => Promise<boolean>>()
    .mockReturnValueOnce(first.promise)
    .mockRejectedValueOnce(new Error("Network error"))
    .mockResolvedValueOnce(true);
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        <MantineProvider>
          <Menu defaultOpened closeOnItemClick={false}>
            <Menu.Target>
              <button>Menu</button>
            </Menu.Target>
            <Menu.Dropdown>
              <CheckRemoteButton onClick={checkRemote} />
            </Menu.Dropdown>
          </Menu>
        </MantineProvider>,
      ),
    );
    const button = document.querySelector<HTMLButtonElement>(
      'button[role="menuitem"]',
    );
    const status = document.querySelector('[role="status"]');
    const expectStatus = (message: string) =>
      vi.waitFor(() => expect(status?.textContent).toBe(message));
    expect(button).not.toBeNull();
    button?.click();
    await expectStatus("Checking remote…");
    expect(button?.disabled).toBe(true);

    first.resolve(false);
    await expectStatus("No remote changes.");

    button?.click();
    await expectStatus("Could not check remote. Try again.");

    button?.click();
    await expectStatus("Remote changes found.");
    expect(checkRemote).toHaveBeenCalledTimes(3);
  } finally {
    root.unmount();
    host.remove();
  }
});
