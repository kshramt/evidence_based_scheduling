import { Menu } from "@mantine/core";
import * as React from "react";

import * as toast from "src/toast";
import * as types from "src/types";
import * as utils from "src/utils";

const ExportStateButton = () => {
  const dispatch = types.useDispatch();
  const handleClick = React.useCallback(() => {
    try {
      dispatch((_dispatch, getState) => {
        const state = getState();
        utils.downloadJson("evidence_based_scheduling.json", state);
      });
    } catch {
      toast.add("error", "Could not export state. Try again.");
    }
  }, [dispatch]);
  return (
    <Menu.Item onClick={handleClick} onDoubleClick={utils.prevent_propagation}>
      Export state
    </Menu.Item>
  );
};

export default ExportStateButton;
