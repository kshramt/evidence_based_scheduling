import * as Idb from "idb/with-async-ittr";
import * as Immer from "immer";
import * as FastJsonPatch from "@kshramt/fast-json-patch";

export type THead = {
  client_id: number;
  session_id: number;
  patch_id: number;
};
export type TSnapshot = {
  client_id: number;
  session_id: number;
  patch_id: number;
  snapshot: any;
  created_at: Date;
};

export type TPatchValue = _TPatchValueV2;

export type _TPatchValueV1 = {
  client_id: number;
  session_id: number;
  patch_id: number;
  patch: string;
  parent_client_id: number;
  parent_session_id: number;
  parent_patch_id: number;
  created_at: Date;
};

export type _TPatchValueV2 = {
  client_id: number;
  session_id: number;
  patch_id: number;
  patch: FastJsonPatch.Operation[];
  parent_client_id: number;
  parent_session_id: number;
  parent_patch_id: number;
  created_at: Date;
};

export type _TDbV1 = {
  booleans: {
    key: string;
    value: boolean;
  };
  numbers: {
    key: string;
    value: number;
  };
  heads: {
    key: "remote" | "local";
    value: THead;
  };
  patches: {
    key: [number, number, number];
    value: _TPatchValueV1;
  };
  snapshots: {
    key: [number, number, number];
    value: TSnapshot;
  };
  pending_patches: {
    key: [number, number, number];
    value: THead;
  };
};

export type _TDbV2 = {
  numbers: {
    key: string;
    value: number;
  };
  heads: {
    key: "remote" | "local";
    value: THead;
  };
  patches: {
    key: [number, number, number];
    value: _TPatchValueV2;
  };
  snapshots: {
    key: [number, number, number];
    value: TSnapshot;
  };
  pending_patches: {
    key: [number, number, number];
    value: THead;
  };
};

export type _TDbV3 = {
  numbers: {
    key: string;
    value: number;
  };
  heads: {
    key: "remote" | "local";
    value: THead;
  };
  patches: {
    key: [number, number, number];
    value: _TPatchValueV2;
  };
  snapshots: {
    key: [number, number, number];
    value: TSnapshot;
  };
  pending_patches: {
    key: [number, number, number];
    value: THead;
  };
  ui_calender_open_set: {
    key: "id";
    value: string;
  };
};

export const _getDbV1 = async (db_name: string) => {
  return await Idb.openDB<_TDbV1>(db_name, 1, {
    upgrade: async (db, oldVersion) => {
      if (oldVersion < 1) {
        await upgradeFromV0(db);
      }
    },
  });
};

export const _getDbV2 = async (db_name: string) => {
  return await Idb.openDB<_TDbV2>(db_name, 2, {
    upgrade: async (db, oldVersion, _, transaction) => {
      if (oldVersion < 1) {
        await upgradeFromV0(db as unknown as Idb.IDBPDatabase<_TDbV1>);
      }
      if (oldVersion < 2) {
        await upgradeFromV1(db, transaction);
      }
    },
  });
};

export const _getDbV3 = async (dbName: string) => {
  return await Idb.openDB<_TDbV3>(dbName, 3, {
    upgrade: upgradeToV3,
  });
};

export type TDb = _TDbV3;
export const getDb = _getDbV3;

const upgradeToV3: Exclude<
  Idb.OpenDBCallbacks<_TDbV3>["upgrade"],
  undefined
> = async (db, oldVersion, _, transaction) => {
  if (oldVersion < 1) {
    await upgradeFromV0(db as unknown as Idb.IDBPDatabase<_TDbV1>);
  }
  if (oldVersion < 2) {
    await upgradeFromV1(
      db as unknown as Idb.IDBPDatabase<_TDbV2>,
      transaction as unknown as Idb.IDBPTransaction<
        _TDbV2,
        Idb.StoreNames<_TDbV2>[],
        "versionchange"
      >,
    );
  }
  if (oldVersion < 3) {
    db.createObjectStore("ui_calender_open_set", { keyPath: "id" });
  }
};

const upgradeFromV0 = async (db: Idb.IDBPDatabase<_TDbV1>) => {
  db.createObjectStore("booleans");
  db.createObjectStore("numbers");
  db.createObjectStore("heads");
  db.createObjectStore("patches", {
    keyPath: ["client_id", "session_id", "patch_id"],
  });
  db.createObjectStore("snapshots", {
    keyPath: ["client_id", "session_id", "patch_id"],
  });
  db.createObjectStore("pending_patches", {
    keyPath: ["client_id", "session_id", "patch_id"],
  });
  return db;
};

const upgradeFromV1 = async (
  db: Idb.IDBPDatabase<_TDbV2>,
  transaction: Idb.IDBPTransaction<
    _TDbV2,
    Idb.IDBPDatabase<_TDbV2>["objectStoreNames"][number][],
    "versionchange"
  >,
) => {
  // @ts-expect-error
  db.deleteObjectStore("booleans");
  {
    const store = transaction.objectStore("numbers");
    await store.delete("showMobileUpdatedAt");
  }
  {
    const store = transaction.objectStore("patches");
    for await (const cursor of store) {
      const patch = JSON.parse(cursor.value.patch as unknown as string);
      await cursor.update(
        Immer.produce(cursor.value, (draft) => {
          draft.patch = patch;
        }),
      );
    }
  }
  return db;
};

export const get_patches_for_local_head = async (arg: {
  head: THead;
  db: Awaited<ReturnType<typeof getDb>>;
}) => {
  const res = await _get_patches_for_local_head(arg);
  res.patches = res.patches.reverse();
  return res;
};

const _get_patches_for_local_head = async (arg: {
  head: THead;
  db: Awaited<ReturnType<typeof getDb>>;
}) => {
  const tx = arg.db.transaction(["patches", "snapshots"], "readonly");
  const patches_store = tx.objectStore("patches");
  const snapshots_store = tx.objectStore("snapshots");
  const patches = [];
  let k: [number, number, number] = [
    arg.head.client_id,
    arg.head.session_id,
    arg.head.patch_id,
  ];
  while (true) {
    {
      const snapshot = await snapshots_store.get(k);
      if (snapshot !== undefined) {
        return { snapshot: snapshot.snapshot, patches };
      }
    }
    const patch = await patches_store.get(k);
    if (patch === undefined) {
      throw new Error(`get_patches_to_leaf: patch not found: ${k}`);
    }
    patches.push(patch);
    if (
      patch.parent_client_id === k[0] &&
      patch.parent_session_id === k[1] &&
      patch.parent_patch_id === k[2]
    ) {
      return { snapshot: {}, patches };
    }
    k = [
      patch.parent_client_id,
      patch.parent_session_id,
      patch.parent_patch_id,
    ];
  }
};
