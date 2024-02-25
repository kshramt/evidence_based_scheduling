import * as React from "react";

import AddButton from "./AddButton";
import CopyNodeIdButton from "src/CopyNodeIdButton";
import StartButton from "src/StartButton";
import StartConcurrentButton from "src/StartConcurrentButton";
import StopButton from "src/StopButton";
import * as hooks from "src/hooks";
import * as states from "src/states";
import * as types from "src/types";
import * as utils from "src/utils";

const Calendar = React.memo(() => {
  const queues = hooks.useQueues();
  const tn = (timeId: string) => (
    <TimeNode
      timeId={timeId}
      todoNodeIds={queues.todoQueue}
      nonTodoNodeIds={queues.nonTodoQueue}
    />
  );
  return (
    <>
      {tn("F2020")}
      {tn("F2024")}
      {tn("F2028")}
      {tn("F2032")}
      {tn("F2036")}
      {tn("F2040")}
      {tn("F2044")}
      {tn("F2048")}
      {tn("F2052")}
      {tn("F2056")}
      {tn("F2060")}
      {tn("F2064")}
      {tn("F2068")}
      {tn("F2072")}
      {tn("F2076")}
      {tn("F2080")}
      {tn("F2084")}
      {tn("F2088")}
      {tn("F2092")}
      {tn("F2096")}
    </>
  );
});

const auto2Style = { gridTemplateColumns: "auto auto" };

const TimeNode = React.memo(
  (props: {
    timeId: string;
    todoNodeIds: types.TNodeId[];
    nonTodoNodeIds: types.TNodeId[];
  }) => {
    const [isOpen, toggle] = states.useUiCalendarOpenSet(props.timeId);
    const children = React.useMemo(() => {
      if (props.timeId[0] === "D" || isOpen) {
        const childIds = utils.getChildTimeIds(props.timeId);
        const children = childIds.map((timeId) => {
          return (
            <TimeNode
              timeId={timeId}
              key={timeId}
              todoNodeIds={props.todoNodeIds}
              nonTodoNodeIds={props.nonTodoNodeIds}
            />
          );
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
    }, [isOpen, props.timeId, props.todoNodeIds, props.nonTodoNodeIds]);
    const plannedNodeIds = utils.usePlannedNodeIds(
      props.timeId,
      props.todoNodeIds,
      props.nonTodoNodeIds,
    );
    const plannedNodes = React.useMemo(() => {
      return plannedNodeIds.map((nodeId) => {
        return <PlannedNode node_id={nodeId} key={nodeId} />;
      });
    }, [plannedNodeIds]);
    switch (props.timeId[0]) {
      case "D": {
        return (
          <div className="grid gap-x-[0.125em pl-[0.5em]" style={auto2Style}>
            <div />
            <Id timeId={props.timeId} toggle={toggle} />
            <div />
            <div>{plannedNodes}</div>
            {children}
          </div>
        );
      }
      case "H": {
        return (
          <>
            <Id timeId={props.timeId} toggle={toggle} />
            <div>{plannedNodes}</div>
          </>
        );
      }
      default: {
        return (
          <div className="pb-[0.0625em] pl-[0.5em] flex gap-x-[0.125em] items-start">
            <div>
              <Id timeId={props.timeId} toggle={toggle} />
              {plannedNodes}
            </div>
            {children}
          </div>
        );
      }
    }
  },
);

const PlannedNode = (props: { node_id: types.TNodeId }) => {
  const text = utils.assertV(
    types.useSelector((state) => state.swapped_caches.text?.[props.node_id]),
  );
  const status = utils.assertV(
    types.useSelector((state) => state.swapped_nodes.status?.[props.node_id]),
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
      onFocus={turnOn}
    >
      <div
        role="button"
        tabIndex={0}
        title={text}
        onClick={to_tree}
        className={utils.join(
          "w-[13em] block whitespace-nowrap overflow-hidden cursor-pointer text-left",
          status === "done"
            ? "text-red-600 dark:text-red-400"
            : status === "dont"
              ? "text-neutral-500"
              : undefined,
        )}
      >
        {text.slice(0, 40)}
      </div>
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

const Id = React.memo(
  (props: { timeId: string; toggle: () => Promise<void> }) => {
    const title = utils.getStringOfTimeId(props.timeId);
    const { isOn, turnOn, turnOff } = utils.useOn();
    return (
      <div
        onMouseOver={turnOn}
        onMouseLeave={turnOff}
        onFocus={turnOn}
        onBlur={turnOff}
      >
        {props.timeId[0] === "D" || props.timeId[0] === "H" ? (
          title
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={props.toggle}
            className="font-bold"
          >
            {title}
          </div>
        )}
        {isOn ? <AddButton timeId={props.timeId} /> : null}
      </div>
    );
  },
);

export default Calendar;
