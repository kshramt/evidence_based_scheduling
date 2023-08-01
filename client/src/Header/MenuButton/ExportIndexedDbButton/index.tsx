import * as React from "react";

import * as storage from "src/storage";
import * as utils from "src/utils";
import Component from "./Component";

const ExportIndexedDbButton = React.memo(
  (props: { db: Awaited<ReturnType<typeof storage.getDb>> }) => {
    const onClick = React.useCallback(async () => {
      const res: Record<string, any> = {};
      const tx = props.db.transaction(props.db.objectStoreNames, "readonly");
      for (const storeName of props.db.objectStoreNames) {
        const store = tx.objectStore(storeName);
        const records = [];
        for await (const cursor of store) {
          records.push({ key: cursor.key, value: cursor.value });
        }
        res[storeName] = records;
      }
      utils.downloadJson("indexeddb.json", res)
    }, [props.db]);
    return <Component onClick={onClick} />;
  },
);

export default ExportIndexedDbButton;
