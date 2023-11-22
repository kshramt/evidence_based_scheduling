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

const Details = React.memo((props: { node_id: types.TNodeId }) => {
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
  const hline = (
    <hr className="my-[0.5em] border-neutral-300 dark:border-neutral-600 bg-neutral-300 dark:bg-neutral-600" />
  );
  return (
    <div className="pt-[0.25em] bg-neutral-200 dark:bg-neutral-900">
      {hline}
      <div className="flex w-fit gap-x-[0.25em] items-baseline">
        <TogglePinButton node_id={props.node_id} />
        <TocForm nodeId={props.node_id} />
      </div>
      {hline}
      <div className="flex gap-x-[0.25em] items-baseline">
        Add:
        <select value={new_edge_type} onChange={handle_new_edge_type_change}>
          {types.edgeTypeValues.map((t, i) => (
            <option value={t} key={i}>
              {t}
            </option>
          ))}
        </select>
        <button
          className="btn-icon"
          onClick={handle_add_parents}
          onDoubleClick={utils.prevent_propagation}
        >
          Parents
        </button>
        <button
          className="btn-icon"
          onClick={handle_add_children}
          onDoubleClick={utils.prevent_propagation}
        >
          Children
        </button>
      </div>
      {hline}
      <ParentEdgeTable node_id={props.node_id} />
      {hline}
      <ChildEdgeTable node_id={props.node_id} />
      {hline}
      <RangesTable node_id={props.node_id} />
      {hline}
      <PlannedEvents nodeId={props.node_id} />
      {hline}
    </div>
  );
});

const ShowDetailsButton = (props: {
  node_id: types.TNodeId;
  opened: boolean;
  handlers: { close: () => void; toggle: () => void };
}) => {
  const text = utils.assertV(
    types.useSelector((state) => state.swapped_caches.text?.[props.node_id]),
  );
  const text30 = React.useMemo(() => {
    return text.slice(0, 30);
  }, [text]);

  return (
    <>
      <button
        className="btn-icon"
        onClick={props.handlers.toggle}
        onDoubleClick={utils.prevent_propagation}
      >
        {consts.DETAIL_MARK}
      </button>
      <Mtc.Drawer
        closeOnClickOutside={false}
        lockScroll={false}
        onClose={props.handlers.close}
        opened={props.opened}
        position="right"
        title={text30}
        withOverlay={false}
      >
        <Details node_id={props.node_id} />
      </Mtc.Drawer>
    </>
  );
};

export default ShowDetailsButton;
