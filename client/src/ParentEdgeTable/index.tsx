import * as React from "react";

import EdgeRow from "src/EdgeRow";
import * as ops from "src/ops";
import * as types from "src/types";

const ParentEdgeTable = React.memo((props: { node_id: types.TNodeId }) => {
  const parents = types.useSelector(
    (state) => state.swapped_nodes.parents[props.node_id],
  );
  return (
    <table className="table-auto">
      <tbody className="block max-h-[10em] overflow-y-auto">
        {ops.sorted_keys_of(parents).map((edge_id) => (
          <EdgeRow edge_id={edge_id} key={edge_id} target={"p"} />
        ))}
      </tbody>
    </table>
  );
});

export default ParentEdgeTable;
