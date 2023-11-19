import * as React from "react";

import * as types from "src/types";
import * as utils from "src/utils";

const ExportStateButton = React.memo(() => {
  const dispatch = types.useDispatch();
  const handleClick = React.useCallback(() => {
    dispatch((disptch, getState) => {
      const state = getState();
      utils.downloadJson<typeof state>("evidence_based_scheduling.json", state);
    });
  }, [dispatch]);
  return (
    <span
      onClick={handleClick}
      onDoubleClick={utils.prevent_propagation}
      role="button"
      tabIndex={0}
    >
      Export state
    </span>
  );
});

export default ExportStateButton;
