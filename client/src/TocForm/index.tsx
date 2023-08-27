import * as React from "react";

import * as actions from "src/actions";
import * as types from "src/types";
import Component from "./Component";

const TocForm = React.memo((props: { nodeId: types.TNodeId }) => {
  const [selected, setSelected] = React.useState(false);

  const dispatch = types.useDispatch();
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const onClick = React.useCallback(() => {
    if (ref.current) {
      dispatch(
        actions.parseTocAction({
          nodeId: props.nodeId,
          text: ref.current.value,
        }),
      );
    }
  }, [props.nodeId, dispatch]);
  const toggleSelected = React.useCallback(() => {
    setSelected((prev) => !prev);
  }, [setSelected]);

  React.useEffect(() => {
    if (selected) {
      ref.current?.focus();
    }
  }, [selected, ref]);

  return (
    <Component
      onClick={onClick}
      ref={ref}
      selected={selected}
      toggleSelected={toggleSelected}
    />
  );
});

export default TocForm;
