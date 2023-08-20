import * as idb from "idb";
import React from "react";

import * as actions from "./actions";
import * as consts from "./consts";
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

export const getStringOfLocalTime = (milliseconds: number) => {
  const date = new Date(milliseconds);
  const y = date.getFullYear().toString();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  const H = date.getHours().toString().padStart(2, "0");
  const M = date.getMinutes().toString().padStart(2, "0");
  const S = date.getSeconds().toString().padStart(2, "0");
  return `${y}-${m}-${d}T${H}:${M}:${S}`;
};

export const getStringOfFloatingTime = (milliseconds: number) => {
  const date = new Date(milliseconds);
  const y = date.getUTCFullYear().toString();
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  const H = date.getUTCHours().toString().padStart(2, "0");
  const M = date.getUTCMinutes().toString().padStart(2, "0");
  const S = date.getUTCSeconds().toString().padStart(2, "0");
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

export async function getAllFromIndexedDb<T>(db: idb.IDBPDatabase<T>) {
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
}

export const useToTree = (node_id: types.TNodeId) => {
  const dispatch = types.useDispatch();
  return React.useCallback(() => {
    dispatch(actions.show_path_to_selected_node(node_id));
    setTimeout(() => focus(document.getElementById(`t-${node_id}`)), 100);
  }, [node_id, dispatch]);
};

export const useToggle = (initialValue: boolean = false) => {
  const [value, setValue] = React.useState(initialValue);
  const toggle = React.useCallback(() => setValue((v) => !v), [setValue]);
  return [value, toggle] as const;
};

export const node_ids_list_of_node_ids_string = (node_ids: string) => {
  const seen = new Set<types.TNodeId>();
  for (const node_id of node_ids.split(" ")) {
    if (node_id && types.is_TNodeId(node_id) && !seen.has(node_id)) {
      seen.add(node_id);
    }
  }
  return Array.from(seen);
};

export const child_time_node_ids_of = (
  time_node_id: types.TTimeNodeId,
  year_begin: number,
) => {
  const child_time_node_ids: string[] = child_time_node_ids_of_impl(
    time_node_id,
    year_begin,
  );
  return child_time_node_ids as types.TTimeNodeId[];
};
const child_time_node_ids_of_impl = (
  time_node_id: types.TTimeNodeId,
  year_begin: number,
) => {
  if (time_node_id[0] === "e") {
    // dEcade
    const decade_count = parseInt(time_node_id.slice(1));
    if (isNaN(decade_count)) {
      throw new Error(`Invalid format: ${time_node_id}`);
    }
    const offset = year_begin + 10 * decade_count;
    const res = [];
    for (let dy = 0; dy < 10; ++dy) {
      res.push(`y${offset + dy}`);
    }
    return res;
  } else if (time_node_id[0] === "y") {
    const y = time_node_id.slice(1);
    return [`q${y}-Q1`, `q${y}-Q2`, `q${y}-Q3`, `q${y}-Q4`];
  } else if (time_node_id[0] === "q") {
    const y = time_node_id.slice(1, 5);
    const q = time_node_id.at(-1);
    if (q === "1") {
      return [`m${y}-01`, `m${y}-02`, `m${y}-03`];
    } else if (q === "2") {
      return [`m${y}-04`, `m${y}-05`, `m${y}-06`];
    } else if (q === "3") {
      return [`m${y}-07`, `m${y}-08`, `m${y}-09`];
    } else if (q === "4") {
      return [`m${y}-10`, `m${y}-11`, `m${y}-12`];
    } else {
      throw new Error(`Invalid format: ${time_node_id}`);
    }
  } else if (time_node_id[0] === "m") {
    const y = parseInt(time_node_id.slice(1, 5));
    if (isNaN(y)) {
      throw new Error(`Invalid format: ${time_node_id}`);
    }
    const m = parseInt(time_node_id.slice(6, 8));
    if (isNaN(m)) {
      throw new Error(`Invalid format: ${time_node_id}`);
    }
    const w0 = Math.floor(
      (Date.UTC(y, m - 1, 1) - Number(consts.WEEK_0_BEGIN)) / consts.WEEK_MSEC,
    );
    const w1 = Math.floor(
      (Date.UTC(y, m - 1 + 1, 0) - Number(consts.WEEK_0_BEGIN)) /
        consts.WEEK_MSEC,
    );
    const res = [];
    for (let w = w0; w < w1 + 1; ++w) {
      res.push(`w${w}`);
    }
    return res;
  } else if (time_node_id[0] === "w") {
    const w = parseInt(time_node_id.slice(1));
    if (isNaN(w)) {
      throw new Error(`Invalid format: ${time_node_id}`);
    }
    const t0 = new Date(Number(consts.WEEK_0_BEGIN) + consts.WEEK_MSEC * w);
    const y0 = t0.getUTCFullYear();
    const m0 = t0.getUTCMonth();
    const d0 = t0.getUTCDate();
    const res = [];
    for (let i = 0; i < 7; ++i) {
      const t = new Date(Date.UTC(y0, m0, d0 + i));
      res.push(
        `d${t.getUTCFullYear()}-${(t.getUTCMonth() + 1)
          .toString()
          .padStart(2, "0")}-${t.getUTCDate().toString().padStart(2, "0")}`,
      );
    }
    return res;
  } else if (time_node_id[0] === "d") {
    const d = time_node_id.slice(1);
    const res = [];
    for (let h = 0; h < 24; ++h) {
      res.push(`h${d}T${h.toString().padStart(2, "0")}`);
    }
    return res;
  } else if (time_node_id[0] === "h") {
    return [];
  } else {
    throw new Error(`Unsupported time_node_id: ${time_node_id}`);
  }
};

export const getTimeNodeIdEl = (
  time_node_id: types.TTimeNodeId,
  year_begin: number,
) => {
  if (time_node_id[0] === "e") {
    // dEcade
    const i_count = parseInt(time_node_id.slice(1));
    if (isNaN(i_count)) {
      throw new Error(`Invalid format: ${time_node_id}`);
    }
    const y0 = year_begin + 10 * i_count;
    return (
      <>
        <b>{"E "}</b>
        {`${y0}/P10Y`}
      </>
    );
  } else if (time_node_id[0] === "y") {
    return (
      <>
        <b>{"Y "}</b>
        {time_node_id.slice(1)}
      </>
    );
  } else if (time_node_id[0] === "q") {
    return (
      <>
        <b>{"Q "}</b>
        {time_node_id.slice(1)}
      </>
    );
  } else if (time_node_id[0] === "m") {
    return (
      <>
        <b>{"M "}</b>
        {time_node_id.slice(1)}
      </>
    );
  } else if (time_node_id[0] === "w") {
    const w = parseInt(time_node_id.slice(1));
    if (isNaN(w)) {
      throw new Error(`Invalid format: ${time_node_id}`);
    }
    const t0 = new Date(Number(consts.WEEK_0_BEGIN) + consts.WEEK_MSEC * w);
    const y0 = t0.getUTCFullYear();
    const m0 = (t0.getUTCMonth() + 1).toString().padStart(2, "0");
    const d0 = t0.getUTCDate().toString().padStart(2, "0");
    return (
      <>
        <b>{"W "}</b>
        {`${y0}-${m0}-${d0}/P7D`}
      </>
    );
  } else if (time_node_id[0] === "d") {
    return <>{time_node_id.slice(-8)}</>;
  } else if (time_node_id[0] === "h") {
    return <>{time_node_id.slice(-2)}</>;
  } else {
    throw new Error(`Unsupported time_node_id: ${time_node_id}`);
  }
};

export const useOn = (delayMsec: number = consts.DEFAULT_DELAY_MSEC) => {
  const [isOn, setHover] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  const clearDelay = React.useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const turnOn = React.useCallback(() => {
    clearDelay();
    setHover(true);
  }, [clearDelay]);

  const turnOff = React.useCallback(() => {
    clearDelay();
    if (0 < delayMsec) {
      timeoutRef.current = window.setTimeout(() => {
        setHover(false);
      }, delayMsec);
    } else {
      setHover(false);
    }
  }, [clearDelay, delayMsec]);

  React.useEffect(() => {
    return clearDelay;
  }, [clearDelay]);

  return React.useMemo(() => {
    return {
      isOn,
      turnOn,
      turnOff,
    };
  }, [isOn, turnOn, turnOff]);
};

export const useIsRunning = (node_id: null | types.TNodeId) => {
  const ranges = types.useSelector((state) =>
    node_id === null ? null : state.data.nodes[node_id].ranges,
  );
  if (ranges === null) return false;
  const last_range = ranges.at(-1);
  const is_running = last_range && last_range.end === null;
  return is_running;
};

