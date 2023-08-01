import * as React from "react";

import Component from "./Component";

const CheckRemoteButton = React.memo(
  (props: {
    onClick: () => void;
  }) => {
    return (
      <Component onClick={props.onClick} />
    );
  },
);

export default CheckRemoteButton;
