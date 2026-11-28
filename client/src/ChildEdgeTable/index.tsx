import * as React from "react";

import EdgeRow from "src/EdgeRow";
import * as ops from "src/ops";
import * as types from "src/types";
import * as utils from "src/utils";

const ChildEdgeTable = (props: { node_id: types.TNodeId }) => {
  const children = utils.assertV(
    types.useSelector((state) => state.swapped_nodes.children?.[props.node_id]),
  );
  const edgeIds = ops.sorted_keys_of(children);
  if (edgeIds.length === 0)
    return <p className="m-0 text-sm">No child tasks</p>;
  return (
    <table className="table-auto">
      <tbody className="block max-h-[10em] overflow-y-auto">
        {edgeIds.map((edge_id) => (
          <EdgeRow edge_id={edge_id} key={edge_id} target="c" />
        ))}
      </tbody>
    </table>
  );
};

export default ChildEdgeTable;
