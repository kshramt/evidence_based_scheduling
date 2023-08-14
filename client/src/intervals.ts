export const Overlap = {
  NO_OVERLAP: 0,
  CONTAINS: 1,
  OVERLAP: 2,
  CONTAINED: 3,
} as const;
type TOverlap = (typeof Overlap)[keyof typeof Overlap];

export type TIntervalSet = {
  start: number; // The start time (inclusive) of the first interval. Timestamp in milliseconds
  end: number; // The end time (exclusive) of the first interval. Timestamp in milliseconds.
  is_utc: boolean; // Whether the timestamps are in UTC or floating.
  limit: number; // 0: Unlimited. < 0: The total number of intervals (inclusive) negated. 0 <: The end time of the last interval. Tiemstamp in milliseconds (exclusive).
  frequency: number; // The time gap between start times of consective intervals in milliseconds.
};

/**
 * Returns the overlap state between two intervals.
 * @param start The start time (inclusive) of the query interval. Timestamp in milliseconds.
 * @param end The end time (exclusive) of the query interval. Timestamp in milliseconds.
 * @param i The interval set to be queried.
 */
const getOverlapState = (
  start: number,
  end: number,
  i: TIntervalSet,
): TOverlap => {
  const intervalStart = getLastStartBefore(end, i);
  if (intervalStart === null) {
    return Overlap.NO_OVERLAP;
  }
  const intervalEnd = intervalStart + i.end - i.start;
  if (intervalEnd <= start) {
    return Overlap.NO_OVERLAP;
  }
  if (intervalStart < start && end < intervalEnd) {
    return Overlap.CONTAINED;
  }
  if (start <= intervalStart && intervalEnd <= end) {
    return Overlap.CONTAINS;
  }
  return Overlap.OVERLAP;
};

const getLastStartBefore = (t: number, i: TIntervalSet) => {
  if (t <= i.start) {
    return null;
  }
  return i.start + Math.floor((t - i.start) / i.frequency) * i.frequency;
};
