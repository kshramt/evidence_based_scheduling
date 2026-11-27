import * as React from "react";
import { Menu } from "@mantine/core";

import * as utils from "src/utils";

const messages = {
  idle: "",
  checking: "Checking remote…",
  unchanged: "No remote changes.",
  changed: "Remote changes found.",
  failed: "Could not check remote. Try again.",
  offline: "Connect to the internet to check remote.",
};

const CheckRemoteButton = (props: { onClick: () => Promise<boolean> }) => {
  const [status, setStatus] = React.useState<keyof typeof messages>("idle");
  const checkRemote = async () => {
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    setStatus("checking");
    try {
      setStatus((await props.onClick()) ? "changed" : "unchanged");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <>
      <Menu.Item
        onClick={() => void checkRemote()}
        onDoubleClick={utils.prevent_propagation}
        disabled={status === "checking"}
      >
        Check remote
      </Menu.Item>
      <div role="status">
        {status !== "idle" && <Menu.Label>{messages[status]}</Menu.Label>}
      </div>
    </>
  );
};

export default CheckRemoteButton;
