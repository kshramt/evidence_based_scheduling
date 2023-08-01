import * as React from "react";

import * as storage from "src/storage";
import Component from "./Component";

const MenuButton = React.memo(
  (props: {
    onClickCheckRemoteButton: () => void;
    db: Awaited<ReturnType<typeof storage.getDb>>;
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
      <Component
        menuButtonRef={menuButtonRef}
        menuListRef={menuListRef}
        isOpen={isOpen}
        handleButtonClick={handleButtonClick}
        onClickCheckRemoteButton={props.onClickCheckRemoteButton}
        db={props.db}
      />
    );
  },
);

export default MenuButton;
