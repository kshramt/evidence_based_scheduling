import * as idb from "idb";
import * as React from "react";
import * as rt from "@kshramt/runtime-type-validator";

import * as actions from "./actions";
import * as consts from "./consts";
import * as intervals from "./intervals";
import * as times from "./times";
import * as types from "./types";
import * as utils from "src/utils";

// Vose (1991)'s linear version of Walker (1974)'s alias method.
// A Pactical Version of Vose's Algorithm: https://www.keithschwarz.com/darts-dice-coins/
export class Multinomial {
  i_large_of: number[];
  thresholds: number[];
  constructor(ws: number[] | Float32Array) {
    const n = ws.length;
    const total = sum(ws);
    const thresholds = Array<number>(n);
    const i_large_of = Array<number>(n);
    const i_small_list = Array<number>(n);
    const i_large_list = Array<number>(n);
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
      .writeText(text)
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

export const sum = (xs: number[] | Float32Array) => {
  let res = 0;
  for (const x of xs) {
    res += x;
  }
  return res;
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

export type TJson =
  | null
  | boolean
  | number
  | string
  | TJson[]
  | { [k: string]: TJson };

export const downloadJson = <Data = TJson>(fileName: string, data: Data) => {
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
  const res: Record<string, TJson> = {};
  const tx = db.transaction(db.objectStoreNames, "readonly");
  for (const storeName of db.objectStoreNames) {
    const store = tx.objectStore(storeName);
    const records = [];
    for await (const cursor of store) {
      records.push({ key: cursor.key, value: cursor.value });
    }
    // @ts-expect-error For some reason, storeName is not inferred to be string | number.
    res[storeName] = records;
  }
  await tx.done;
  return res;
}

export const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec));

const waitForIdExists = async (
  id: string,
  timeout: number,
  dt: number = 10,
) => {
  const t0 = performance.now();
  while (performance.now() < t0 + timeout) {
    const el = document.getElementById(id);
    if (el) {
      return el;
    }
    await sleep(dt);
  }
  return document.getElementById(id);
};

const isElementInViewport = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect();
  return !(
    rect.bottom < 0 ||
    window.innerHeight < rect.top ||
    rect.right < 0 ||
    window.innerWidth < rect.left
  );
};

