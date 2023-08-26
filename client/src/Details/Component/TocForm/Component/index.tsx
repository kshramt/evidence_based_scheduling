import * as React from "react";
import * as Mt from "@mantine/core";

import * as consts from "src/consts";
import * as utils from "src/utils";

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
          <Mt.Textarea className="w-[29em]" ref={ref} autosize />
        </div>
      </>
    );
  }),
);

export default TocForm;
