import * as React from "react";

import * as consts from "src/consts";
import * as utils from "src/utils";

const ParseTocButton = React.memo((props: { onClick: () => void }) => {
  return (
    <button
      className="btn-icon"
      onClick={props.onClick}
      onDoubleClick={utils.prevent_propagation}
    >
      {consts.TOC_MARK}
    </button>
  );
});

export default ParseTocButton;
