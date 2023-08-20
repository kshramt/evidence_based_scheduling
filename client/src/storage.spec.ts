import { test, expect } from "vitest";
import * as idb from "idb";
import * as Immer from "immer";

import * as T from "./storage";
import * as utils from "src/utils";

test("_getDbV1", async () => {
  const id = crypto.randomUUID();
  const db = await T._getDbV1(id);
  try {
    expect(Array.from(db.objectStoreNames).sort()).toStrictEqual(
      [
        "booleans",
        "numbers",
        "heads",
        "patches",
        "snapshots",
        "pending_patches",
      ].sort(),
    );
  } finally {
    db.close();
    await idb.deleteDB(id);
  }
});

test("_getDbV2", async () => {
  const id = crypto.randomUUID();
  const db = await T._getDbV2(id);
  try {
    expect(Array.from(db.objectStoreNames).sort()).toStrictEqual(
      ["numbers", "heads", "patches", "snapshots", "pending_patches"].sort(),
    );
  } finally {
    db.close();
    await idb.deleteDB(id);
  }
});

test("_getDbV1 -> _getDbV2", async () => {
  const id = crypto.randomUUID();
  const db = await T._getDbV1(id);
  db.close();
  try {
    const db = await T._getDbV2(id);
    const storeNames = Array.from(db.objectStoreNames).sort();
    db.close();
    expect(storeNames).toStrictEqual(
      ["numbers", "heads", "patches", "snapshots", "pending_patches"].sort(),
    );
  } finally {
    await idb.deleteDB(id);
  }
});

test("_getDbV1 -> insert data -> _getDbV2", async () => {
  const id = crypto.randomUUID();
  const db = await T._getDbV1(id);
  try {
    // Insert indexedDbV1Data into db
    const tx = db.transaction(db.objectStoreNames, "readwrite");
    for (const storeName of tx.objectStoreNames) {
      const store = tx.objectStore(storeName);
      const records = indexedDbV1Data[storeName];
      for (const record of records) {
        if (typeof record.key === "string") {
          await store.put(record.value, record.key);
        } else {
          await store.put(record.value);
        }
      }
    }
    await tx.done;
    db.close();
    {
      const db = await T._getDbV2(id);
      const newData = await utils.getAllFromIndexedDb(db);
      db.close();
      expect(newData).toStrictEqual(indexedDbV2Data);
    }
  } finally {
    await idb.deleteDB(id);
  }
});

test("_getDbV1 -> insert data -> _getDbV2 -> _getDbV3", async () => {
  const id = crypto.randomUUID();
  const db = await T._getDbV1(id);
  try {
    // Insert indexedDbV1Data into db
    const tx = db.transaction(db.objectStoreNames, "readwrite");
    for (const storeName of tx.objectStoreNames) {
      const store = tx.objectStore(storeName);
      const records = indexedDbV1Data[storeName];
      for (const record of records) {
        if (typeof record.key === "string") {
          await store.put(record.value, record.key);
        } else {
          await store.put(record.value);
        }
      }
    }
    await tx.done;
    db.close();
    {
      const db = await T._getDbV3(id);
      const newData = await utils.getAllFromIndexedDb(db);
      db.close();
      expect(newData).toStrictEqual(indexedDbV3Data);
    }
  } finally {
    await idb.deleteDB(id);
  }
});

