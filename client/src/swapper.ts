export type TSwapped<K1 extends PropertyKey, Data> = Required<{
  [k2 in keyof Data]: { [k1 in K1]: Data[k2] };
}>;
export type TSwapped1<R> = R extends Record<infer K1, infer Data>
  ? TSwapped<K1, Data>
  : never;

export const add = <K1 extends PropertyKey, Data>(
  x: Record<K1, Data>,
  swapped: TSwapped<K1, Data>,
  k1: K1,
  value: Data,
) => {
  x[k1] = value;
  for (const k2 in value) {
    if (!swapped[k2]) {
      // @ts-expect-error
      swapped[k2] = {};
    }
    swapped[k2][k1] = value[k2];
  }
};

export const del = <K1 extends PropertyKey, Data>(
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
    if (!(k2 in swapped)) {
      continue;
    }
    delete swapped[k2][k1];
  }
};

export const del2 = <K1 extends PropertyKey, Data>(
  x: Record<K1, Data>,
  swapped: TSwapped<K1, Data>,
  k1: K1,
  k2: keyof Data,
) => {
  if (!(k1 in x)) {
    return;
  }
  delete x[k1][k2];
  if (!(k2 in swapped)) {
    return;
  }
  delete swapped[k2][k1];
};

export const set = <K1 extends PropertyKey, Data>(
  x: Record<K1, Data>,
  swapped: TSwapped<K1, Data>,
  k1: K1,
  k2: keyof Data,
  value: Data[typeof k2],
) => {
  x[k1][k2] = value;
  swapped[k2][k1] = value;
};

export const swapKeys = <K1 extends PropertyKey, Data>(x: Record<K1, Data>) => {
  // @ts-expect-error
  const swapped: TSwapped<K1, Data> = {};
  for (const k1 in x) {
    add(x, swapped, k1, x[k1]);
  }
  return swapped;
};
