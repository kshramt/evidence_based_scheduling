import * as React from "react";

import * as actions from "src/actions";
import * as consts from "src/consts";
import * as types from "src/types";
import * as utils from "src/utils";

const RangesTable = (props: { node_id: types.TNodeId }) => {
  const rows_per_page = 10;
  const [offsetInput, setOffset] = React.useState<number | "">(0);
  const n = utils.assertV(
    types.useSelector(
      (state) => state.swapped_nodes.ranges?.[props.node_id].length,
    ),
  );
  const lastOffset = Math.max(0, n - 1);
  const offset = offsetInput === "" ? 0 : Math.min(offsetInput, lastOffset);
  const handleOffsetInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.valueAsNumber;
    setOffset(
      Number.isFinite(value)
        ? Math.min(Math.max(0, Math.trunc(value)), lastOffset)
        : "",
    );
  };
  const rows = [];
  for (let i = offset; i < Math.min(offset + rows_per_page, n); ++i) {
    const i_range = n - i - 1;
    rows.push(
      <RangesTableRow
        i_range={i_range}
        node_id={props.node_id}
        key={i_range}
      />,
    );
  }
  return (
    <>
      <div className="flex gap-x-[0.25em] items-baseline">
        <button
          type="button"
          aria-label="Previous time records"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(offset - rows_per_page, 0))}
          className="btn-icon"
          onDoubleClick={utils.prevent_propagation}
        >
          {consts.BACK_MARK}
        </button>
        <input
          aria-label="Time record offset"
          min={0}
          max={lastOffset}
          disabled={n === 0}
          onChange={handleOffsetInput}
          onBlur={() => setOffset(offset)}
          type="number"
          className="w-[5em]"
          value={offsetInput === "" ? "" : offset}
        />
        /{n}
        <button
          type="button"
          aria-label="Next time records"
          disabled={n <= offset + rows_per_page}
          onClick={() =>
            setOffset(Math.min(offset + rows_per_page, lastOffset))
          }
          className="btn-icon"
          onDoubleClick={utils.prevent_propagation}
        >
          {consts.FORWARD_MARK}
        </button>
      </div>
      <table className="table-auto">
        <tbody className="block max-h-[10em] overflow-y-auto">{rows}</tbody>
      </table>
    </>
  );
};
const RangesTableRow = (props: { node_id: types.TNodeId; i_range: number }) => {
  const range = utils.assertV(
    types.useSelector(
      (state) => state.swapped_nodes.ranges?.[props.node_id][props.i_range],
    ),
  );
  const dispatch = types.useDispatch();
  const set_start = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        actions.set_range_value_action({
          node_id: props.node_id,
          i_range: props.i_range,
          k: "start",
          v: e.target.value,
        }),
      );
    },
    [props.node_id, props.i_range, dispatch],
  );
  const set_end = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        actions.set_range_value_action({
          node_id: props.node_id,
          i_range: props.i_range,
          k: "end",
          v: e.target.value,
        }),
      );
    },
    [props.node_id, props.i_range, dispatch],
  );
  const handle_delete = React.useCallback(() => {
    dispatch(
      actions.delete_range_action({
        node_id: props.node_id,
        i_range: props.i_range,
      }),
    );
  }, [props.node_id, props.i_range, dispatch]);
  const start_date = utils.getStringOfLocalTime(range.start);
  const end_date = range.end
    ? utils.getStringOfLocalTime(range.end)
    : undefined;
  return React.useMemo(
    () => (
      <tr>
        <td className="p-[0.25em]">
          <input
            type="datetime-local"
            value={start_date}
            onChange={set_start}
          />
        </td>
        <td className="p-[0.25em]">
          {end_date && (
            <input type="datetime-local" value={end_date} onChange={set_end} />
          )}
        </td>
        <td className="p-[0.25em]">
          <button
            className="btn-icon"
            onClick={handle_delete}
            onDoubleClick={utils.prevent_propagation}
          >
            {consts.DELETE_MARK}
          </button>
        </td>
      </tr>
    ),
    [end_date, start_date, handle_delete, set_start, set_end],
  );
};

export default RangesTable;
