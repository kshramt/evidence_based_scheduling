import React from "react";

import * as types from "./types"

export const join = (...xs: (undefined | null | false | string)[]) =>
  xs.filter(Boolean).join(" ");

export const useClipboard = (text: string) => {
  const [is_copied, set_is_copied] = React.useState(false);
  const copy = React.useCallback(() => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        set_is_copied(true);
        setTimeout(() => set_is_copied(false), 400);
      })
      .catch(() => set_is_copied(false));
  }, [text]);
  return React.useMemo(
    () => ({
      copy,
      is_copied,
    }),
    [copy, is_copied],
  );
};


let _VISIT_COUNTER = 0;
export const visit_counter_of = () => _VISIT_COUNTER += 1;
export const vids: types.IVids = {}
