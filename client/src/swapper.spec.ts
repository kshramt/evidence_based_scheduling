import * as rt from "@kshramt/runtime-type-validator";
import * as immer from "immer";
import * as vt from "vitest";

import * as T from "./swapper";

vt.test("swapKeys", ({ expect }) => {
  const tid = rt.$opaque("Tid", rt.$string());
  const t = rt.$record(
    tid,
    rt.$required({
      a: rt.$string(),
      b: rt.$number(),
    }),
  );
  const data = rt.parse(t, {
    k1: { a: "a", b: 2 },
    k2: { a: "b", b: 3 },
  });
  if (data.success) {
    const swapped = T.swapKeys(data.value);
    expect(swapped).toStrictEqual({
      a: { k1: "a", k2: "b" },
      b: { k1: 2, k2: 3 },
    });

    const data2 = immer.produce({ data: data.value, swapped }, (draft) => {
      const k3res = rt.parse(tid, "k3");
      if (k3res.success) {
        T.add(draft.data, draft.swapped, k3res.value, { a: "c", b: 4 });
      } else {
        expect(k3res.success).toBeTruthy();
      }
    });
    expect(data2).toStrictEqual({
      data: {
        k1: { a: "a", b: 2 },
        k2: { a: "b", b: 3 },
        k3: { a: "c", b: 4 },
      },
      swapped: {
        a: { k1: "a", k2: "b", k3: "c" },
        b: { k1: 2, k2: 3, k3: 4 },
      },
    });
    const data3 = immer.produce(data2, (draft) => {
      const k3res = rt.parse(tid, "k3");
      if (k3res.success) {
        T.set(draft.data, draft.swapped, k3res.value, "a", "d");
      } else {
        expect(k3res.success).toBeTruthy();
      }
    });
    expect(data3).toStrictEqual({
      data: {
        k1: { a: "a", b: 2 },
        k2: { a: "b", b: 3 },
        k3: { a: "d", b: 4 },
      },
      swapped: {
        a: { k1: "a", k2: "b", k3: "d" },
        b: { k1: 2, k2: 3, k3: 4 },
      },
    });
    const data4 = immer.produce(data3, (draft) => {
      const k3res = rt.parse(tid, "k3");
      if (k3res.success) {
        T.del2(draft.data, draft.swapped, k3res.value, "a");
      } else {
        expect(k3res.success).toBeTruthy();
      }
    });
    expect(data4).toStrictEqual({
      data: {
        k1: { a: "a", b: 2 },
        k2: { a: "b", b: 3 },
        k3: { b: 4 },
      },
      swapped: {
        a: { k1: "a", k2: "b" },
        b: { k1: 2, k2: 3, k3: 4 },
      },
    });
    const data5 = immer.produce(data4, (draft) => {
      const k3res = rt.parse(tid, "k3");
      if (k3res.success) {
        T.del(draft.data, draft.swapped, k3res.value);
      } else {
        expect(k3res.success).toBeTruthy();
      }
    });
    expect(data5).toStrictEqual({
      data: {
        k1: { a: "a", b: 2 },
        k2: { a: "b", b: 3 },
      },
      swapped: {
        a: { k1: "a", k2: "b" },
        b: { k1: 2, k2: 3 },
      },
    });
  } else {
    expect(data.success).toBeTruthy();
  }
});
