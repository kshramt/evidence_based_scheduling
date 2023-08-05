import * as React from "react";

import Component from "./Component";

const LogoutButton = React.memo((props: { logOut: () => void }) => {
  return <Component logOut={props.logOut} />;
});

export default LogoutButton;
