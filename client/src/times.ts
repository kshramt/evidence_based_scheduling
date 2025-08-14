import * as rt from "@kshramt/runtime-type-validator";

type TPath =
  | undefined // Nothing to report
  | { invalid_element_key: { path: TPath } }
  | { invalid_element_value: { key: string | number; path: TPath } }
  | { invalid_value: unknown }
  | { length_not_equal: unknown }
  | { length_too_short: unknown }
  | { not_array: unknown }
  | { not_boolean: unknown }
  | { not_found: string }
  | { not_null: unknown }
  | { not_number: unknown }
  | { not_object: unknown }
  | { not_string: unknown }
  | { not_undefined: unknown }
  | { not_union: TPath[] };

type TRef<T> = { value?: T };
type TValidator<T> = (value: unknown, path?: TRef<TPath>) => value is T;
const isObject = (value: unknown): value is Record<string, unknown> => {
  return value?.constructor === Object;
};
const required = <Kvs extends Record<string, TValidator<unknown>>>(
  kvs: Kvs,
) => {
  return (
    value: unknown,
    path?: TRef<TPath>,
  ): value is {
    [K in keyof Kvs]: rt.$infer<Kvs[K]>;
  } => {
    if (!isObject(value)) {
      if (path) {
        path.value = { not_object: value };
      }
      return false;
    }
    for (const k in kvs) {
      const validator = kvs[k];
      if (!(k in value)) {
        if (path) {
          path.value = { not_found: k };
        }
        return false;
      } else {
        if (value[k] === null) {
          value[k] = 946684800000; // === (new Date("2000-01-01T00:00:00Z")).getTime();
        }
        const result = validator(value[k], path);
        if (!result) {
          if (path) {
            path.value = {
              invalid_element_value: { key: k, path: path.value },
            };
          }
          return false;
        }
      }
    }
    return true;
  };
};
export const tFloatingTime = required({ f: rt.$number() });
export const tTzTime = rt.$number();
export const tTime = rt.$union(tFloatingTime, tTzTime);

export type TFloatingTime = rt.$infer<typeof tFloatingTime>;
export type TTzTime = rt.$infer<typeof tTzTime>;
export type TTime = rt.$infer<typeof tTime>;

export const getFloatingTimeOfLocalString = (
  localString: string,
): TFloatingTime => {
  let f = new Date(localString + "Z").getTime();
  if (isNaN(f)) {
    f = 946684800000; // === (new Date("2000-01-01T00:00:00Z")).getTime();
  }
  return { f };
};

export const getTzTimeOfLocalString = (
  localString: string,
  offset: number = getOffset(),
): TTzTime => {
  return getTzTimeOfFloatingTime(
    getFloatingTimeOfLocalString(localString),
    offset,
  );
};

export const getLocalStringOfTzTime = (
  tzTime: TTzTime,
  offset: number = getOffset(),
) => {
  return getLocalStringOfFloatingTime(getFloatingTimeOfTzTime(tzTime, offset));
};

export const getLocalStringOfFloatingTime = (floatingTime: TFloatingTime) => {
  const date = new Date(floatingTime.f);
  const y = date.getUTCFullYear().toString();
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  const H = date.getUTCHours().toString().padStart(2, "0");
  const M = date.getUTCMinutes().toString().padStart(2, "0");
  const S = date.getUTCSeconds().toString().padStart(2, "0");
  return `${y}-${m}-${d}T${H}:${M}:${S}`;
};

export const getTzNow = (): TTzTime => {
  return Date.now();
};

export const getFloatingNow = (offset: number = getOffset()): TFloatingTime => {
  return getFloatingTimeOfTzTime(getTzNow(), offset);
};

export const getTzTimeOfFloatingTime = (
  floatingTime: TFloatingTime,
  offset: number = getOffset(),
): TTzTime => {
  return floatingTime.f + offset;
};

export const getFloatingTimeOfTzTime = (
  tzTime: TTzTime,
  offset: number = getOffset(),
): TFloatingTime => {
  return { f: tzTime - offset };
};

export const ensureTzTime = (
  time: TTime,
  offset: number = getOffset(),
): TTzTime => {
  if (tTzTime(time)) {
    return time;
  }
  return getTzTimeOfFloatingTime(time, offset);
};

export const ensureFloatingTime = (
  time: TTime,
  offset: number = getOffset(),
): TFloatingTime => {
  if (tTzTime(time)) {
    return getFloatingTimeOfTzTime(time, offset);
  }
  return time;
};

export const getOffset = () => {
  return new Date().getTimezoneOffset() * 60 * 1_000;
};
