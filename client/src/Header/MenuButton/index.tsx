import { Menu } from "@mantine/core";
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
  return (
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
        <LogoutButton logOut={props.logOut} />
      </Menu.Dropdown>
    </Menu>
  );
};

export default MenuButton;
