import * as React from "react";

import ToggleShowMobileButton from "./ToggleShowMobileButton";
import CheckRemoteButton from "./CheckRemoteButton";
import ExportIndexedDbButton from "./ExportIndexedDbButton";
import LogoutButton from "./LogoutButton";
import * as storage from "src/storage";
import { Menu } from "@mantine/core";

const MenuButton = React.memo(
  (props: {
    onClickCheckRemoteButton: () => void;
    db: Awaited<ReturnType<typeof storage.getDb>>;
    logOut: () => void;
  }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const menuButtonRef = React.useRef<HTMLButtonElement>(null);
    const menuListRef = React.useRef<HTMLDivElement>(null);

    const handleButtonClick = React.useCallback(() => {
      setIsOpen(!isOpen);
    }, [isOpen]);

    const handleClickOutside = React.useCallback(
      (event: globalThis.MouseEvent) => {
        if (
          menuButtonRef.current &&
          !menuButtonRef.current.contains(event.target as Node) &&
          menuListRef.current &&
          !menuListRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      },
      [setIsOpen],
    );

    React.useEffect(() => {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [handleClickOutside]);

    return (
      <Menu shadow="md" width={200} closeOnItemClick={false}>
        <Menu.Target>
          <button
            ref={menuButtonRef}
            onClick={handleButtonClick}
            className="btn-icon"
          >
            <span className="material-icons">menu</span>
          </button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item>
            <ToggleShowMobileButton />
          </Menu.Item>
          <Menu.Item>
            <CheckRemoteButton onClick={props.onClickCheckRemoteButton} />
          </Menu.Item>
          <Menu.Item>
            <ExportIndexedDbButton db={props.db} />
          </Menu.Item>
          <Menu.Item>
            <LogoutButton logOut={props.logOut} />
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
  },
);

export default MenuButton;
