const INTERSECTION_NO_OVERLAP = 0;
const INTERSECTION_CONTAINS = 1;
const INTERSECTION_OVERLAP = 2;
const INTERSECTION_CONTAINED = 3;
export type TIntersectionState =
  | typeof INTERSECTION_NO_OVERLAP
  | typeof INTERSECTION_CONTAINS
  | typeof INTERSECTION_OVERLAP
  | typeof INTERSECTION_CONTAINED;

export type TIntervalSet = {
  start: number; // The start time (inclusive) of the first interval. Timestamp in milliseconds
  end: number; // The end time (exclusive) of the first interval. Timestamp in milliseconds.
  is_utc: boolean; // Whether the timestamps are in UTC or floating.
  limit: number; // 0: Unlimited. < 0: The total number of intervals (inclusive) negated. 0 <: The end time of the last interval. Tiemstamp in milliseconds (exclusive).
  frequency: number; // The time gap between start times of consective intervals in milliseconds.
  created_at: number; // Timestamp in milliseconds.
};

/**
 * Returns the intersection type between two intervals.
 * @param start The start time (inclusive) of the query interval. Timestamp in milliseconds.
 * @param end The end time (exclusive) of the query interval. Timestamp in milliseconds.
 * @param i The interval set to be queried.
 */
const getIntersectionState = (
  start: number,
  end: number,
  i: TIntervalSet,
): TIntersectionState => {
  const intervalStart = getLastStartBefore(end, i);
  if (intervalStart === null) {
    return INTERSECTION_NO_OVERLAP;
  }
  const intervalEnd = intervalStart + i.end - i.start;
  if (intervalEnd <= start) {
    return INTERSECTION_NO_OVERLAP;
  }
  if (intervalStart < start && end < intervalEnd) {
    return INTERSECTION_CONTAINED;
  }
  if (start <= intervalStart && intervalEnd <= end) {
    return INTERSECTION_CONTAINS;
  }
  return INTERSECTION_OVERLAP;
};

const getLastStartBefore = (t: number, i: TIntervalSet) => {
  if (t <= i.start) {
    return null;
  }
  return i.start + Math.floor((t - i.start) / i.frequency) * i.frequency;
};
