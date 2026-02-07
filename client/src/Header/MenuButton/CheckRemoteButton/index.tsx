import * as React from "react";

import * as utils from "src/utils";

const CheckRemoteButton = (props: { onClick: () => void }) => {
  const onKeyDown = utils.useOnKeyDown(props.onClick);
  return (
    <span
      onClick={props.onClick}
      onKeyDown={onKeyDown}
      onDoubleClick={utils.prevent_propagation}
      role="button"
      tabIndex={0}
    >
      Check remote
    </span>
  );
};

export default CheckRemoteButton;
