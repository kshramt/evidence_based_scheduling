import * as Jotai from "jotai";
import * as Mt from "@mantine/core";
import * as React from "react";

import * as states from "src/states";

const ShowGanttToggle = () => {
  const session = React.useContext(states.session_key_context);
  const [showGantt, setShowGantt] = Jotai.useAtom(
    states.showGanttAtomMap.get(session),
  );

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setShowGantt(event.target.checked);
    },
    [setShowGantt],
  );

  return (
    <Mt.Switch checked={showGantt} onChange={handleChange} label="Gantt" />
  );
};

export default ShowGanttToggle;
