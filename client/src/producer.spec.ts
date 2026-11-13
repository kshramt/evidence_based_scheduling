import { expect, test } from "vitest";
import { apply_patch, compare, comparePersistedData } from "./producer";

test("persisted data patches preserve paths and replay data changes", () => {
  type State = {
    data: { queue: Record<string, number>; ranges: number[] };
    cache: number;
  };
  const previous: State = {
    data: { queue: { a: 1 }, ranges: [1, 2] },
    cache: 1,
  };
  const current: State = { data: { queue: { b: 2 }, ranges: [3] }, cache: 2 };
  const patch = comparePersistedData(previous, current);
  expect(patch).toEqual(
    compare(previous, current).patch.filter(({ path }) =>
      path.startsWith("/data/"),
    ),
  );
  expect(apply_patch(previous, patch, true, false).newDocument).toEqual({
    data: current.data,
    cache: previous.cache,
  });
});

test("cache-only changes generate no persisted patches", () => {
  const data = { queue: { a: 1 } };
  const previous = { data, cache: 1 };
  const current = { data, cache: 2 };
  expect(comparePersistedData(previous, current)).toEqual([]);
});
