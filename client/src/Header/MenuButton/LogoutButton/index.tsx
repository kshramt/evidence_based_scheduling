import { Menu } from "@mantine/core";

const LogoutButton = (props: { logOut: () => void }) => {
  return <Menu.Item onClick={props.logOut}>Log out</Menu.Item>;
};

export default LogoutButton;
