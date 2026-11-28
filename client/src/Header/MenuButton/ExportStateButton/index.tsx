import { Menu } from "@mantine/core";
import * as React from "react";

import * as types from "src/types";
import * as utils from "src/utils";

const ExportStateButton = () => {
  const dispatch = types.useDispatch();
  const handleClick = React.useCallback(() => {
    dispatch((_dispatch, getState) => {
      const state = getState();
      utils.downloadJson<typeof state>("evidence_based_scheduling.json", state);
    });
  }, [dispatch]);
  return (
    <Menu.Item onClick={handleClick} onDoubleClick={utils.prevent_propagation}>
      Export state
    </Menu.Item>
  );
};

export default ExportStateButton;
