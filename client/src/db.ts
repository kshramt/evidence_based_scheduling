import * as Idb from "idb";

export const db = Idb.openDB<{ local_storage: { key: string; value: string } }>(
  "db",
  1,
  {
    upgrade: (db) => {
      db.createObjectStore("local_storage");
    },
  },
);
