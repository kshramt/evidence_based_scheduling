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
  vt.expect(
    T.getOverlapState({ f: 0 }, { f: 10 }, { f: 20 }, { f: 30 }, 20, {
      f: 1000,
    }),
  ).toStrictEqual(T.Overlap.NO_OVERLAP);
  vt.expect(
    T.getOverlapState({ f: 0 }, { f: 10 }, { f: 0 }, { f: 30 }, 30, {
      f: 1000,
    }),
  ).toStrictEqual(T.Overlap.CONTAINED);
  vt.expect(
    T.getOverlapState({ f: 10 }, { f: 20 }, { f: 0 }, { f: 30 }, 30, {
      f: 1000,
    }),
  ).toStrictEqual(T.Overlap.CONTAINED);
  vt.expect(
    T.getOverlapState({ f: 0 }, { f: 1 }, { f: 0 }, { f: 4 }, 1, {
      f: 4,
    }),
  ).toStrictEqual(T.Overlap.CONTAINED);
});
vt.test("getFloatingTimeOfLimit", () => {
  vt.expect(
    T.getFloatingTimeOfLimit({
      start: { f: 0 },
      end: { f: 4 },
      delta: 1,
      limit: { c: 1 },
    }),
  ).toStrictEqual({ f: 4 });
  vt.expect(
    T.getFloatingTimeOfLimit({
      start: { f: 0 },
      end: { f: 4 },
      delta: 1,
      limit: { c: 2 },
    }),
  ).toStrictEqual({ f: 5 });
});
