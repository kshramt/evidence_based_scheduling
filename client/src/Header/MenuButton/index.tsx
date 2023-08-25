import * as React from "react";

import ToggleShowMobileButton from "./ToggleShowMobileButton";
import CheckRemoteButton from "./CheckRemoteButton";
import ExportIndexedDbButton from "./ExportIndexedDbButton";
import LogoutButton from "./LogoutButton";
import * as storage from "src/storage";

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
      <div>
        <button
          ref={menuButtonRef}
          onClick={handleButtonClick}
          className="btn-icon"
        >
          <span className="material-icons">menu</span>
        </button>
        {isOpen && (
          <div
            ref={menuListRef}
            className="absolute flex flex-col gap-[0.5em] bg-neutral-200 dark:bg-neutral-900 pr-[1em] pb-[1em]"
          >
            <div>
              <ToggleShowMobileButton />
            </div>
            <div>
              <CheckRemoteButton onClick={props.onClickCheckRemoteButton} />
            </div>
            <div>
              <ExportIndexedDbButton db={props.db} />
            </div>
            <div>
              <LogoutButton logOut={props.logOut} />
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default MenuButton;
