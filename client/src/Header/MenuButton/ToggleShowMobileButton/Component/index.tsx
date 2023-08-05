import * as React from "react";

import * as consts from "src/consts";
import * as utils from "src/utils";

const ToggleShowMobileButton = React.memo(
  (props: {
    onClick: () => void;
    show_mobile: boolean;
    onDoubleClick: (e: React.MouseEvent) => void;
  }) => {
    return (
      <button
        className="btn-icon"
        onClick={props.onClick}
        onDoubleClick={utils.prevent_propagation}
      >
        {props.show_mobile ? consts.DESKTOP_MARK : consts.MOBILE_MARK}
      </button>
    );
  },
);

export default ToggleShowMobileButton;
