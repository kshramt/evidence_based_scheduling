import * as React from "react";

const LogoutButton = (props: { logOut: () => void }) => {
  return (
    <span onClick={props.logOut} role="button" tabIndex={0}>
      Log out
    </span>
  );
};

export default LogoutButton;
