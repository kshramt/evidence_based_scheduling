import * as Immer from "immer";
import * as React from "react";

import CalendarEventForm from "./CalendarEventForm";
import * as actions from "src/actions";
import * as types from "src/types";
import * as utils from "src/utils";

const PlannedEvents = (props: { nodeId: types.TNodeId }) => {
  const events = types.useSelector(
    (state) => state.swapped_nodes.events?.[props.nodeId],
  );
  const dispatch = types.useDispatch();
  const addNewEvent = React.useCallback(
    (event: types.TEvent) => {
      dispatch(actions.addNewEventAction({ nodeId: props.nodeId, event }));
    },
    [dispatch, props.nodeId],
  );
  const eventEls = React.useMemo(() => {
    if (!events) return null;
    const n = events.length;
    return events
      .filter((event) => utils.getEventStatus(event) === "created")
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
            onDelete={() => {
              dispatch(
                actions.updateEventAction({
                  nodeId: props.nodeId,
                  event: Immer.produce(event, (draft) => {
                    draft.status.push(Date.now());
                  }),
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
      <CalendarEventForm onSubmit={addNewEvent} onDelete={noOp} />
      {eventEls}
    </>
  );
};

const noOp = () => {};

export default PlannedEvents;
