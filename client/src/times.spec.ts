import * as vt from "vitest";

import * as T from "./times";

const UTC01 = 60 * 60 * 1_000;

vt.test("getFloatingTimeOfLocalString", () => {
  vt.expect(
    T.getFloatingTimeOfLocalString("1970-01-01T00:00:00"),
  ).toStrictEqual({ f: 0 });
});

vt.test("getTzTimeOfLocalString", () => {
  vt.expect(
    T.getTzTimeOfLocalString("1970-01-01T00:00:00", UTC01),
  ).toStrictEqual(UTC01);
});

vt.test("getLocalStringOfFloatingTime", () => {
  vt.expect(T.getLocalStringOfFloatingTime({ f: 0 })).toStrictEqual(
    "1970-01-01T00:00:00",
  );
});

vt.test("getLocalStringOfTzTime", () => {
  vt.expect(T.getLocalStringOfTzTime(UTC01 as T.TTzTime, UTC01)).toStrictEqual(
    "1970-01-01T00:00:00",
  );
});

vt.test("datetime-local", () => {
  const sOrig = "1970-01-01T00:00:00";
  const f = T.getFloatingTimeOfLocalString(sOrig);
  const t = T.ensureTzTime(f, UTC01);
  const s = T.getLocalStringOfTzTime(t, UTC01);
  vt.expect(s).toStrictEqual(sOrig);
});

// vt.test("datetime-local", ()=>{
//   const f = T.getFloatingTimeOfLocalString("1970-01-01T00:00:00");
//   const T.ensureTzTime(f, UTC01);
// })
