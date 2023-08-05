import * as idb from "idb";
import React from "react";

import * as types from "./types";

// Vose (1991)'s linear version of Walker (1974)'s alias method.
// A Pactical Version of Vose's Algorithm: https://www.keithschwarz.com/darts-dice-coins/
export class Multinomial {
  i_large_of: number[];
  thresholds: number[];
  constructor(ws: number[]) {
    const n = ws.length;
    const total = sum(ws);
    const thresholds = Array(n);
    const i_large_of = Array(n);
    const i_small_list = Array(n);
    const i_large_list = Array(n);
    let small_last = -1;
    let large_last = -1;
    {
      const coef = n / total;
      for (let i = 0; i < ws.length; ++i) {
        const w = coef * ws[i];
        thresholds[i] = w;
        if (w <= 1) {
          i_small_list[++small_last] = i;
        } else {
          i_large_list[++large_last] = i;
        }
      }
    }
    while (-1 < small_last && -1 < large_last) {
      const i_small = i_small_list[small_last];
      --small_last;
      const i_large = i_large_list[large_last];
      i_large_of[i_small] = i_large;
      thresholds[i_large] = thresholds[i_large] + thresholds[i_small] - 1;
      if (thresholds[i_large] <= 1) {
        --large_last;
        i_small_list[++small_last] = i_large;
      }
    }
    // Loop for large_last is not necessary since thresholds for them are greater than one and are always accepted.
    for (let i = 0; i < small_last + 1; ++i) {
      thresholds[i_small_list[i]] = 1; // Address numerical errors.
    }
    this.i_large_of = i_large_of;
    this.thresholds = thresholds;
  }

  sample = () => {
    const i = Math.floor(this.thresholds.length * Math.random());
    return Math.random() < this.thresholds[i] ? i : this.i_large_of[i];
  };
}

export const join = (...xs: (undefined | null | boolean | string)[]) =>
  xs.filter(Boolean).join(" ");

export const useClipboard = () => {
  const [is_copied, set_is_copied] = React.useState(false);
  const copy = React.useCallback((text: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        set_is_copied(true);
        setTimeout(() => set_is_copied(false), 400);
      })
      .catch(() => set_is_copied(false));
  }, []);
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
export const vids: types.TVids = {};

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

export const sum = (xs: number[]) => {
  return xs.reduce((total, current) => {
    return total + current;
  }, 0);
};

export const cumsum = (xs: number[]) => {
  const ret = [0];
  xs.reduce((total, current) => {
    const t = total + current;
    ret.push(t);
    return t;
  }, 0);
  return ret;
};

export const focus = (r: null | HTMLElement) => {
  if (r) {
    r.focus();
  }
};

export const get_is_mobile = () => {
  const ua = navigator.userAgent;
  return /(Mobi|Tablet|iPad)/.test(ua);
};

export const queue_textarea_id_of = (node_id: types.TNodeId) => {
  return `q-${node_id}`;
};

export const prevent_propagation = (e: React.MouseEvent) => {
  e.stopPropagation();
};

export function dnd_move<X>(xs: X[], i_from: number, i_to: number) {
  if (i_from !== i_to) {
    const x = xs[i_from];
    xs.splice(i_from, 1);
    xs.splice(i_to, 0, x);
  }
  return xs;
}

export const downloadJson = (fileName: string, data: any) => {
  const a = document.createElement("a");
  try {
    const uri = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      }),
    );
    try {
      a.href = uri;
      a.download = fileName;
      a.click();
    } finally {
      URL.revokeObjectURL(uri);
    }
  } finally {
    a.remove();
  }
};

export const getAllFromIndexedDb = async <T>(db: idb.IDBPDatabase<T>) => {
  const res: any = {};
  const tx = db.transaction(db.objectStoreNames, "readonly");
  for (const storeName of db.objectStoreNames) {
    const store = tx.objectStore(storeName);
    const records = [];
    for await (const cursor of store) {
      records.push({ key: cursor.key, value: cursor.value });
    }
    res[storeName] = records;
  }
  await tx.done;
  return res;
};
