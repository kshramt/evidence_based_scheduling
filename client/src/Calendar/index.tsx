import * as React from "react";

import CopyNodeIdButton from "src/CopyNodeIdButton";
import StartButton from "src/StartButton";
import StartConcurrentButton from "src/StartConcurrentButton";
import StopButton from "src/StopButton";
import * as states from "src/states";
import * as types from "src/types";
import * as utils from "src/utils";

const Calendar = React.memo(() => {
  return (
    <>
      <TimeNode timeId="F2020" />
      <TimeNode timeId="F2024" />
      <TimeNode timeId="F2028" />
      <TimeNode timeId="F2032" />
      <TimeNode timeId="F2036" />
      <TimeNode timeId="F2040" />
      <TimeNode timeId="F2044" />
      <TimeNode timeId="F2048" />
      <TimeNode timeId="F2052" />
      <TimeNode timeId="F2056" />
      <TimeNode timeId="F2060" />
      <TimeNode timeId="F2064" />
      <TimeNode timeId="F2068" />
      <TimeNode timeId="F2072" />
      <TimeNode timeId="F2076" />
      <TimeNode timeId="F2080" />
      <TimeNode timeId="F2084" />
      <TimeNode timeId="F2088" />
      <TimeNode timeId="F2092" />
      <TimeNode timeId="F2096" />
    </>
  );
});

const auto2Style = { gridTemplateColumns: "auto auto" };

const TimeNode = React.memo((props: { timeId: string }) => {
  const [isOpen, toggle] = states.useUiCalendarOpenSet(props.timeId);
  const children = React.useMemo(() => {
    if (props.timeId[0] === "D" || isOpen) {
      const childIds = utils.getChildTimeIds(props.timeId);
      const children = childIds.map((timeId) => {
        return <TimeNode timeId={timeId} key={timeId} />;
      });
      switch (props.timeId[0]) {
        case "W":
        case "D": {
          return children;
        }
        default: {
          return <div>{children}</div>;
        }
      }
    }
    return null;
  }, [isOpen, props.timeId]);
  const idEl = React.useMemo(() => {
    const title = utils.getStringOfTimeId(props.timeId);
    switch (props.timeId[0]) {
      case "D":
      case "H": {
        return title;
      }
      default: {
        return <button onClick={toggle}>{title}</button>;
      }
    }
  }, [props.timeId, toggle]);
  const plannedNodeIds = utils.usePlannedNodeIds(props.timeId);
  const plannedNodes = React.useMemo(() => {
    return isOpen
      ? plannedNodeIds.map((nodeId) => {
          return <PlannedNode node_id={nodeId} key={nodeId} />;
        })
      : null;
  }, [plannedNodeIds, isOpen]);
  switch (props.timeId[0]) {
    case "D": {
      return (
        <div className="grid gap-x-[0.125em pl-[0.5em]" style={auto2Style}>
          <div />
          {idEl}
          <div />
          <div>{plannedNodes}</div>
          {children}
        </div>
      );
    }
    case "H": {
      return (
        <>
          {idEl}
          <div>{plannedNodes}</div>
        </>
      );
    }
    default: {
      return (
        <div className="pb-[0.0625em] pl-[0.5em] flex gap-x-[0.125em] items-start">
          <div>
            {idEl}
            {plannedNodes}
          </div>
          {children}
        </div>
      );
    }
  }
});

const PlannedNode = (props: { node_id: types.TNodeId }) => {
  const text = types.useSelector(
    (state) => state.swapped_caches.text[props.node_id],
  );
  const status = types.useSelector(
    (state) => state.swapped_nodes.status[props.node_id],
  );
  const { isOn, turnOn, turnOff } = utils.useOn();
  const is_running = utils.useIsRunning(props.node_id);
  const to_tree = utils.useToTree(props.node_id);
  return (
    <div
      className={utils.join(
        "py-[0.0625em]",
        is_running ? "running" : undefined,
      )}
      onMouseOver={turnOn}
      onMouseLeave={turnOff}
    >
      <span
        title={text}
        onClick={to_tree}
        className={utils.join(
          "w-[15em] block whitespace-nowrap overflow-hidden cursor-pointer",
          status === "done"
            ? "text-red-600 dark:text-red-400"
            : status === "dont"
            ? "text-neutral-500"
            : undefined,
        )}
      >
        {text.slice(0, 40)}
      </span>
      {(isOn || is_running) && (
        <div className="flex w-fit gap-x-[0.25em]">
          {is_running ? (
            <StopButton node_id={props.node_id} />
          ) : (
            <>
              <StartButton node_id={props.node_id} />
              <StartConcurrentButton node_id={props.node_id} />
            </>
          )}
          <CopyNodeIdButton node_id={props.node_id} />
        </div>
      )}
    </div>
  );
};

export default Calendar;
