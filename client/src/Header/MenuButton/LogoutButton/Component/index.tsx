import * as React from "react";

const LogoutButton = React.memo((props: { logOut: () => void }) => {
  return (
    <button className="btn-icon" onClick={props.logOut}>
      Log out
    </button>
  );
});

export default LogoutButton;
