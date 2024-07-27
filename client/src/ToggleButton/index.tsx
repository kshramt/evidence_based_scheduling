import * as React from "react";

import * as utils from "src/utils";

const toggle = (x: boolean) => {
  return !x;
};

const ToggleButton = (props: {
  setValue: (fn: (prev: boolean) => boolean) => void;
  value: boolean;
  titleOnTrue: string;
  titleOnFalse: string;
}) => {
  const setValue = props.setValue;
  const onClick = () => {
    setValue(toggle);
  };
  return (
    <button
      className="btn-icon"
      onClick={onClick}
      onDoubleClick={utils.prevent_propagation}
    >
      {props.value ? props.titleOnTrue : props.titleOnFalse}
    </button>
  );
};

export default ToggleButton;
