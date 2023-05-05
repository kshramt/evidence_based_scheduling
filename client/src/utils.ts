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

export const join = (...xs: (undefined | null | false | string)[]) =>
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

const cumsum = (xs: number[]) => {
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

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it("dnd_move", () => {
    expect(dnd_move([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(dnd_move([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
    expect(dnd_move([1, 2, 3, 4, 5], 1, 3)).toEqual([1, 3, 4, 2, 5]);
    expect(dnd_move([0, 1, 2, 3, 4], 3, 1)).toEqual([0, 3, 1, 2, 4]);
    expect(dnd_move([0, 1, 2, 3, 4], 3, 1)).toEqual([0, 3, 1, 2, 4]);
  });

  it("sum", () => {
    expect(sum([1, 2, 3])).toEqual(6);
  });

  it("cumsum", () => {
    expect(cumsum([1, 2, 3])).toEqual([0, 1, 3, 6]);
  });

  it("Multinomial", () => {
    {
      const vals = [9, 8, 7];
      const rng = new Multinomial([1, 2, 3]);
      const ns = [];
      for (let i = 0; i < 300000; i++) {
        ns.push(vals[rng.sample()]);
      }
      const _9 = ns.filter((x) => x === 9);
      const _8 = ns.filter((x) => x === 8);
      const _7 = ns.filter((x) => x === 7);
      expect(
        1.95 <= _8.length / _9.length && _8.length / _9.length <= 2.05,
      ).toBeTruthy();
      expect(
        2.95 <= _7.length / _9.length && _7.length / _9.length <= 3.05,
      ).toBeTruthy();
    }
    {
      const rng = new Multinomial([1]);
      for (let i = 0; i < 10; i++) {
        expect(rng.sample()).toEqual(0);
      }
    }
    {
      const vals = [9, 8];
      const rng = new Multinomial([1, 1]);
      const ns = [];
      for (let i = 0; i < 200000; i++) {
        ns.push(vals[rng.sample()]);
      }
      const _9 = ns.filter((x) => x === 9);
      const _8 = ns.filter((x) => x === 8);
      expect(
        0.95 <= _8.length / _9.length && _8.length / _9.length <= 1.05,
      ).toBeTruthy();
    }
    {
      const ws = [];
      for (let i = 0; i < 1000; ++i) {
        ws[i] = Math.random();
      }
      const i_target = 500;
      ws[i_target] = 100;
      let w_total = 0;
      for (const w of ws) {
        w_total += w;
      }
      const p = 100 / w_total;
      const rng = new Multinomial(ws);
      const total = 100000;
      let count = 0;
      for (let i = 0; i < total; ++i) {
        if (rng.sample() === i_target) {
          count += 1;
        }
      }
      expect(0.95 * p * total <= count && count <= 1.05 * p * total);
    }
  });
}
