import React from "react";

const Default = (props: { className?: string; children?: React.ReactNode }) => {
  const ref = React.useRef<HTMLButtonElement>(null);
  const onClick = React.useCallback(() => {
    ref.current?.parentElement?.scroll({ top: 0 });
  }, []);
  return (
    <button onClick={onClick} ref={ref} className={props.className}>
      {props.children}
    </button>
  );
};

export default Default;
