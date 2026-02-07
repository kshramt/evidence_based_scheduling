import * as React from "react";

import * as utils from "src/utils";

const LogoutButton = (props: { logOut: () => void }) => {
  const onKeyDown = utils.useOnKeyDown(props.logOut);
  return (
    <span
      onClick={props.logOut}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
    >
      Log out
    </span>
  );
};

export default LogoutButton;
