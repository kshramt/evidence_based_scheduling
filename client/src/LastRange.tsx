import { useSelector } from "./types";
import * as types from "./types";
import * as utils from "./utils";

export const LastRange = (props: { node_id: types.TNodeId }) => {
  const ranges = utils.assertV(
    useSelector((state) => state.swapped_nodes.ranges?.[props.node_id]),
  );
  const last_range = last_range_of(ranges);
  return (
    <>
      {last_range &&
        last_range.end &&
        digits2((last_range.end - last_range.start) / (1000 * 3600))}
    </>
  );
};

const digits2 = (x: number) => {
  return Math.round(x * 100) / 100;
};

const last_range_of = (
  ranges: readonly types.TRange[],
): null | types.TRange => {
  const n = ranges.length;
  if (n < 1) {
    return null;
  } else {
    const last = ranges[n - 1];
    if (last.end === null) {
      if (n - 2 < 0) {
        return null;
      } else {
        return ranges[n - 2];
      }
    } else {
      return last;
    }
  }
};
