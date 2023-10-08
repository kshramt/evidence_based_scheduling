import * as React from "react";

import TopButton from "src/TopButton";
import * as actions from "src/actions";
import * as consts from "src/consts";
import * as toast from "src/toast";
import * as types from "src/types";
import * as utils from "src/utils";

const EdgeRow = React.memo(
  (props: { edge_id: types.TEdgeId; target: "p" | "c" }) => {
    // const edge = types.useSelector((state) => state.data.edges[props.edge_id]);
    const edgeT = types.useSelector(
      (state) => state.swapped_edges.t[props.edge_id],
    );
    const nodeId = types.useSelector(
      (state) => state.swapped_edges[props.target][props.edge_id],
    );
    const edgeHide = types.useSelector(
      (state) => state.swapped_edges.hide[props.edge_id],
    );
    const dispatch = types.useDispatch();
    const delete_edge = React.useCallback(
      () => dispatch(actions.delete_edge_action(props.edge_id)),
      [props.edge_id, dispatch],
    );
    const set_edge_type = React.useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        const edge_type = e.target.value;
        if (types.is_TEdgeType(edge_type)) {
          dispatch(
            actions.set_edge_type_action({
              edge_id: props.edge_id,
              edge_type,
            }),
          );
        } else {
          toast.add("error", `Invalid edge type: ${edge_type}`);
        }
      },
      [props.edge_id, dispatch],
    );
    const toggle_edge_hide = React.useCallback(() => {
      dispatch(actions.toggle_edge_hide_action(props.edge_id));
    }, [props.edge_id, dispatch]);
    return (
      <tr>
        <EdgeRowContent node_id={nodeId} />
        <td className="p-[0.25em]">
          <select value={edgeT} onChange={set_edge_type}>
            {types.edgeTypeValues.map((t, i) => (
              <option value={t} key={i}>
                {t}
              </option>
            ))}
          </select>
        </td>
        <td className="p-[0.25em]">
          <input
            type="radio"
            checked={!edgeHide}
            onClick={toggle_edge_hide}
            onChange={utils.suppress_missing_onChange_handler_warning}
          />
        </td>
        <td className="p-[0.25em]">
          <button
            className="btn-icon"
            onClick={delete_edge}
            onDoubleClick={utils.prevent_propagation}
          >
            {consts.DELETE_MARK}
          </button>
        </td>
      </tr>
    );
  },
);

const EdgeRowContent = React.memo((props: { node_id: types.TNodeId }) => {
  const to_tree = utils.useToTree(props.node_id);
  const text = types.useSelector(
    (state) => state.swapped_caches.text[props.node_id],
  );
  const disabled = types.useSelector((state) => {
    return (
      props.node_id === state.data.root ||
      state.swapped_nodes.status[props.node_id] !== "todo"
    );
  });
  return (
    <>
      <td>
        <TopButton node_id={props.node_id} disabled={disabled} />
      </td>
      <td
        title={text}
        onClick={to_tree}
        className="p-[0.25em] cursor-pointer"
        role="gridcell"
      >
        {text.slice(0, 15)}
      </td>
    </>
  );
});

export default EdgeRow;
