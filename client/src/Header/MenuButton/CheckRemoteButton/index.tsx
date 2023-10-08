import * as React from "react";

import * as utils from "src/utils";

const CheckRemoteButton = React.memo((props: { onClick: () => void }) => {
  return (
    <span
      onClick={props.onClick}
      onDoubleClick={utils.prevent_propagation}
      role="button"
      tabIndex={0}
    >
      Check remote
    </span>
  );
});

export default CheckRemoteButton;
