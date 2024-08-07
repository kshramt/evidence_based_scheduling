import * as rt from "@kshramt/runtime-type-validator";

import * as times from "src/times";

export const Overlap = {
  NO_OVERLAP: 0,
  CONTAINS: 1,
  OVERLAP: 2,
  CONTAINED: 3,
} as const;
type TOverlap = (typeof Overlap)[keyof typeof Overlap];

const tCount = rt.$required({ c: rt.$number() });
const tLimit = rt.$union(rt.$null(), tCount, times.tTime);
export type TLimit = rt.$infer<typeof tLimit>;

export const tIntervalSet = rt.$readonly(
  rt.$required({
    start: times.tTime, // The start time (inclusive) of the first interval. Timestamp in milliseconds.
    end: times.tTime, // The end time (exclusive) of the first interval. Timestamp in milliseconds.
    limit: tLimit, // null: Unlimited. tCount: The total number of intervals (inclusive). times.tTime: The end time of the last interval. Tiemstamp in milliseconds (exclusive).
    delta: rt.$number(), // The time gap between start times of consective intervals in milliseconds.
  }),
);
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
    return { f: times.ensureFloatingTime(i.end).f + (i.limit.c - 1) * i.delta };
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
  const iLim = Math.floor((queryLimit.f - queryEnd.f) / queryDelta) + 1;
  const iLo = Math.max(
    -1,
    Math.min(Math.floor((start.f - queryEnd.f) / queryDelta), iLim),
  );
  const iHi = Math.max(
    -1,
    Math.min(Math.ceil((end.f - queryStart.f) / queryDelta), iLim),
  );
  if (iLo + 1 < iHi) {
    const i1 = iLo + 1;
    const qStart = queryStart.f + i1 * queryDelta;
    const i2 = iHi - 1;
    const qEnd = queryEnd.f + i2 * queryDelta;
    if (start.f <= qStart && qEnd <= end.f) {
      return Overlap.CONTAINS;
    }
    if (qStart <= start.f && end.f <= qEnd) {
      return Overlap.CONTAINED;
    }
    return Overlap.OVERLAP;
  }
  return Overlap.NO_OVERLAP;
};
