import * as fast_json_patch from "fast-json-patch";
import * as immer from "immer";

export type { Operation as TOperation } from "fast-json-patch";
export { applyPatch as apply_patch } from "fast-json-patch";

export function produce_with_patche<X>(
  x: X,
  fn: (
    x: immer.Draft<X>,
  ) =>
    | void
    | undefined
    | (immer.Draft<X> extends undefined ? typeof immer.nothing : never)
    | immer.Draft<X>,
) {
  const y = immer.produce(x, fn);
  return { value: y, ...compare(x, y) };
}

export function compare<T>(x: T, y: T) {
  const patch = fast_json_patch.compare(x, y);
  const reverse_patch = fast_json_patch.compare(y, x);
  return { patch, reverse_patch };
}
