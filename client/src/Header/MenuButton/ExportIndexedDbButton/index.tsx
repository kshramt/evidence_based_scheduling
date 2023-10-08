import * as React from "react";

import * as storage from "src/storage";
import * as utils from "src/utils";

const ExportIndexedDbButton = React.memo(
  (props: { db: Awaited<ReturnType<typeof storage.getDb>> }) => {
    const onClick = React.useCallback(async () => {
      const res = await utils.getAllFromIndexedDb(props.db);
      utils.downloadJson("indexeddb.json", res);
    }, [props.db]);
    return (
      <span
        onClick={onClick}
        onDoubleClick={utils.prevent_propagation}
        role="button"
        tabIndex={0}
      >
        Export IndexedDB
      </span>
    );
  },
);

export default ExportIndexedDbButton;
