import * as React from "react";

import AutoHeightTextArea from "src/AutoHeightTextArea";
import * as consts from "src/consts";
import * as utils from "src/utils";

const TocForm = ({
  ref,
  ...props
}: {
  onClick: () => void;
  selected: boolean;
  toggleSelected: () => void;
} & {
  ref: React.RefObject<null | HTMLTextAreaElement>;
}) => {
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
        <AutoHeightTextArea
          className="w-[29em] px-[0.75em] py-[0.5em]"
          ref={ref}
          text=""
        />
      </div>
    </>
  );
};

export default TocForm;
