import * as immer from "immer";
import * as React from "react";

import { DAY, HOUR, MINUTE } from "src/consts";
import * as consts from "src/consts";
import * as intervals from "src/intervals";
import * as times from "src/times";
import * as types from "src/types";

const getLimitType = (limit: intervals.TLimit) => {
  if (limit === null) {
    return "None";
  } else if (times.tTime(limit)) {
    return "Until";
  } else {
    return "Count";
  }
};

const LocalTimeField = ({
  t,
  setT,
  label,
  valid,
  setValid,
}: {
  t: times.TTime;
  setT: (t: times.TTime) => void;
  label: string;
  valid: boolean;
  setValid: (valid: boolean) => void;
}) => {
  const handleTimeChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = times.parseFloatingTimeOfLocalString(e.currentTarget.value);
      setValid(time !== null);
      if (time === null) return;
      setT(times.tTzTime(t) ? times.getTzTimeOfFloatingTime(time) : time);
    },
    [t, setT, setValid],
  );
  const handleTzChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    [t, setT],
  );

  return (
    <>
      <input
        type="datetime-local"
        aria-label={label}
        aria-invalid={!valid}
        value={valid ? times.getLocalStringOfTzTime(times.ensureTzTime(t)) : ""}
        onChange={handleTimeChange}
      />
      <span className="text-right">TZ:</span>
      <input
        type="checkbox"
        disabled={!valid}
        className="self-stretch"
        checked={times.tTzTime(t)}
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
  onDelete: () => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const handleSubmit = React.useMemo(() => {
    const onSubmit = props.onSubmit;
    return (event: types.TEvent) => {
      onSubmit(event);
      setOpen(false);
    };
  }, [props.onSubmit]);
  const handleOpen = React.useCallback(() => {
    setOpen(true);
  }, [setOpen]);
  if (open || props.event === undefined) {
    return (
      <CalendarEventFormImpl event={props.event} onSubmit={handleSubmit} />
    );
  }
  const start = times.ensureFloatingTime(props.event.interval_set.start);
  const end = times.ensureFloatingTime(props.event.interval_set.end);
  const duration = (end.f - start.f) / MINUTE;
  const delta = props.event.interval_set.delta / HOUR;
  return (
    <div>
      <button onClick={handleOpen}>
        {times.getLocalStringOfFloatingTime(start)} + {duration} min / {delta} h
      </button>
      <button onClick={props.onDelete}>{consts.DELETE_MARK}</button>
    </div>
  );
};

const CalendarEventFormImpl = (props: {
  event?: undefined | types.TEvent;
  onSubmit: (event: types.TEvent) => void;
}) => {
  const today = React.useMemo(() => {
    return { f: Math.floor(times.getFloatingNow().f / DAY) * DAY };
  }, []);
  const tomorrow = React.useMemo(() => {
    return { f: today.f + DAY };
  }, [today]);
  const [start, setStart] = React.useState<times.TTime>(
    props.event?.interval_set.start ?? today,
  );
  const [startValid, setStartValid] = React.useState(true);
  const [untilValid, setUntilValid] = React.useState(true);
  const canSubmit = startValid && untilValid;

  const [duration, setDuration] = React.useState<number>(
    props.event
      ? times.ensureTzTime(props.event.interval_set.end) -
          times.ensureTzTime(props.event.interval_set.start)
      : DAY,
  );
  const handleDurationChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const duration = parseFloat(e.target.value);
      if (isNaN(duration)) {
        return;
      }
      setDuration(Math.floor(duration * MINUTE));
    },
    [setDuration],
  );

  const [delta, setDelta] = React.useState<number>(
    props.event?.interval_set.delta || DAY,
  ); // 0 will not happen in practice.
  const handleDeltaChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const delta = parseFloat(e.target.value);
      if (isNaN(delta)) {
        return;
      }
      setDelta(Math.floor(delta * HOUR));
    },
    [setDelta],
  );

  const [limit, setLimit] = React.useState<intervals.TLimit>(
    props.event === undefined ? { c: 1 } : props.event.interval_set.limit,
  );
  const handleCountLimitChange = React.useCallback(
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
      setUntilValid(true);
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

  const handleSubmit = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const propsEvent = props.event;
      const propsOnSubmit = props.onSubmit;
      e.preventDefault();
      if (!canSubmit) return;
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
              status: [times.getTzNow()],
            }
          : immer.produce(propsEvent, (draft) => {
              draft.interval_set.start = start;
              draft.interval_set.end = end;
              draft.interval_set.delta = delta;
              draft.interval_set.limit = limit;
            });
      propsOnSubmit(event);
    },
    [start, duration, props.event, props.onSubmit, delta, limit, canSubmit],
  );

  return (
    <div
      className="grid items-baseline gap-[0.5em] whitespace-nowrap justify-start"
      style={gridStyle}
    >
      {/* Row 1 */}
      <span className="text-right">Start:</span>
      <LocalTimeField
        label="Event start"
        t={start}
        setT={setStart}
        valid={startValid}
        setValid={setStartValid}
      />

      {/* Row 2 */}
      <span className="text-right">Duration (min):</span>
      <input
        type="number"
        required
        value={duration / MINUTE}
        onChange={handleDurationChange}
      />
      <div />
      <div />

      {/* Row 3 */}
      <span className="text-right">Delta (h):</span>
      <input
        type="number"
        required
        value={delta / HOUR}
        onChange={handleDeltaChange}
      />
      <div />
      <div />

      {/* Row 4 */}
      <span className="text-right">Limit type:</span>
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
          <span className="text-right">Limit:</span>
          {times.tTime(limit) ? (
            <LocalTimeField
              label="Repeat until"
              t={limit}
              setT={setLimit}
              valid={untilValid}
              setValid={setUntilValid}
            />
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
        {!canSubmit && (
          <span role="status">
            {startValid
              ? "Enter a valid repeat-until time."
              : "Enter a valid start time."}
          </span>
        )}
        <button
          type="button"
          className="btn-icon"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          Set event
        </button>
      </div>
    </div>
  );
};

export default CalendarEventForm;
