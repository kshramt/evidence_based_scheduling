import * as Jotai from "jotai";
import * as React from "react";

import AutoHeightTextArea from "src/AutoHeightTextArea";
import CopyNodeIdButton from "src/CopyNodeIdButton";
import StartButton from "src/StartButton";
import StartConcurrentButton from "src/StartConcurrentButton";
import StopButton from "src/StopButton";
import * as actions from "src/actions";
import * as consts from "src/consts";
import * as ops from "src/ops";
import * as states from "src/states";
import * as types from "src/types";
import * as utils from "src/utils";

const Calendar = React.memo(() => {
  const dispatch = types.useDispatch();
  const count = types.useSelector((state) => state.data.timeline.count);
  const increment_count = React.useCallback(
    () => dispatch(actions.increment_count_action()),
    [dispatch],
  );
  const decade_nodes = React.useMemo(() => {
    const res = [];
    for (let i_count = 0; i_count < count; ++i_count) {
      const time_node_id = `e${i_count}`;
      if (types.is_TTimeNodeId(time_node_id)) {
        res.push(<TimeNode time_node_id={time_node_id} key={time_node_id} />);
      }
    }
    return res;
  }, [count]);
  return (
    <>
      {decade_nodes}
      <button className="btn-icon" onClick={increment_count}>
        {consts.ADD_MARK}
      </button>
    </>
  );
});

const TimeNode = React.memo((props: { time_node_id: types.TTimeNodeId }) => {
  const time_node = types.useSelector(
    (state) => state.data.timeline.time_nodes[props.time_node_id],
  );

  const year_begin = types.useSelector(
    (state) => state.data.timeline.year_begin,
  );
  const child_time_node_ids = utils.child_time_node_ids_of(
    props.time_node_id,
    year_begin,
  );
  const id = `tl-${props.time_node_id}`;
  const id_el = (
    <a href={`#${id}`} id={id}>
      {utils.getTimeNodeIdEl(props.time_node_id, year_begin)}
    </a>
  );

  const node_ids =
    time_node?.show_children !== "none"
      ? ops.sorted_keys_of(time_node?.nodes || {})
      : [];
  const planned_nodes = node_ids.map((node_id) => (
    <tr key={node_id}>
      <td />
      <PlannedNode
        node_id={node_id}
        time_node_id={props.time_node_id}
        Component="td"
      />
    </tr>
  ));
  if (props.time_node_id[0] === "h") {
    return (
      <>
        <tr>
          <td>{id_el}</td>
          <TimeNodeEntry time_node_id={props.time_node_id} />
        </tr>
        {planned_nodes}
      </>
    );
  }
  if (props.time_node_id[0] === "d") {
    return (
      <table>
        <tbody>
          <tr>
            <td />
            <td> {id_el}</td>
          </tr>
          <tr>
            <td />
            <TimeNodeEntry time_node_id={props.time_node_id} />
          </tr>
          {planned_nodes}
          {child_time_node_ids.map((child_time_node_id) => (
            <TimeNode
              time_node_id={child_time_node_id}
              key={child_time_node_id}
            />
          ))}
        </tbody>
      </table>
    );
  }
  const children =
    time_node?.show_children === "full" &&
    child_time_node_ids.map((child_time_node_id) => (
      <TimeNode time_node_id={child_time_node_id} key={child_time_node_id} />
    ));

  return (
    <div className="pb-[0.0625em] pl-[0.5em] flex gap-x-[0.125em] items-start">
      <div>
        {id_el}
        <TimeNodeEntry time_node_id={props.time_node_id} />
        {node_ids.map((node_id) => (
          <PlannedNode
            node_id={node_id}
            time_node_id={props.time_node_id}
            Component="div"
            key={node_id}
          />
        ))}
      </div>
      {props.time_node_id[0] === "w" ? children : <div>{children}</div>}
    </div>
  );
});

const TimeNodeEntry = React.memo(
  (props: { time_node_id: types.TTimeNodeId }) => {
    const dispatch = types.useDispatch();
    const time_node = types.useSelector(
      (state) => state.data.timeline.time_nodes[props.time_node_id],
    );
    const selectedNodeIds = Jotai.useAtomValue(states.nodeIdsState);
    const text = time_node?.text ? time_node.text : consts.EMPTY_STRING;
    const { isOn, turnOn, turnOff } = utils.useOn(0);

    const toggle_show_children = React.useCallback(() => {
      const payload = props.time_node_id;
      dispatch(actions.toggle_show_time_node_children_action(payload));
    }, [props.time_node_id, dispatch]);
    const assign_nodes = React.useCallback(() => {
      const node_ids = utils.node_ids_list_of_node_ids_string(selectedNodeIds);
      if (node_ids.length < 1) {
        return;
      }
      const payload = {
        time_node_id: props.time_node_id,
        node_ids,
      };
      dispatch(actions.assign_nodes_to_time_node_action(payload));
    }, [props.time_node_id, selectedNodeIds, dispatch]);
    const dispatch_set_text_action = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const el = e.target;
        dispatch(
          actions.set_time_node_text_action({
            time_node_id: props.time_node_id,
            text: el.innerText,
          }),
        );
      },
      [dispatch, props.time_node_id],
    );

    return (
      <td onMouseLeave={turnOff}>
        <AutoHeightTextArea
          text={text}
          onBlur={dispatch_set_text_action}
          onClick={turnOn}
          onDoubleClick={utils.prevent_propagation}
          className="textarea whitespace-pre-wrap overflow-wrap-anywhere w-[17em] overflow-hidden p-[0.125em] bg-white dark:bg-neutral-800 py-[0.4em]"
        />
        {isOn && (
          <div className="flex w-fit gap-x-[0.125em]">
            <button className="btn-icon" onClick={assign_nodes}>
              {consts.ADD_MARK}
            </button>
            <button className="btn-icon" onClick={toggle_show_children}>
              {time_node === undefined || time_node.show_children === "partial"
                ? consts.IS_PARTIAL_MARK
                : time_node.show_children === "full"
                ? consts.IS_FULL_MARK
                : consts.IS_NONE_MARK}
            </button>
          </div>
        )}
      </td>
    );
  },
);

const PlannedNode = (props: {
  node_id: types.TNodeId;
  time_node_id: types.TTimeNodeId;
  Component: "div" | "td";
}) => {
  const text = types.useSelector((state) => state.caches[props.node_id].text);
  const status = types.useSelector(
    (state) => state.data.nodes[props.node_id].status,
  );
  const dispatch = types.useDispatch();
  const { isOn, turnOn, turnOff } = utils.useOn();
  const is_running = utils.useIsRunning(props.node_id);
  const unassign_node = React.useCallback(() => {
    dispatch(
      actions.unassign_nodes_of_time_node_action({
        time_node_id: props.time_node_id,
        node_ids: [props.node_id],
      }),
    );
  }, [props.time_node_id, props.node_id, dispatch]);
  const to_tree = utils.useToTree(props.node_id);
  return (
    <props.Component
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
          <button className="btn-icon" onClick={unassign_node}>
            {consts.DELETE_MARK}
          </button>
        </div>
      )}
    </props.Component>
  );
};

export default Calendar;
