import { Menu } from "@mantine/core";
import * as React from "react";

import * as storage from "src/storage";
import * as toast from "src/toast";
import * as utils from "src/utils";

const ExportIndexedDbButton = (props: {
  db: Awaited<ReturnType<typeof storage.getDb>>;
}) => {
  const [exporting, setExporting] = React.useState(false);
  const onClick = async () => {
    setExporting(true);
    try {
      const res = await utils.getAllFromIndexedDb(props.db);
      utils.downloadJson("indexeddb.json", res);
    } catch {
      toast.add("error", "Could not export IndexedDB. Try again.");
    } finally {
      setExporting(false);
    }
  };
  return (
    <Menu.Item
      onClick={() => void onClick()}
      onDoubleClick={utils.prevent_propagation}
      disabled={exporting}
    >
      {exporting ? "Exporting IndexedDB…" : "Export IndexedDB"}
    </Menu.Item>
  );
};

export default ExportIndexedDbButton;
