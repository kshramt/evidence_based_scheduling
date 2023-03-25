import { it, expect } from "vitest";
import { MultiSet } from "./multiset";

it("sum", () => {
  const ms = new MultiSet<number>();
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
