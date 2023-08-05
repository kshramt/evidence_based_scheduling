import * as React from "react";

import Component from "./Component";

const ParseTocButton = React.memo((props: { onClick: () => void }) => {
  return <Component onClick={props.onClick} />;
});

export default ParseTocButton;
