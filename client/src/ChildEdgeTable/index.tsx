import * as React from "react";

import EdgeRow from "src/EdgeRow";
import * as ops from "src/ops";
import * as types from "src/types";
import * as utils from "src/utils";

const ChildEdgeTable = React.memo((props: { node_id: types.TNodeId }) => {
  const children = utils.assertV(
    types.useSelector((state) => state.swapped_nodes.children?.[props.node_id]),
  );
  return (
    <table className="table-auto">
      <tbody className="block max-h-[10em] overflow-y-auto">
        {ops.sorted_keys_of(children).map((edge_id) => (
          <EdgeRow edge_id={edge_id} key={edge_id} target="c" />
        ))}
      </tbody>
    </table>
  );
});

export default ChildEdgeTable;