export const useToTree = (node_id: types.TNodeId) => {
  const dispatch = types.useDispatch();
  return React.useCallback(async () => {
    dispatch(actions.show_path_to_selected_node(node_id));
    const id = `t-${node_id}`;
    const el = await waitForIdExists(id, 200);
    if (el) {
      for (let i = 0; i < 20; ++i) {
        el.focus();
        if (isElementInViewport(el)) {
          return;
        }
        el.blur();
        await sleep(25);
      }
    }
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
    if (node_id && types.tNodeId(node_id) && !seen.has(node_id)) {
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
  const ranges = assertV(
    types.useSelector((state) =>
      node_id === null ? null : state.swapped_nodes.ranges?.[node_id],
    ),
  );
  if (ranges === null) return false;
  const last_range = ranges.at(-1);
  const is_running = last_range && last_range.end === null;
  return is_running;
};

export const getChildTimeIds = (timeId: string) => {
  const prefix = timeId[0];
  switch (prefix) {
    case "F": {
      const yyyy = parseInt(timeId.slice(1, 5));
      return [`Y${yyyy + 0}`, `Y${yyyy + 1}`, `Y${yyyy + 2}`, `Y${yyyy + 3}`];
    }
    case "Y": {
      const yyyy = parseInt(timeId.slice(1, 5));
      return [`Q${yyyy}-01`, `Q${yyyy}-04`, `Q${yyyy}-07`, `Q${yyyy}-10`];
    }
    case "Q": {
      const yyyy = parseInt(timeId.slice(1, 5));
      const mm = parseInt(timeId.slice(6, 8));
      return [
        `M${yyyy}-${(mm + 0).toString().padStart(2, "0")}`,
        `M${yyyy}-${(mm + 1).toString().padStart(2, "0")}`,
        `M${yyyy}-${(mm + 2).toString().padStart(2, "0")}`,
      ];
    }
    case "M": {
      // Return the week of the year.
      const yyyy = parseInt(timeId.slice(1, 5));
      const mm = parseInt(timeId.slice(6, 8));
      const w0 = Math.floor(
        (Date.UTC(yyyy, mm - 1, 1) - Number(consts.WEEK_0_BEGIN)) /
          consts.WEEK_MSEC,
      );
      const w1 = Math.floor(
        (Date.UTC(yyyy, mm - 1 + 1, 0) - Number(consts.WEEK_0_BEGIN)) /
          consts.WEEK_MSEC,
      );
      const res = [];
      for (let w = w0; w < w1 + 1; ++w) {
        res.push(`W${w}`);
      }
      return res;
    }
    case "W": {
      const t0 = getDateOfWeek(parseInt(timeId.slice(1)));
      const y0 = t0.getUTCFullYear();
      const m0 = t0.getUTCMonth();
      const d0 = t0.getUTCDate();
      const res = [];
      for (let i = 0; i < 7; ++i) {
        const t = new Date(Date.UTC(y0, m0, d0 + i));
        res.push(
          `D${t.getUTCFullYear()}-${(t.getUTCMonth() + 1)
            .toString()
            .padStart(2, "0")}-${t.getUTCDate().toString().padStart(2, "0")}`,
        );
      }
      return res;
    }
    case "D": {
      const yyyymmdd = timeId.slice(1);
      return [
        `H${yyyymmdd}T00`,
        `H${yyyymmdd}T01`,
        `H${yyyymmdd}T02`,
        `H${yyyymmdd}T03`,
        `H${yyyymmdd}T04`,
        `H${yyyymmdd}T05`,
        `H${yyyymmdd}T06`,
        `H${yyyymmdd}T07`,
        `H${yyyymmdd}T08`,
        `H${yyyymmdd}T09`,
        `H${yyyymmdd}T10`,
        `H${yyyymmdd}T11`,
        `H${yyyymmdd}T12`,
        `H${yyyymmdd}T13`,
        `H${yyyymmdd}T14`,
        `H${yyyymmdd}T15`,
        `H${yyyymmdd}T16`,
        `H${yyyymmdd}T17`,
        `H${yyyymmdd}T18`,
        `H${yyyymmdd}T19`,
        `H${yyyymmdd}T20`,
        `H${yyyymmdd}T21`,
        `H${yyyymmdd}T22`,
        `H${yyyymmdd}T23`,
      ];
    }
    // default
    default: {
      return [];
    }
  }
};

export const getStringOfTimeId = (timeId: string) => {
  switch (timeId[0]) {
    case "W": {
      const t0 = getDateOfWeek(parseInt(timeId.slice(1)));
      const y0 = t0.getUTCFullYear();
      const m0 = t0.getUTCMonth();
      const d0 = t0.getUTCDate();
      return `W${y0}-${(m0 + 1).toString().padStart(2, "0")}-${d0
        .toString()
        .padStart(2, "0")}`;
    }
    case "H": {
      return timeId.slice(12);
    }
    default: {
      return timeId;
    }
  }
};

const getDateOfWeek = (w: number) => {
  return new Date(Number(consts.WEEK_0_BEGIN) + consts.WEEK_MSEC * w);
};

// const deltaHour = 60 * 60 * 1_000;
const deltaDay = 24 * 60 * 60 * 1_000;
const deltaWeek = 7 * deltaDay;
const deltaMonth = 4 * deltaWeek;
const deltaQuarter = 90 * deltaDay;
const deltaYear = 365 * deltaDay;
const deltaFourYears = 4 * deltaYear;
const deltaRanges: Record<string, [number, number]> = {
  H: [0, deltaDay],
  D: [deltaDay, deltaWeek],
  W: [deltaWeek, deltaMonth],
  M: [deltaMonth, deltaQuarter],
  Q: [deltaQuarter, deltaYear],
  Y: [deltaYear, deltaFourYears],
  F: [deltaFourYears, Infinity],
};

export const usePlannedNodeIds = (timeId: string) => {
  const todoNodeIds = types.useSelector((state) => state.todo_node_ids);
  const eventss = types.useSelector((state) => state.swapped_nodes.events);
  const nonTodoNodeIds = types.useSelector((state) => state.non_todo_node_ids);
  const res = React.useMemo(() => {
    const _res: types.TNodeId[] = [];
    const prefix = timeId[0];
    if (!(prefix in deltaRanges)) {
      return _res;
    }
    const [deltaLo, deltaHi] = deltaRanges[prefix];
    const [t0, t1] = getRangeOfTimeId(timeId);
    const start = { f: t0 };
    const end = { f: t1 };
    for (const nodeId of todoNodeIds.concat(nonTodoNodeIds)) {
      const events = eventss?.[nodeId];
      if (events === undefined) {
        continue;
      }
      for (const event of events) {
        if (utils.getEventStatus(event) !== "created") {
          continue;
        }
        {
          const duration =
            times.ensureFloatingTime(event.interval_set.end).f -
            times.ensureFloatingTime(event.interval_set.start).f;
          if (duration < deltaLo || deltaHi <= duration) {
            continue;
          }
        }
        const overlapState = intervals.getOverlapState(
          start,
          end,
          times.ensureFloatingTime(event.interval_set.start),
          times.ensureFloatingTime(event.interval_set.end),
          event.interval_set.delta,
          intervals.getFloatingTimeOfLimit(event.interval_set),
        );
        if (overlapState === intervals.Overlap.NO_OVERLAP) {
          continue;
        }
        _res.push(nodeId);
        break;
      }
    }
    return _res;
  }, [eventss, nonTodoNodeIds, timeId, todoNodeIds]);
  return res;
};

export const getRangeOfTimeId = (timeId: string) => {
  switch (timeId[0]) {
    case "H": {
      const t0 = new Date(timeId.slice(1) + ":00:00Z").getTime();
      return [t0, t0 + 3_600_000];
    }
    case "D": {
      const t0 = new Date(timeId.slice(1) + "T00:00:00Z").getTime();
      return [t0, t0 + 86_400_000];
    }
    case "W": {
      const t0 =
        consts.WEEK_0_BEGIN.getTime() +
        consts.WEEK_MSEC * parseInt(timeId.slice(1));
      return [t0, t0 + consts.WEEK_MSEC];
    }
    case "M": {
      const yyyy = parseInt(timeId.slice(1, 5));
      const mm = parseInt(timeId.slice(6, 8));
      const t0 = Date.UTC(yyyy, mm - 1);
      const t1 = Date.UTC(yyyy, mm);
      return [t0, t1];
    }
    case "Q": {
      const yyyy = parseInt(timeId.slice(1, 5));
      const mm = parseInt(timeId.slice(6, 8));
      const t0 = Date.UTC(yyyy, mm - 1);
      const t1 = Date.UTC(yyyy, mm + 2);
      return [t0, t1];
    }
    case "Y": {
      const yyyy = parseInt(timeId.slice(1, 5));
      const t0 = Date.UTC(yyyy, 0);
      const t1 = Date.UTC(yyyy + 1, 0);
      return [t0, t1];
    }
    case "F": {
      const yyyy = parseInt(timeId.slice(1, 5));
      const t0 = Date.UTC(yyyy, 0);
      const t1 = Date.UTC(yyyy + 4, 0);
      return [t0, t1];
    }
    default: {
      return [0, 0];
    }
  }
};

export const suppress_missing_onChange_handler_warning = () => {};

export const assertV = <T>(x: undefined | T): T => {
  if (x === undefined) {
    throw new Error("The value is undefined.");
  }
  return x;
};

export const get_bearer = (id_token: { user_id: string }) => {
  return `Bearer ${btoa(JSON.stringify(id_token))}`;
};

export const getEventStatus = (event: rt.$infer<typeof types.tEvent>) => {
  return event.status.length % 2 === 0 ? "deleted" : "created";
};

export const doFocusTextArea = (id: string) => {
  setTimeout(() => focus(document.getElementById(id)), 100);
};

export const digits1 = (x: number) => {
  return Math.round(x * 10) / 10;
};