const indexedDbV1Data = {
  booleans: [],
  heads: [
    {
      key: "local",
      value: {
        client_id: 1,
        session_id: 1,
        patch_id: 15,
      },
    },
    {
      key: "remote",
      value: {
        client_id: 1,
        session_id: 1,
        patch_id: 15,
      },
    },
  ],
  numbers: [
    {
      key: "client_id",
      value: 1,
    },
    {
      key: "session_id",
      value: 1,
    },
  ],
  patches: [
    {
      key: [0, 0, 0],
      value: {
        client_id: 0,
        session_id: 0,
        patch_id: 0,
        patch: '[{"op": "replace", "path": "", "value": {"data": null}}]',
        parent_client_id: 0,
        parent_session_id: 0,
        parent_patch_id: 0,
        created_at: new Date("2023-08-04T16:09:06.480Z"),
      },
    },
    {
      key: [1, 1, 0],
      value: {
        patch:
          '[{"op":"replace","path":"/data","value":{"covey_quadrants":{"important_urgent":{"nodes":[]},"important_not_urgent":{"nodes":[]},"not_important_urgent":{"nodes":[]},"not_important_not_urgent":{"nodes":[]}},"edges":{},"root":"0","id_seq":0,"nodes":{"0":{"children":{},"end_time":null,"estimate":0,"parents":{},"ranges":[],"start_time":1691165347097,"status":"todo","text":"root"}},"pinned_sub_trees":[],"queue":{},"timeline":{"year_begin":2023,"count":0,"time_nodes":{}},"showTodoOnly":false,"version":21}}]',
        created_at: new Date("2023-08-04T16:09:07.097Z"),
        parent_client_id: 0,
        parent_session_id: 0,
        parent_patch_id: 0,
        client_id: 1,
        session_id: 1,
        patch_id: 0,
      },
    },
    {
      key: [1, 1, 1],
      value: {
        patch:
          '[{"op":"add","path":"/data/queue/1","value":0},{"op":"add","path":"/data/nodes/0/children/2","value":0},{"op":"add","path":"/data/nodes/1","value":{"children":{},"end_time":null,"estimate":0,"parents":{"2":0},"ranges":[],"start_time":1691165362100,"status":"todo","text":""}},{"op":"replace","path":"/data/id_seq","value":2},{"op":"add","path":"/data/edges/2","value":{"p":"0","c":"1","t":"strong"}}]',
        created_at: new Date("2023-08-04T16:09:22.101Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 0,
        client_id: 1,
        session_id: 1,
        patch_id: 1,
      },
    },
    {
      key: [1, 1, 2],
      value: {
        patch: '[{"op":"replace","path":"/data/nodes/1/text","value":"abc"}]',
        created_at: new Date("2023-08-04T16:09:26.608Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 1,
        client_id: 1,
        session_id: 1,
        patch_id: 2,
      },
    },
    {
      key: [1, 1, 3],
      value: {
        patch:
          '[{"op":"add","path":"/data/queue/3","value":1},{"op":"add","path":"/data/nodes/0/children/4","value":-1},{"op":"add","path":"/data/nodes/3","value":{"children":{},"end_time":null,"estimate":0,"parents":{"4":0},"ranges":[],"start_time":1691165366624,"status":"todo","text":""}},{"op":"replace","path":"/data/id_seq","value":4},{"op":"add","path":"/data/edges/4","value":{"p":"0","c":"3","t":"strong"}}]',
        created_at: new Date("2023-08-04T16:09:26.624Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 2,
        client_id: 1,
        session_id: 1,
        patch_id: 3,
      },
    },
    {
      key: [1, 1, 4],
      value: {
        patch:
          '[{"op":"add","path":"/data/queue/5","value":2},{"op":"add","path":"/data/nodes/3/children/6","value":0},{"op":"add","path":"/data/nodes/5","value":{"children":{},"end_time":null,"estimate":0,"parents":{"6":0},"ranges":[],"start_time":1691165369032,"status":"todo","text":""}},{"op":"replace","path":"/data/id_seq","value":6},{"op":"add","path":"/data/edges/6","value":{"p":"3","c":"5","t":"strong"}}]',
        created_at: new Date("2023-08-04T16:09:29.034Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 3,
        client_id: 1,
        session_id: 1,
        patch_id: 4,
      },
    },
    {
      key: [1, 1, 5],
      value: {
        patch: '[{"op":"replace","path":"/data/nodes/3/text","value":"def"}]',
        created_at: new Date("2023-08-04T16:09:29.138Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 4,
        client_id: 1,
        session_id: 1,
        patch_id: 5,
      },
    },
    {
      key: [1, 1, 6],
      value: {
        patch: '[{"op":"replace","path":"/data/nodes/5/text","value":"ghi"}]',
        created_at: new Date("2023-08-04T16:09:36.428Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 5,
        client_id: 1,
        session_id: 1,
        patch_id: 6,
      },
    },
    {
      key: [1, 1, 7],
      value: {
        patch:
          '[{"op":"add","path":"/data/queue/7","value":3},{"op":"add","path":"/data/nodes/1/children/8","value":0},{"op":"add","path":"/data/nodes/7","value":{"children":{},"end_time":null,"estimate":0,"parents":{"8":0},"ranges":[],"start_time":1691165377449,"status":"todo","text":""}},{"op":"replace","path":"/data/id_seq","value":8},{"op":"add","path":"/data/edges/8","value":{"p":"1","c":"7","t":"strong"}}]',
        created_at: new Date("2023-08-04T16:09:37.450Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 6,
        client_id: 1,
        session_id: 1,
        patch_id: 7,
      },
    },
    {
      key: [1, 1, 8],
      value: {
        patch: '[{"op":"replace","path":"/data/nodes/7/text","value":"jkl"}]',
        created_at: new Date("2023-08-04T16:09:41.810Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 7,
        client_id: 1,
        session_id: 1,
        patch_id: 8,
      },
    },
    {
      key: [1, 1, 9],
      value: {
        patch:
          '[{"op":"add","path":"/data/nodes/7/parents/9","value":-1},{"op":"add","path":"/data/nodes/5/children/9","value":0},{"op":"replace","path":"/data/id_seq","value":9},{"op":"add","path":"/data/edges/9","value":{"p":"5","c":"7","t":"weak"}}]',
        created_at: new Date("2023-08-04T16:09:47.178Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 8,
        client_id: 1,
        session_id: 1,
        patch_id: 9,
      },
    },
    {
      key: [1, 1, 10],
      value: {
        patch:
          '[{"op":"replace","path":"/data/queue/5","value":-1},{"op":"add","path":"/data/nodes/5/ranges/0","value":{"start":1691165392443,"end":null}}]',
        created_at: new Date("2023-08-04T16:09:52.444Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 9,
        client_id: 1,
        session_id: 1,
        patch_id: 10,
      },
    },
    {
      key: [1, 1, 11],
      value: {
        patch:
          '[{"op":"replace","path":"/data/queue/1","value":-2},{"op":"replace","path":"/data/nodes/5/ranges/0/end","value":1691165399490},{"op":"add","path":"/data/nodes/1/ranges/0","value":{"start":1691165399490,"end":null}}]',
        created_at: new Date("2023-08-04T16:09:59.491Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 10,
        client_id: 1,
        session_id: 1,
        patch_id: 11,
      },
    },
    {
      key: [1, 1, 12],
      value: {
        patch:
          '[{"op":"replace","path":"/data/queue/5","value":-3},{"op":"replace","path":"/data/nodes/5/status","value":"done"},{"op":"replace","path":"/data/nodes/5/end_time","value":1691165407373}]',
        created_at: new Date("2023-08-04T16:10:07.373Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 11,
        client_id: 1,
        session_id: 1,
        patch_id: 12,
      },
    },
    {
      key: [1, 1, 13],
      value: {
        patch:
          '[{"op":"replace","path":"/data/nodes/1/ranges/0/end","value":1691165414391}]',
        created_at: new Date("2023-08-04T16:10:14.393Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 12,
        client_id: 1,
        session_id: 1,
        patch_id: 13,
      },
    },
    {
      key: [1, 1, 14],
      value: {
        patch:
          '[{"op":"replace","path":"/data/nodes/3/text","value":"defmno"}]',
        created_at: new Date("2023-08-04T16:10:36.760Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 13,
        client_id: 1,
        session_id: 1,
        patch_id: 14,
      },
    },
    {
      key: [1, 1, 15],
      value: {
        patch: '[{"op":"replace","path":"/data/nodes/1/text","value":"apbc"}]',
        created_at: new Date("2023-08-04T16:10:39.327Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 14,
        client_id: 1,
        session_id: 1,
        patch_id: 15,
      },
    },
  ],
  pending_patches: [],
  snapshots: [],
} as const;

const indexedDbV2Data = {
  heads: [
    {
      key: "local",
      value: {
        client_id: 1,
        session_id: 1,
        patch_id: 15,
      },
    },
    {
      key: "remote",
      value: {
        client_id: 1,
        session_id: 1,
        patch_id: 15,
      },
    },
  ],
  numbers: [
    {
      key: "client_id",
      value: 1,
    },
    {
      key: "session_id",
      value: 1,
    },
  ],
  patches: [
    {
      key: [0, 0, 0],
      value: {
        client_id: 0,
        session_id: 0,
        patch_id: 0,
        patch: [{ op: "replace", path: "", value: { data: null } }],
        parent_client_id: 0,
        parent_session_id: 0,
        parent_patch_id: 0,
        created_at: new Date("2023-08-04T16:09:06.480Z"),
      },
    },
    {
      key: [1, 1, 0],
      value: {
        patch: [
          {
            op: "replace",
            path: "/data",
            value: {
              covey_quadrants: {
                important_urgent: { nodes: [] },
                important_not_urgent: { nodes: [] },
                not_important_urgent: { nodes: [] },
                not_important_not_urgent: { nodes: [] },
              },
              edges: {},
              root: "0",
              id_seq: 0,
              nodes: {
                "0": {
                  children: {},
                  end_time: null,
                  estimate: 0,
                  parents: {},
                  ranges: [],
                  start_time: 1691165347097,
                  status: "todo",
                  text: "root",
                },
              },
              pinned_sub_trees: [],
              queue: {},
              timeline: { year_begin: 2023, count: 0, time_nodes: {} },
              showTodoOnly: false,
              version: 21,
            },
          },
        ],
        created_at: new Date("2023-08-04T16:09:07.097Z"),
        parent_client_id: 0,
        parent_session_id: 0,
        parent_patch_id: 0,
        client_id: 1,
        session_id: 1,
        patch_id: 0,
      },
    },
    {
      key: [1, 1, 1],
      value: {
        patch: [
          { op: "add", path: "/data/queue/1", value: 0 },
          { op: "add", path: "/data/nodes/0/children/2", value: 0 },
          {
            op: "add",
            path: "/data/nodes/1",
            value: {
              children: {},
              end_time: null,
              estimate: 0,
              parents: { "2": 0 },
              ranges: [],
              start_time: 1691165362100,
              status: "todo",
              text: "",
            },
          },
          { op: "replace", path: "/data/id_seq", value: 2 },
          {
            op: "add",
            path: "/data/edges/2",
            value: { p: "0", c: "1", t: "strong" },
          },
        ],
        created_at: new Date("2023-08-04T16:09:22.101Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 0,
        client_id: 1,
        session_id: 1,
        patch_id: 1,
      },
    },
    {
      key: [1, 1, 2],
      value: {
        patch: [{ op: "replace", path: "/data/nodes/1/text", value: "abc" }],
        created_at: new Date("2023-08-04T16:09:26.608Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 1,
        client_id: 1,
        session_id: 1,
        patch_id: 2,
      },
    },
    {
      key: [1, 1, 3],
      value: {
        patch: [
          { op: "add", path: "/data/queue/3", value: 1 },
          { op: "add", path: "/data/nodes/0/children/4", value: -1 },
          {
            op: "add",
            path: "/data/nodes/3",
            value: {
              children: {},
              end_time: null,
              estimate: 0,
              parents: { "4": 0 },
              ranges: [],
              start_time: 1691165366624,
              status: "todo",
              text: "",
            },
          },
          { op: "replace", path: "/data/id_seq", value: 4 },
          {
            op: "add",
            path: "/data/edges/4",
            value: { p: "0", c: "3", t: "strong" },
          },
        ],
        created_at: new Date("2023-08-04T16:09:26.624Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 2,
        client_id: 1,
        session_id: 1,
        patch_id: 3,
      },
    },
    {
      key: [1, 1, 4],
      value: {
        patch: [
          { op: "add", path: "/data/queue/5", value: 2 },
          { op: "add", path: "/data/nodes/3/children/6", value: 0 },
          {
            op: "add",
            path: "/data/nodes/5",
            value: {
              children: {},
              end_time: null,
              estimate: 0,
              parents: { "6": 0 },
              ranges: [],
              start_time: 1691165369032,
              status: "todo",
              text: "",
            },
          },
          { op: "replace", path: "/data/id_seq", value: 6 },
          {
            op: "add",
            path: "/data/edges/6",
            value: { p: "3", c: "5", t: "strong" },
          },
        ],
        created_at: new Date("2023-08-04T16:09:29.034Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 3,
        client_id: 1,
        session_id: 1,
        patch_id: 4,
      },
    },
    {
      key: [1, 1, 5],
      value: {
        patch: [{ op: "replace", path: "/data/nodes/3/text", value: "def" }],
        created_at: new Date("2023-08-04T16:09:29.138Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 4,
        client_id: 1,
        session_id: 1,
        patch_id: 5,
      },
    },
    {
      key: [1, 1, 6],
      value: {
        patch: [{ op: "replace", path: "/data/nodes/5/text", value: "ghi" }],
        created_at: new Date("2023-08-04T16:09:36.428Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 5,
        client_id: 1,
        session_id: 1,
        patch_id: 6,
      },
    },
    {
      key: [1, 1, 7],
      value: {
        patch: [
          { op: "add", path: "/data/queue/7", value: 3 },
          { op: "add", path: "/data/nodes/1/children/8", value: 0 },
          {
            op: "add",
            path: "/data/nodes/7",
            value: {
              children: {},
              end_time: null,
              estimate: 0,
              parents: { "8": 0 },
              ranges: [],
              start_time: 1691165377449,
              status: "todo",
              text: "",
            },
          },
          { op: "replace", path: "/data/id_seq", value: 8 },
          {
            op: "add",
            path: "/data/edges/8",
            value: { p: "1", c: "7", t: "strong" },
          },
        ],
        created_at: new Date("2023-08-04T16:09:37.450Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 6,
        client_id: 1,
        session_id: 1,
        patch_id: 7,
      },
    },
    {
      key: [1, 1, 8],
      value: {
        patch: [{ op: "replace", path: "/data/nodes/7/text", value: "jkl" }],
        created_at: new Date("2023-08-04T16:09:41.810Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 7,
        client_id: 1,
        session_id: 1,
        patch_id: 8,
      },
    },
    {
      key: [1, 1, 9],
      value: {
        patch: [
          { op: "add", path: "/data/nodes/7/parents/9", value: -1 },
          { op: "add", path: "/data/nodes/5/children/9", value: 0 },
          { op: "replace", path: "/data/id_seq", value: 9 },
          {
            op: "add",
            path: "/data/edges/9",
            value: { p: "5", c: "7", t: "weak" },
          },
        ],
        created_at: new Date("2023-08-04T16:09:47.178Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 8,
        client_id: 1,
        session_id: 1,
        patch_id: 9,
      },
    },
    {
      key: [1, 1, 10],
      value: {
        patch: [
          { op: "replace", path: "/data/queue/5", value: -1 },
          {
            op: "add",
            path: "/data/nodes/5/ranges/0",
            value: { start: 1691165392443, end: null },
          },
        ],
        created_at: new Date("2023-08-04T16:09:52.444Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 9,
        client_id: 1,
        session_id: 1,
        patch_id: 10,
      },
    },
    {
      key: [1, 1, 11],
      value: {
        patch: [
          { op: "replace", path: "/data/queue/1", value: -2 },
          {
            op: "replace",
            path: "/data/nodes/5/ranges/0/end",
            value: 1691165399490,
          },
          {
            op: "add",
            path: "/data/nodes/1/ranges/0",
            value: { start: 1691165399490, end: null },
          },
        ],
        created_at: new Date("2023-08-04T16:09:59.491Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 10,
        client_id: 1,
        session_id: 1,
        patch_id: 11,
      },
    },
    {
      key: [1, 1, 12],
      value: {
        patch: [
          { op: "replace", path: "/data/queue/5", value: -3 },
          { op: "replace", path: "/data/nodes/5/status", value: "done" },
          {
            op: "replace",
            path: "/data/nodes/5/end_time",
            value: 1691165407373,
          },
        ],
        created_at: new Date("2023-08-04T16:10:07.373Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 11,
        client_id: 1,
        session_id: 1,
        patch_id: 12,
      },
    },
    {
      key: [1, 1, 13],
      value: {
        patch: [
          {
            op: "replace",
            path: "/data/nodes/1/ranges/0/end",
            value: 1691165414391,
          },
        ],
        created_at: new Date("2023-08-04T16:10:14.393Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 12,
        client_id: 1,
        session_id: 1,
        patch_id: 13,
      },
    },
    {
      key: [1, 1, 14],
      value: {
        patch: [{ op: "replace", path: "/data/nodes/3/text", value: "defmno" }],
        created_at: new Date("2023-08-04T16:10:36.760Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 13,
        client_id: 1,
        session_id: 1,
        patch_id: 14,
      },
    },
    {
      key: [1, 1, 15],
      value: {
        patch: [{ op: "replace", path: "/data/nodes/1/text", value: "apbc" }],
        created_at: new Date("2023-08-04T16:10:39.327Z"),
        parent_client_id: 1,
        parent_session_id: 1,
        parent_patch_id: 14,
        client_id: 1,
        session_id: 1,
        patch_id: 15,
      },
    },
  ],
  pending_patches: [],
  snapshots: [],
} as const;

const indexedDbV3Data = Immer.produce(indexedDbV2Data, (draft) => {
  // @ts-expect-error
  draft.ui_calender_open_set = [];
});
