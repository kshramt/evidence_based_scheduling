import React, { useState, useRef, useEffect } from "react";

const MenuButton = (props: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuListRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  return (
    <div className="relative">
      <button
        ref={menuButtonRef}
        onClick={handleButtonClick}
        className="btn-icon"
      >
        <span className="material-icons">menu</span>
      </button>
      {isOpen && (
        <div ref={menuListRef} className="fixed">
          {props.children}
        </div>
      )}
    </div>
  );
};

export default MenuButton;
