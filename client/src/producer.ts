import * as fast_json_patch from "fast-json-patch";
import * as immer from "immer";

export type { Operation as TOperation } from "fast-json-patch";
export { applyPatch as apply_patch } from "fast-json-patch";

export function produce_with_patche<X extends {}>(
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

export function compare<T extends {}>(x: T, y: T) {
  const patch = fast_json_patch.compare(x, y);
  return { patch };
}
