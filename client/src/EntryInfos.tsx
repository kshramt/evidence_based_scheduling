import * as React from "react";

import { EstimationInput } from "./EstimationInput";
import { LastRange } from "./LastRange";
import { TotalTime } from "./TotalTime";

import { useSelector } from "./types";
import * as types from "./types";

export const EntryInfos = React.memo((props: { node_id: types.TNodeId }) => {
  /* ⚡ Bolt: React.memo() prevents unnecessary re-renders in large queue/tree views */
  const root = useSelector((state) => state.data.root);
  const is_root = props.node_id === root;

  return (
    <div className="flex w-fit gap-x-[0.25em] items-baseline pt-[0.25em]">
      {is_root || <EstimationInput node_id={props.node_id} />}
      <TotalTime node_id={props.node_id} />
      {is_root || <LastRange node_id={props.node_id} />}
    </div>
  );
});
EntryInfos.displayName = "EntryInfos";
