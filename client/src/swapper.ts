export type TSwapped<K1 extends PropertyKey, Data> = Partial<{
  [k2 in keyof Data]: { [k1 in K1]: Data[k2] };
}>;
export type TSwapped1<R> =
  R extends Record<infer K1, infer Data> ? TSwapped<K1, Data> : never;

export const add = <K1 extends PropertyKey, Data extends object>(
  x: Record<K1, Data>,
  swapped: TSwapped<K1, Data>,
  k1: K1,
  value: Data,
) => {
  x[k1] = value;
  addToSwapped(k1, swapped, value);
};

export const del = <K1 extends PropertyKey, Data extends object>(
  x: Record<K1, Data>,
  swapped: TSwapped<K1, Data>,
  k1: K1,
) => {
  if (!(k1 in x)) {
    return;
  }
  const value = x[k1];
  delete x[k1];
  for (const k2 in value) {
    if (!Object.prototype.hasOwnProperty.call(value, k2)) {
      continue;
    }
    delete swapped[k2]?.[k1];
  }
};

export const del2 = <K1 extends PropertyKey, Data extends object>(
  x: Record<K1, Data>,
  swapped: TSwapped<K1, Data>,
  k1: K1,
  k2: keyof Data,
) => {
  if (!(k1 in x)) {
    return;
  }
  delete x[k1][k2];
  delete swapped[k2]?.[k1];
};

export const set = <K1 extends PropertyKey, Data extends object>(
  x: Record<K1, Data>,
  swapped: TSwapped<K1, Data>,
  k1: K1,
  k2: keyof Data,
  value: Data[typeof k2],
) => {
  x[k1][k2] = value;
  if (swapped[k2] === undefined) {
    // @ts-expect-error Just ignore the error.
    swapped[k2] = { [k1]: value };
  } else {
    // @ts-expect-error Just ignore the error.
    swapped[k2][k1] = value;
  }
};

export const swapKeys = <K1 extends PropertyKey, Data extends object>(
  x: Record<K1, Data>,
) => {
  const swapped: TSwapped<K1, Data> = {};
  for (const k1 in x) {
    if (!Object.prototype.hasOwnProperty.call(x, k1)) {
      continue;
    }
    addToSwapped(k1, swapped, x[k1]);
  }
  return swapped;
};

const addToSwapped = <K1 extends PropertyKey, Data extends object>(
  k1: K1,
  swapped: TSwapped<K1, Data>,
  value: Data,
) => {
  for (const k2 in value) {
    if (!Object.prototype.hasOwnProperty.call(value, k2)) {
      continue;
    }
    if (swapped[k2] === undefined) {
      // @ts-expect-error Just ignore the error.
      swapped[k2] = { [k1]: value[k2] };
    } else {
      // @ts-expect-error Just ignore the error.
      swapped[k2][k1] = value[k2];
    }
  }
  return swapped;
};
