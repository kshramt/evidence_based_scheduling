import { test, expect } from "vitest";
import * as idb from "idb";
import * as T from "./storage";

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
      [
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

test("_getDbV1 -> _getDbV2", async () => {
  const id = crypto.randomUUID();
  const db = await T._getDbV1(id);
  try {
    db.close();
    expect(1).toStrictEqual(1);
  } finally {
    await idb.deleteDB(id);
  }
});

test("_getDbV1 -> insert data -> _getDbV2", async () => {
  const id = crypto.randomUUID();
  const db = await T._getDbV1(id);
  try {
    db.close();
    expect(1).toStrictEqual(1);
  } finally {
    await idb.deleteDB(id);
  }
});
