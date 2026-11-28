import { Menu, Modal } from "@mantine/core";
import { useState } from "react";
import type * as storage from "src/storage";

import ToggleShowMobileButton from "./ToggleShowMobileButton";
import CheckRemoteButton from "./CheckRemoteButton";
import ExportIndexedDbButton from "./ExportIndexedDbButton";
import ExportStateButton from "./ExportStateButton";
import LogoutButton from "./LogoutButton";

const MenuButton = (props: {
  onClickCheckRemoteButton: () => Promise<boolean>;
  db: Awaited<ReturnType<typeof storage.getDb>>;
  logOut: () => void;
}) => {
  const [showShortcuts, setShowShortcuts] = useState(false);
  return (
    <>
      <Menu shadow="md" width={200} closeOnItemClick={false} keepMounted>
        <Menu.Target>
          <button type="button" aria-label="App menu" className="btn-icon">
            <span className="material-icons" aria-hidden="true">
              menu
            </span>
          </button>
        </Menu.Target>

        <Menu.Dropdown>
          <ToggleShowMobileButton />
          <CheckRemoteButton onClick={props.onClickCheckRemoteButton} />
          <ExportStateButton />
          <ExportIndexedDbButton db={props.db} />
          <Menu.Item closeMenuOnClick onClick={() => setShowShortcuts(true)}>
            Keyboard shortcuts
          </Menu.Item>
          <LogoutButton logOut={props.logOut} />
        </Menu.Dropdown>
      </Menu>
      <Modal
        opened={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        title="Keyboard shortcuts"
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt>
            <kbd>Cmd + K</kbd>
          </dt>
          <dd>Focus desktop task search</dd>
          <dt>
            <kbd>Esc</kbd>
          </dt>
          <dd>Clear task search</dd>
          <dt>
            <kbd>Enter</kbd>
          </dt>
          <dd>Open the first matching to-do from desktop search</dd>
          <dt>
            <kbd>Ctrl / Cmd + Enter</kbd>
          </dt>
          <dd>Add a child task from a task editor</dd>
          <dt>
            <kbd>Ctrl / Cmd + .</kbd>
          </dt>
          <dd>Start a task or stop all running timers</dd>
          <dt>
            <kbd>Ctrl / Cmd + Shift + .</kbd>
          </dt>
          <dd>Start a task concurrently or stop just that task</dd>
        </dl>
      </Modal>
    </>
  );
};

export default MenuButton;
