import * as Recoil from "recoil";

import * as utils from "src/utils";
import * as Db from "src/db";

export const boolean_local_storage_effect: Recoil.AtomEffect<boolean> = ({
  node,
  onSet,
  setSelf,
}) => {
  setSelf(
    (async () => {
      const db = await Db.db;
      const value = await db.get("local_storage", node.key);
      return value === undefined ? new Recoil.DefaultValue() : value === "true";
    })(),
  );
  Db.db.then((db) => {
    onSet((new_value, _, is_reset) => {
      if (is_reset) {
        db.delete("local_storage", node.key);
      } else {
        db.put("local_storage", new_value ? "true" : "false", node.key);
      }
    });
  });
};

export const show_mobile_state = Recoil.atom({
  key: "ebs/show_mobile",
  default: utils.get_is_mobile(),
  effects: [boolean_local_storage_effect],
});

export const node_filter_query_fast_state = Recoil.atom({
  key: "ebs/node_filter_query_fast",
  default: "",
});
export const node_filter_query_slow_state = Recoil.atom({
  key: "ebs/node_filter_query_slow",
  default: "",
});
export const node_ids_state = Recoil.atom({
  key: "ebs/node_ids",
  default: "",
});
export const show_todo_only_state = Recoil.atom({
  key: "ebs/show_todo_only",
  default: false,
  effects: [boolean_local_storage_effect],
});
export const show_strong_edge_only_state = Recoil.atom({
  key: "ebs/show_strong_edge_only",
  default: false,
  effects: [boolean_local_storage_effect],
});
