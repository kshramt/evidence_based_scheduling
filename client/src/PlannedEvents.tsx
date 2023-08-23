import * as React from "react";

import CalendarEventForm from "./CalendarEventForm";
import * as actions from "src/actions";
import * as types from "src/types";

const PlannedEvents = (props: { nodeId: types.TNodeId }) => {
  const events = types.useSelector(
    (state) => state.data.nodes[props.nodeId].events || [],
  );
  const dispatch = types.useDispatch();
  const addNewEvent = React.useCallback(
    (event: types.TEvent) => {
      dispatch(actions.addNewEventAction({ nodeId: props.nodeId, event }));
    },
    [dispatch, props.nodeId],
  );
  const eventEls = React.useMemo(() => {
    const n = events.length;
    return events
      .slice()
      .reverse()
      .map((event, _i) => {
        const i = n - 1 - _i;
        return (
          <CalendarEventForm
            key={i}
            event={event}
            onSubmit={(event) => {
              dispatch(
                actions.updateEventAction({
                  nodeId: props.nodeId,
                  event,
                  i,
                }),
              );
            }}
          />
        );
      });
  }, [events, props.nodeId, dispatch]);
  return (
    <>
      <CalendarEventForm onSubmit={addNewEvent} />
      {eventEls}
    </>
  );
};

export default PlannedEvents;
