import * as React from "react";

import StartButton from "./StartButton";
import StartConcurrentButton from "./StartConcurrentButton";
import StopButton from "./StopButton";

import { useSelector } from "./types";
import * as types from "./types";
import * as utils from "./utils";

export const StartOrStopButtons = (props: { node_id: types.TNodeId }) => {
  const ranges = utils.assertV(
    useSelector((state) => state.swapped_nodes.ranges?.[props.node_id]),
  );
  const last_range = ranges.at(-1);
  const running = last_range && last_range.end === null;

  return running ? (
    <StopButton node_id={props.node_id} ref={stopButtonRefOf(props.node_id)} />
  ) : (
    <>
      <StartButton node_id={props.node_id} />
      <StartConcurrentButton node_id={props.node_id} />
    </>
  );
};

const stopButtonRefOf = utils.memoize1((_: types.TNodeId) =>
  React.createRef<HTMLButtonElement>(),
);
