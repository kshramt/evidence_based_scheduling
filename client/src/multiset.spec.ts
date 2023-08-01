import { test, expect } from "vitest";
import * as T from "./multiset";

test("MultiSet", () => {
  const ms = new T.MultiSet<number>();
  expect(ms.has(0)).toBeFalsy();
  ms.add(0);
  expect(ms.has(0)).toBeTruthy();
  ms.add(0);
  expect(ms.has(0)).toBeTruthy();
  ms.delete(0);
  expect(ms.has(0)).toBeTruthy();
  ms.delete(0);
  expect(ms.has(0)).toBeFalsy();
});
