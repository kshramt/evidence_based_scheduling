import * as React from "react";

const LogoutButton = React.memo((props: { logOut: () => void }) => {
  return <span onClick={props.logOut}>Log out</span>;
});

export default LogoutButton;
