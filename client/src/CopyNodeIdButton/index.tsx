import * as Jotai from "jotai";
import * as React from "react";

import * as consts from "src/consts";
import * as states from "src/states";
import * as types from "src/types";
import * as utils from "src/utils";

const CopyNodeIdButton = (props: { node_id: types.TNodeId }) => {
  const { copy, is_copied } = utils.useClipboard();
  const setNodeIds = Jotai.useSetAtom(states.nodeIdsState);
  const handle_click = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const multi = e.ctrlKey || e.metaKey;
      setNodeIds((node_ids: string) => {
        const res = multi ? props.node_id + " " + node_ids : props.node_id;
        copy(res);
        return res;
      });
    },
    [props.node_id, setNodeIds, copy],
  );
  return (
    <button
      className="btn-icon"
      onClick={handle_click}
      onDoubleClick={utils.prevent_propagation}
    >
      {is_copied ? consts.DONE_MARK : consts.COPY_MARK}
    </button>
  );
};

export default CopyNodeIdButton;
