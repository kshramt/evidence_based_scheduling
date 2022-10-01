import React from "react";

import * as types from "./types";

export const join = (...xs: (undefined | null | false | string)[]) =>
  xs.filter(Boolean).join(" ");

export const useClipboard = (text: string) => {
  const [is_copied, set_is_copied] = React.useState(false);
  const copy = React.useCallback(() => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        set_is_copied(true);
        setTimeout(() => set_is_copied(false), 400);
      })
      .catch(() => set_is_copied(false));
  }, [text]);
  return React.useMemo(
    () => ({
      copy,
      is_copied,
    }),
    [copy, is_copied],
  );
};

let _VISIT_COUNTER = 0;
export const visit_counter_of = () => ++_VISIT_COUNTER;
export const vids: types.IVids = {};

export const datetime_local_of_milliseconds = (milliseconds: number) => {
  const date = new Date(milliseconds);
  const y = date.getFullYear().toString();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  const H = date.getHours().toString().padStart(2, "0");
  const M = date.getMinutes().toString().padStart(2, "0");
  const S = date.getSeconds().toString().padStart(2, "0");
  return `${y}-${m}-${d}T${H}:${M}:${S}`;
};

export const milliseconds_of_datetime_local = (datetime_local: string) => {
  const date = new Date(datetime_local);
  return Number(date);
};

export const memoize1 = <A, R>(fn: (a: A) => R) => {
  const cache = new Map<A, R>();
  return (a: A) => {
    if (!cache.has(a)) {
      cache.set(a, fn(a));
    }
    return cache.get(a) as R;
  };
};

export const memoize2 = <A, B, R>(fn: (a: A, b: B) => R) => {
  const cache = new Map<A, Map<B, R>>();
  return (a: A, b: B) => {
    if (!cache.has(a)) {
      cache.set(a, new Map<B, R>());
    }
    const c = cache.get(a) as Map<B, R>;
    if (!c.has(b)) {
      c.set(b, fn(a, b));
    }
    return c.get(b) as R;
  };
};
