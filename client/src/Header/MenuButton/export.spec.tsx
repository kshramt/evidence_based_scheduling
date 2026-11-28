import { MantineProvider, Menu } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { configureStore } from "@reduxjs/toolkit";
import { deleteDB } from "idb";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { expect, test, vi } from "vitest";
import { emptyStateOf } from "src/ops";
import { getDb } from "src/storage";

import ExportIndexedDbButton from "./ExportIndexedDbButton";
import ExportStateButton from "./ExportStateButton";

test("reports export failures and restores the IndexedDB export action", async () => {
  const name = "export-menu-test";
  const db = await getDb(name);
  db.close();
  const initial = emptyStateOf();
  const store = configureStore({ reducer: () => initial });
  const show = vi.spyOn(notifications, "show").mockImplementation(() => "");
  const createObjectURL = vi
    .spyOn(URL, "createObjectURL")
    .mockImplementationOnce(() => {
      throw new Error("Could not create a download URL");
    });
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);

  try {
    flushSync(() =>
      root.render(
        <Provider store={store}>
          <MantineProvider>
            <Menu defaultOpened closeOnItemClick={false}>
              <Menu.Target>
                <button>Menu</button>
              </Menu.Target>
              <Menu.Dropdown>
                <ExportStateButton />
                <ExportIndexedDbButton db={db} />
              </Menu.Dropdown>
            </Menu>
          </MantineProvider>
        </Provider>,
      ),
    );
    const [state, indexedDb] = document.querySelectorAll<HTMLButtonElement>(
      'button[role="menuitem"]',
    );
    expect(state?.textContent).toBe("Export state");
    expect(indexedDb?.textContent).toBe("Export IndexedDB");

    state.click();
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Could not export state. Try again." }),
    );

    indexedDb.click();
    await vi.waitFor(() => {
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Could not export IndexedDB. Try again.",
        }),
      );
      expect(indexedDb.disabled).toBe(false);
      expect(indexedDb.textContent).toBe("Export IndexedDB");
    });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  } finally {
    root.unmount();
    host.remove();
    show.mockRestore();
    createObjectURL.mockRestore();
    await deleteDB(name);
  }
});
