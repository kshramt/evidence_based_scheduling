import * as React from "react";

import * as storage from "src/storage";
import * as utils from "src/utils";
import Component from "./Component";

const ExportIndexedDbButton = React.memo(
  (props: { db: Awaited<ReturnType<typeof storage.getDb>> }) => {
    const onClick = React.useCallback(async () => {
      const res = await utils.getAllFromIndexedDb(props.db);
      utils.downloadJson("indexeddb.json", res);
    }, [props.db]);
    return <Component onClick={onClick} />;
  },
);

export default ExportIndexedDbButton;
