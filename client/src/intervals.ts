import * as rt from "@kshramt/runtime-type-validator";

import * as times from "src/times";

export const Overlap = {
  NO_OVERLAP: 0,
  CONTAINS: 1,
  OVERLAP: 2,
  CONTAINED: 3,
} as const;
type TOverlap = (typeof Overlap)[keyof typeof Overlap];

const tCount = rt.$object({ c: rt.$number() });
const tLimit = rt.$union(rt.$null(), tCount, times.tTime);
export type TLimit = rt.$infer<typeof tLimit>;

export const tIntervalSet = rt.$object({
  start: rt.$readonly(times.tTime), // The start time (inclusive) of the first interval. Timestamp in milliseconds.
  end: rt.$readonly(times.tTime), // The end time (exclusive) of the first interval. Timestamp in milliseconds.
  limit: rt.$readonly(tLimit), // null: Unlimited. tCount: The total number of intervals (inclusive). times.tTime: The end time of the last interval. Tiemstamp in milliseconds (exclusive).
  delta: rt.$readonly(rt.$number()), // The time gap between start times of consective intervals in milliseconds.
});
export type TIntervalSet = rt.$infer<typeof tIntervalSet>;

export const getFloatingTimeOfLimit = (
  i: TIntervalSet,
): times.TFloatingTime => {
  if (i.limit === null) {
    return { f: Infinity };
  } else if (times.tTzTime(i.limit)) {
    return times.getFloatingTimeOfTzTime(i.limit);
  } else if (times.tFloatingTime(i.limit)) {
    return i.limit;
  } else {
    return { f: times.ensureFloatingTime(i.start).f + i.limit.c * i.delta };
  }
};

/**
 * Returns the overlap state between two intervals.
 * @param start The start time (inclusive) of the target interval. Timestamp in milliseconds.
 * @param end The end time (exclusive) of the target interval. Timestamp in milliseconds.
 * @param queryStart The start time of the query interval.
 * @param queryEnd The end time of the query interval.
 * @param queryDelta The time gap between start times of consective intervals in milliseconds.
 * @param queryLimit The end time of the last interval of the query interval set should be less than or equal to this value.
 */
export const getOverlapState = (
  start: times.TFloatingTime,
  end: times.TFloatingTime,
  queryStart: times.TFloatingTime,
  queryEnd: times.TFloatingTime,
  queryDelta: number,
  queryLimit: times.TFloatingTime,
): TOverlap => {
  if (end.f <= queryStart.f) {
    return Overlap.NO_OVERLAP;
  }
  const i = Math.floor(
    (Math.min(end.f, queryLimit.f) - queryEnd.f) / queryDelta,
  );
  const qEnd = queryEnd.f + i * queryDelta;
  const qStart = qEnd - (queryEnd.f - queryStart.f);
  if (qEnd <= start.f || end.f <= qStart) {
    return Overlap.NO_OVERLAP;
  }
  if (qStart < start.f && end.f < qEnd) {
    return Overlap.CONTAINED;
  }
  if (start.f <= qStart && qEnd <= end.f) {
    return Overlap.CONTAINS;
  }
  return Overlap.OVERLAP;
};
