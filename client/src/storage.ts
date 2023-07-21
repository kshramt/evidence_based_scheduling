import * as Idb from "idb";

export type THead = {
  client_id: number;
  session_id: number;
  patch_id: number;
};

export type TPatchValue = {
  client_id: number;
  session_id: number;
  patch_id: number;
  patch: string;
  parent_client_id: number;
  parent_session_id: number;
  parent_patch_id: number;
  created_at: Date;
};

export type TDb = {
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
    value: TPatchValue;
  };
  snapshots: {
    key: [number, number, number];
    value: {
      client_id: number;
      session_id: number;
      patch_id: number;
      snapshot: any;
      created_at: Date;
    };
  };
  pending_patches: {
    key: [number, number, number];
    value: THead;
  };
};

export const get_db = async (db_name: string) => {
  return await Idb.openDB<TDb>(db_name, 1, {
    upgrade: (db) => {
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
    },
  });
};

export const get_patches_for_local_head = async (arg: {
  head: THead;
  db: Awaited<ReturnType<typeof get_db>>;
}) => {
  const res = await _get_patches_for_local_head(arg);
  res.patches = res.patches.reverse();
  return res;
};

const _get_patches_for_local_head = async (arg: {
  head: THead;
  db: Awaited<ReturnType<typeof get_db>>;
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
