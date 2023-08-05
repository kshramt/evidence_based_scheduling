import * as React from "react";

import * as consts from "src/consts";
import * as utils from "src/utils";
import AutoHeightTextArea from "src/AutoHeightTextArea";

const TocForm = React.memo(
  React.forwardRef<
    HTMLTextAreaElement,
    {
      onClick: () => void;
      selected: boolean;
      toggleSelected: () => void;
    }
  >((props, ref) => {
    return (
      <>
        <button className="btn-icon" onClick={props.toggleSelected}>
          {consts.TOC_MARK}
        </button>
        <div className={utils.join(props.selected || "hidden")}>
          <button
            onClick={props.onClick}
            onDoubleClick={utils.prevent_propagation}
            className="btn-icon"
          >
            Parse
          </button>
          <AutoHeightTextArea className="w-[29em]" text="" ref={ref} />
        </div>
      </>
    );
  }),
);

export default TocForm;
