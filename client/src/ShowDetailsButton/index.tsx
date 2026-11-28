import * as Jotai from "jotai";
import * as Mtc from "@mantine/core";
import * as React from "react";

import ChildEdgeTable from "src/ChildEdgeTable";
import ParentEdgeTable from "src/ParentEdgeTable";
import PlannedEvents from "src/PlannedEvents";
import RangesTable from "src/RangesTable";
import TocForm from "src/TocForm";
import TogglePinButton from "src/TogglePinButton";
import * as actions from "src/actions";
import * as consts from "src/consts";
import * as states from "src/states";
import * as toast from "src/toast";
import * as types from "src/types";
import * as utils from "src/utils";

const statusLabels = { todo: "To do", done: "Done", dont: "Won't do" };
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "long",
});

const TaskTimestamp = ({ timestamp }: { timestamp: number }) => {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return "Unknown";
  return (
    <time dateTime={date.toISOString()}>{dateTimeFormat.format(date)}</time>
  );
};

const TaskSummary = ({ nodeId }: { nodeId: types.TNodeId }) => {
  const created = types.useSelector(
    (state) => state.swapped_nodes.start_time?.[nodeId],
  );
  const status = types.useSelector(
    (state) => state.swapped_nodes.status?.[nodeId],
  );
  const end = types.useSelector(
    (state) => state.swapped_nodes.end_time?.[nodeId],
  );
  if (created === undefined || status === undefined) return null;
  return (
    <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
      <dt className="font-medium">Status</dt>
      <dd className="m-0">{statusLabels[status]}</dd>
      <dt className="font-medium">Created</dt>
      <dd className="m-0">
        <TaskTimestamp timestamp={created} />
      </dd>
      {status !== "todo" && end != null && (
        <>
          <dt className="font-medium">
            {status === "done" ? "Completed" : "Closed"}
          </dt>
          <dd className="m-0">
            <TaskTimestamp timestamp={end} />
          </dd>
        </>
      )}
    </dl>
  );
};

const Details = (props: { node_id: types.TNodeId }) => {
  const [new_edge_type, set_new_edge_type] =
    React.useState<types.TEdgeType>("weak");
  const handle_new_edge_type_change = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      if (types.is_TEdgeType(v)) {
        set_new_edge_type(v);
      } else {
        toast.add("error", `Invalid edge type: ${v}`);
      }
    },
    [set_new_edge_type],
  );
  const dispatch = types.useDispatch();
  const nodeIds = Jotai.useAtomValue(states.nodeIdsState);
  const handle_add_parents = React.useCallback(() => {
    dispatch(
      actions.add_edges_action(
        utils.node_ids_list_of_node_ids_string(nodeIds).map((p) => ({
          p,
          c: props.node_id,
          t: new_edge_type,
        })),
      ),
    );
  }, [dispatch, nodeIds, new_edge_type, props.node_id]);
  const handle_add_children = React.useCallback(() => {
    dispatch(
      actions.add_edges_action(
        utils.node_ids_list_of_node_ids_string(nodeIds).map((c) => ({
          p: props.node_id,
          c,
          t: new_edge_type,
        })),
      ),
    );
  }, [dispatch, nodeIds, new_edge_type, props.node_id]);
  return (
    <div className="space-y-4">
      <TaskSummary nodeId={props.node_id} />
      <div className="flex flex-wrap items-baseline gap-2">
        <TogglePinButton node_id={props.node_id} />
        <TocForm nodeId={props.node_id} />
      </div>
      <section className={sectionClass} aria-labelledby="task-dependencies">
        <h2 id="task-dependencies" className={headingClass}>
          Dependencies
        </h2>
        <div className="flex flex-wrap items-baseline gap-2">
          <label className="flex items-baseline gap-2">
            Type
            <select
              value={new_edge_type}
              onChange={handle_new_edge_type_change}
            >
              {types.edgeTypeValues.map((type) => (
                <option value={type} key={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn-icon"
            onClick={handle_add_parents}
            onDoubleClick={utils.prevent_propagation}
          >
            Add parents
          </button>
          <button
            className="btn-icon"
            onClick={handle_add_children}
            onDoubleClick={utils.prevent_propagation}
          >
            Add children
          </button>
        </div>
        <div>
          <h3 className="m-0 text-sm font-medium">Parents</h3>
          <ParentEdgeTable node_id={props.node_id} />
        </div>
        <div>
          <h3 className="m-0 text-sm font-medium">Children</h3>
          <ChildEdgeTable node_id={props.node_id} />
        </div>
      </section>
      <section className={sectionClass} aria-labelledby="task-time-records">
        <h2 id="task-time-records" className={headingClass}>
          Time records
        </h2>
        <RangesTable node_id={props.node_id} />
      </section>
      <section className={sectionClass} aria-labelledby="task-planned-events">
        <h2 id="task-planned-events" className={headingClass}>
          Planned events
        </h2>
        <div className="overflow-x-auto">
          <PlannedEvents nodeId={props.node_id} />
        </div>
      </section>
    </div>
  );
};

const sectionClass =
  "space-y-2 border-0 border-t border-solid border-neutral-300 pt-3 dark:border-neutral-600";
const headingClass = "m-0 text-base font-semibold";

export const ShowDetailsButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = types.useDispatch();
  const handleClick = React.useCallback(() => {
    dispatch(actions.toggleDrawerAction(props.node_id));
  }, [dispatch, props.node_id]);
  return (
    <button
      type="button"
      aria-label="Show task details"
      className="btn-icon"
      onClick={handleClick}
      onDoubleClick={utils.prevent_propagation}
    >
      {consts.DETAIL_MARK}
    </button>
  );
};

const Component = () => {
  const nodeId = types.useSelector((state) => state.drawerStack.at(-1));
  if (nodeId === undefined) {
    return null;
  }
  return <TaskDetailsDrawer nodeId={nodeId} />;
};

const TaskDetailsDrawer = (props: { nodeId: types.TNodeId }) => {
  const dispatch = types.useDispatch();
  const handleClose = React.useCallback(() => {
    dispatch(actions.closeDrawerAction());
  }, [dispatch]);
  const text = utils.assertV(
    types.useSelector((state) => state.swapped_caches.text?.[props.nodeId]),
  );
  const title =
    text.trimStart().split("\n", 1)[0]?.trimEnd() || "Untitled task";

  return (
    <Mtc.Drawer
      closeOnClickOutside={false}
      lockScroll={false}
      onClose={handleClose}
      opened={true}
      position="right"
      title={
        <span
          className="line-clamp-2 font-semibold [overflow-wrap:anywhere]"
          title={title}
        >
          {title}
        </span>
      }
      closeButtonProps={{ "aria-label": "Close task details" }}
      withOverlay={false}
    >
      <Details key={props.nodeId} node_id={props.nodeId} />
    </Mtc.Drawer>
  );
};

export const component = <Component />;

export default ShowDetailsButton;
