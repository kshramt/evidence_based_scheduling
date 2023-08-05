import * as Jotai from "jotai";
import * as React from "react";

import * as states from "src/states";
import * as utils from "src/utils";

import Component from "./Component";

const ToggleShowMobileButton = () => {
  const session = React.useContext(states.session_key_context);
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
    <Component
      onClick={handleClick}
      show_mobile={show_mobile}
      onDoubleClick={utils.prevent_propagation}
    />
  );
};

export default ToggleShowMobileButton;
