import * as vt from "vitest";

import * as T from "./intervals";

vt.test("getOverlapState", () => {
  vt.expect(
    T.getOverlapState({ f: 0 }, { f: 10 }, { f: 0 }, { f: 10 }, 20, { f: 20 }),
  ).toStrictEqual(T.Overlap.CONTAINS);
  vt.expect(
    T.getOverlapState({ f: 0 }, { f: 20 }, { f: 0 }, { f: 10 }, 20, { f: 20 }),
  ).toStrictEqual(T.Overlap.CONTAINS);
  vt.expect(
    T.getOverlapState({ f: 0 }, { f: 10 }, { f: 0 }, { f: 10 }, 30, {
      f: 1000,
    }),
  ).toStrictEqual(T.Overlap.CONTAINS);
  vt.expect(
    T.getOverlapState({ f: 10 }, { f: 20 }, { f: 0 }, { f: 10 }, 30, {
      f: 1000,
    }),
  ).toStrictEqual(T.Overlap.NO_OVERLAP);
  vt.expect(
    T.getOverlapState({ f: 20 }, { f: 30 }, { f: 0 }, { f: 10 }, 30, {
      f: 1000,
    }),
  ).toStrictEqual(T.Overlap.NO_OVERLAP);
  vt.expect(
    T.getOverlapState({ f: 30 }, { f: 40 }, { f: 0 }, { f: 10 }, 30, {
      f: 1000,
    }),
  ).toStrictEqual(T.Overlap.CONTAINS);
});
