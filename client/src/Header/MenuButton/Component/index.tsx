import React from "react";

import * as storage from "src/storage";
import ToggleShowMobileButton from "./ToggleShowMobileButton";
import CheckRemoteButton from "./CheckRemoteButton";
import ExportIndexedDbButton from "./ExportIndexedDbButton";
import LogoutButton from "./LogoutButton";

const MenuButton = React.memo(
  (props: {
    menuButtonRef: React.RefObject<HTMLButtonElement>;
    menuListRef: React.RefObject<HTMLDivElement>;
    isOpen: boolean;
    handleButtonClick: () => void;
    onClickCheckRemoteButton: () => void;
    db: Awaited<ReturnType<typeof storage.getDb>>;
    logOut: () => void;
  }) => {
    return (
      <div>
        <button
          ref={props.menuButtonRef}
          onClick={props.handleButtonClick}
          className="btn-icon"
        >
          <span className="material-icons">menu</span>
        </button>
        {props.isOpen && (
          <div ref={props.menuListRef} className="absolute z-10">
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
