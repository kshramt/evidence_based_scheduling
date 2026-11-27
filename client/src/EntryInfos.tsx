import * as React from "react";

import { EstimationInput } from "./EstimationInput";
import { LastRange } from "./LastRange";
import { TotalTime } from "./TotalTime";

import * as types from "./types";

export const EntryInfos = (props: {
  node_id: types.TNodeId;
  isRoot: boolean;
}) => {
  return (
    <div className="flex w-fit gap-x-[0.25em] items-baseline pt-[0.25em]">
      {props.isRoot || <EstimationInput node_id={props.node_id} />}
      <TotalTime node_id={props.node_id} />
      {props.isRoot || <LastRange node_id={props.node_id} />}
    </div>
  );
};
