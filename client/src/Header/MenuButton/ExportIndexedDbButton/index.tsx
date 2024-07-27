import * as React from "react";

import * as storage from "src/storage";
import * as utils from "src/utils";

const ExportIndexedDbButton = (props: {
  db: Awaited<ReturnType<typeof storage.getDb>>;
}) => {
  const onClick = async () => {
    const res = await utils.getAllFromIndexedDb(props.db);
    utils.downloadJson("indexeddb.json", res);
  };
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
};

export default ExportIndexedDbButton;
