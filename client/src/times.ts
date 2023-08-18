import * as rt from "@kshramt/runtime-type-validator";

export const tFloatingTime = rt.$object({ f: rt.$number() });
export const tTzTime = rt.$number();
export const tTime = rt.$union(tFloatingTime, tTzTime);

export type TFloatingTime = rt.$infer<typeof tFloatingTime>;
export type TTzTime = rt.$infer<typeof tTzTime>;
export type TTime = rt.$infer<typeof tTime>;

export const getFloatingTimeOfLocalString = (
  localString: string,
): TFloatingTime => {
  return { f: new Date(localString + "Z").getTime() };
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
