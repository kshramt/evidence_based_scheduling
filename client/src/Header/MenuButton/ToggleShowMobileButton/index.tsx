import * as Jotai from "jotai";
import * as React from "react";

import * as states from "src/states";
import * as utils from "src/utils";

const ToggleShowMobileButton = () => {
  const session = React.use(states.session_key_context);
  const [show_mobile, set_show_mobile] = Jotai.useAtom(
    states.show_mobile_atom_map.get(session),
  );
  const setShowMobileUpdatedAt = Jotai.useSetAtom(
    states.showMobileUpdatedAtAtomMap.get(session),
  );
  const handleClick = React.useCallback(() => {
    set_show_mobile((v) => !v);
    setShowMobileUpdatedAt(Date.now());
  }, [set_show_mobile, setShowMobileUpdatedAt]);
  return (
    <span
      onClick={handleClick}
      onDoubleClick={utils.prevent_propagation}
      role="button"
      tabIndex={0}
    >
      {show_mobile ? "Show desktop version" : "Show mobile version"}
    </span>
  );
};

export default ToggleShowMobileButton;
