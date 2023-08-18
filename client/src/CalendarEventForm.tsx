import * as immer from "immer";
import React, { useState, useCallback } from "react";

import * as intervals from "src/intervals";
import * as times from "src/times";
import * as types from "src/types";

const MINUTE = 60 * 1_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const getLimitType = (limit: intervals.TLimit) => {
  if (limit === null) {
    return "None";
  } else if (times.tTime(limit)) {
    return "Until";
  } else {
    return "Count";
  }
};

const LocalTimeField = (props: {
  t: times.TTime;
  setT: (t: times.TTime) => void;
}) => {
  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const setT = props.setT;
      const t = props.t;
      setT(
        (times.tTzTime(t)
          ? times.getTzTimeOfLocalString
          : times.getFloatingTimeOfLocalString)(e.target.value),
      );
    },
    [props.t, props.setT],
  );
  const handleTzChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const setT = props.setT;
      const t = props.t;
      if (times.tTzTime(t)) {
        if (!e.target.checked) {
          setT(times.getFloatingTimeOfTzTime(t));
        }
      } else {
        if (e.target.checked) {
          setT(times.getTzTimeOfFloatingTime(t));
        }
      }
    },
    [props.t, props.setT],
  );

  return (
    <>
      <input
        type="datetime-local"
        value={times.getLocalStringOfTzTime(times.ensureTzTime(props.t))}
        onChange={handleTimeChange}
      />
      <label className="text-right">TZ:</label>
      <input
        type="checkbox"
        className="self-stretch"
        checked={times.tTzTime(props.t)}
        onChange={handleTzChange}
      />
    </>
  );
};

const gridStyle = { gridTemplateColumns: "auto auto auto auto" };
const buttonRowStyle = { gridColumn: "span 4" };

const CalendarEventForm = (props: {
  event?: types.TEvent;
  onSubmit: (event: types.TEvent) => void;
}) => {
  const today = React.useMemo(() => {
    return { f: Math.floor(times.getFloatingNow().f / DAY) * DAY };
  }, []);
  const tomorrow = React.useMemo(() => {
    return { f: today.f + DAY };
  }, [today]);
  const [start, setStart] = useState<times.TTime>(
    props.event?.interval_set.start || today,
  ); // 0 will not happen in practice.

  const [duration, setDuration] = useState<number>(
    props.event
      ? times.ensureTzTime(props.event.interval_set.end) -
          times.ensureTzTime(props.event.interval_set.start)
      : DAY,
  );
  const handleDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const duration = parseFloat(e.target.value);
      if (isNaN(duration)) {
        return;
      }
      setDuration(Math.floor(duration * MINUTE));
    },
    [setDuration],
  );

  const [delta, setDelta] = useState<number>(
    props.event?.interval_set.delta || DAY,
  ); // 0 will not happen in practice.
  const handleDeltaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const delta = parseFloat(e.target.value);
      if (isNaN(delta)) {
        return;
      }
      setDelta(Math.floor(delta * HOUR));
    },
    [setDelta],
  );

  const [limit, setLimit] = useState<intervals.TLimit>(
    props.event === undefined ? { c: 1 } : props.event.interval_set.limit,
  );
  const handleCountLimitChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const c = parseInt(e.target.value);
      if (isNaN(c)) {
        return;
      }
      setLimit({ c });
    },
    [setLimit],
  );

  const handleLimitTypeChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (e.target.value === "Count") {
        setLimit({ c: 1 });
      } else if (e.target.value === "Until") {
        setLimit(tomorrow);
      } else {
        setLimit(null);
      }
    },
    [tomorrow],
  );

  const handleSubmit = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const propsEvent = props.event;
      const propsOnSubmit = props.onSubmit;
      e.preventDefault();
      const end = times.tTzTime(start)
        ? start + duration
        : { f: start.f + duration };
      const event: types.TEvent =
        propsEvent === undefined
          ? {
              interval_set: {
                start,
                end,
                delta,
                limit,
              },
              created_at: times.getTzNow(),
              status: "created",
            }
          : immer.produce(propsEvent, (draft) => {
              draft.interval_set.start = start;
              draft.interval_set.end = end;
              draft.interval_set.delta = delta;
              draft.interval_set.limit = limit;
            });
      propsOnSubmit(event);
    },
    [start, duration, props.event, props.onSubmit, delta, limit],
  );

  return (
    <div
      className="grid items-baseline gap-[0.5em] whitespace-nowrap justify-start"
      style={gridStyle}
    >
      {/* Row 1 */}
      <label className="text-right">Start:</label>
      <LocalTimeField t={start} setT={setStart} />

      {/* Row 2 */}
      <label className="text-right">Duration (min):</label>
      <input
        type="number"
        required
        value={duration / MINUTE}
        onChange={handleDurationChange}
      />
      <div />
      <div />

      {/* Row 3 */}
      <label className="text-right">Delta (h):</label>
      <input
        type="number"
        required
        value={delta / HOUR}
        onChange={handleDeltaChange}
      />
      <div />
      <div />

      {/* Row 4 */}
      <label className="text-right">Limit type:</label>
      <select value={getLimitType(limit)} onChange={handleLimitTypeChange}>
        <option value="None">None</option>
        <option value="Count">Count</option>
        <option value="Until">Until</option>
      </select>
      <div />
      <div />

      {/* Conditional Row 5 */}
      {limit !== null && (
        <>
          <label className="text-right">Limit:</label>
          {times.tTime(limit) ? (
            <LocalTimeField t={limit} setT={setLimit} />
          ) : (
            <input
              type="number"
              value={limit.c}
              required
              onChange={handleCountLimitChange}
            />
          )}
          <div />
          <div />
        </>
      )}

      {/* Row 6 */}
      <div className="text-center" style={buttonRowStyle}>
        <button className="btn-icon" onClick={handleSubmit}>
          Set event
        </button>
      </div>
    </div>
  );
};

export default CalendarEventForm;
