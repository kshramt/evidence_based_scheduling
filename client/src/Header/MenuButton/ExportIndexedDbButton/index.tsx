import { Menu } from "@mantine/core";
import * as React from "react";

import * as storage from "src/storage";
import * as utils from "src/utils";

const ExportIndexedDbButton = (props: {
  db: Awaited<ReturnType<typeof storage.getDb>>;
}) => {
  const onClick = React.useCallback(async () => {
    const res = await utils.getAllFromIndexedDb(props.db);
    utils.downloadJson("indexeddb.json", res);
  }, [props.db]);
  return (
    <Menu.Item onClick={onClick} onDoubleClick={utils.prevent_propagation}>
      Export IndexedDB
    </Menu.Item>
  );
};

export default ExportIndexedDbButton;
