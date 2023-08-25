import * as React from "react";

import * as utils from "src/utils";

const CheckRemoteButton = React.memo((props: { onClick: () => void }) => {
  return (
    <button
      className="btn-icon"
      onClick={props.onClick}
      onDoubleClick={utils.prevent_propagation}
    >
      Check remote
    </button>
  );
});

export default CheckRemoteButton;