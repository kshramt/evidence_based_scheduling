import * as React from "react";

import * as utils from "src/utils";

const ExportIndexedDbButton = React.memo(
  (props: {
    onClick: () => void;
  }) => {
    return (
      <button
        className="btn-icon mr-[0.5em]"
        onClick={props.onClick}
        onDoubleClick={utils.prevent_propagation}
      >
        Export IndexedDB
      </button>
    );
  },
);

export default ExportIndexedDbButton;
