import * as Jotai from "jotai";
import * as React from "react";
import { useCallback } from "react";
import * as Dnd from "react-dnd";

import * as types from "./types";
import { useDispatch, useSelector } from "./types";
import * as actions from "./actions";
import * as consts from "./consts";
import * as states from "./states";
import * as total_time_utils from "./total_time_utils";
import * as utils from "./utils";
import { prevent_propagation } from "./utils";
import * as ops from "./ops";
import * as toast from "./toast";
import * as undoable from "./undoable";
import AutoHeightTextArea from "./AutoHeightTextArea";
import MenuButton from "./Header/MenuButton";
import TocForm from "./Details/Component/TocForm";
import ScrollBackToTopButton from "./ScrollBackToTopButton";
import ToggleButton from "./ToggleButton";

const SCROLL_BACK_TO_TOP_MARK = (
  <span className="material-icons">vertical_align_top</span>
);
const WEEK_0_BEGIN = new Date(Date.UTC(2021, 12 - 1, 27));
const WEEK_MSEC = 86400 * 1000 * 7;
const EMPTY_STRING = "";

const TREE_PREFIX = "t-";

const DEFAULT_DELAY_MSEC = 10_000;

export const MobileApp = React.memo(
  (props: { ctx: states.PersistentStateManager; logOut: () => void }) => {
    return (
      <div className="flex flex-col h-screen w-screen">
        <MobileMenu ctx={props.ctx} logOut={props.logOut} />
        <MobileBody />
      </div>
    );
  },
);

export const DesktopApp = React.memo(
  (props: { ctx: states.PersistentStateManager; logOut: () => void }) => {
    return (
      <div className="flex flex-col h-screen w-screen">
        <Menu ctx={props.ctx} logOut={props.logOut} />
        <Body />
      </div>
    );
  },
);

const MobileNodeFilterQueryInput = () => {
  const [nodeFilterQuery, setNodeFilterQuery] = Jotai.useAtom(
    states.nodeFilterQueryState,
  );
  const handle_change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setNodeFilterQuery(v);
    },
    [setNodeFilterQuery],
  );
  const clear_input = useCallback(() => {
    const v = EMPTY_STRING;
    setNodeFilterQuery(v);
  }, [setNodeFilterQuery]);
  return (
    <div className="flex items-center border border-solid border-neutral-400">
      <input
        value={nodeFilterQuery}
        onChange={handle_change}
        className="h-[2em] border-none w-[8em]"
      />
      <button
        className="icon-icon"
        onClick={clear_input}
        onDoubleClick={prevent_propagation}
      >
        {consts.DELETE_MARK}
      </button>
    </div>
  );
};

const NodeFilterQueryInput = () => {
  const [nodeFilterQuery, setNodeFilterQuery] = Jotai.useAtom(
    states.nodeFilterQueryState,
  );
  const handle_change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setNodeFilterQuery(v);
    },
    [setNodeFilterQuery],
  );
  const clear_input = useCallback(() => {
    const v = EMPTY_STRING;
    setNodeFilterQuery(v);
  }, [setNodeFilterQuery]);
  const ref = useMetaK();
  const queue = useQueue("todo_node_ids");
  const node_id = queue[0] || null;
  const handleKeyDown = useTaskShortcutKeys(node_id, TREE_PREFIX);

  return (
    <>
      {consts.SEARCH_MARK}
      <div className="flex items-center border border-solid border-neutral-400">
        <input
          value={nodeFilterQuery}
          onChange={handle_change}
          onKeyDown={handleKeyDown}
          className="h-[2em] border-none"
          ref={ref}
        />
        <button
          className="btn-icon"
          onClick={clear_input}
          onDoubleClick={prevent_propagation}
        >
          {consts.DELETE_MARK}
        </button>
      </div>
    </>
  );
};

const useQueue = (column: "todo_node_ids" | "non_todo_node_ids") => {
  const nodeFilterQuery = React.useDeferredValue(
    Jotai.useAtomValue(states.nodeFilterQueryState),
  );
  const queue = useSelector((state) => state[column]);
  const caches = useSelector((state) => state.caches);

  const filtered_queue = React.useMemo(() => {
    return queue.filter((node_id) => {
      const cache = caches[node_id];
      return !_should_hide_of(nodeFilterQuery, cache.text, node_id);
    });
  }, [queue, caches, nodeFilterQuery]);

  return filtered_queue;
};

const useMetaK = () => {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key === "k") {
        event.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  return ref;
};

const NodeIdsInput = () => {
  const [nodeIds, setNodeIds] = Jotai.useAtom(states.nodeIdsState);
  const handle_change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setNodeIds(v);
    },
    [setNodeIds],
  );
  const clear_input = useCallback(() => {
    const v = EMPTY_STRING;
    setNodeIds(v);
  }, [setNodeIds]);
  return (
    <>
      {consts.IDS_MARK}
      <div className="flex items-center border border-solid border-neutral-400">
        <input
          value={nodeIds}
          onChange={handle_change}
          className="h-[2em] border-none"
        />
        <button
          className="btn-icon"
          onClick={clear_input}
          onDoubleClick={prevent_propagation}
        >
          {consts.DELETE_MARK}
        </button>
      </div>
    </>
  );
};

const SBTTB = () => {
  return (
    <ScrollBackToTopButton className="sticky top-[60%] left-[50%] -translate-x-1/2 -translate-y-1/2 px-[0.15rem] dark:bg-neutral-300 bg-neutral-600 dark:hover:bg-neutral-400 hover:bg-neutral-500 text-center min-w-[3rem] h-[3rem] text-[2rem] border-none shadow-none opacity-70 hover:opacity-100 float-left mt-[-3rem] z-40">
      {SCROLL_BACK_TO_TOP_MARK}
    </ScrollBackToTopButton>
  );
};

export const ToggleShowMobileButton = () => {
  const session = React.useContext(states.session_key_context);
  const [show_mobile, set_show_mobile] = Jotai.useAtom(
    states.show_mobile_atom_map.get(session),
  );
  const setShowMobileUpdatedAt = Jotai.useSetAtom(
    states.showMobileUpdatedAtAtomMap.get(session),
  );
  const handleClick = useCallback(() => {
    set_show_mobile((v) => !v);
    setShowMobileUpdatedAt(Date.now());
  }, [set_show_mobile, setShowMobileUpdatedAt]);
  return (
    <button
      className="btn-icon"
      onClick={handleClick}
      onDoubleClick={prevent_propagation}
    >
      {show_mobile ? consts.DESKTOP_MARK : consts.MOBILE_MARK}
    </button>
  );
};

const Menu = (props: {
  ctx: states.PersistentStateManager;
  logOut: () => void;
}) => {
  const root = useSelector((state) => state.data.root);
  const dispatch = useDispatch();
  const stop_all = useCallback(
    () => dispatch(actions.stop_all_action()),
    [dispatch],
  );
  const session = React.useContext(states.session_key_context);
  const [show_todo_only, set_show_todo_only] = Jotai.useAtom(
    states.show_todo_only_atom_map.get(session),
  );
  const [show_strong_edge_only, set_show_strong_edge_only] = Jotai.useAtom(
    states.show_strong_edge_only_atom_map.get(session),
  );
  const _undo = useCallback(() => {
    dispatch({ type: undoable.UNDO_TYPE });
  }, [dispatch]);
  const _redo = useCallback(() => {
    dispatch({ type: undoable.REDO_TYPE });
  }, [dispatch]);
  const _smallestToTop = useCallback(() => {
    dispatch(actions.smallestToTop());
  }, [dispatch]);
  const _closestToTop = useCallback(() => {
    dispatch(actions.closestToTop());
  }, [dispatch]);
  const move_important_node_to_top = useCallback(() => {
    dispatch(actions.move_important_node_to_top_action());
  }, [dispatch]);
  const check_remote_head = useCallback(async () => {
    try {
      await props.ctx.check_remote_head();
    } catch {}
  }, [props.ctx]);
  return (
    <div
      className={`flex items-center overflow-x-auto h-[3rem] gap-x-[0.25em] w-full top-0  bg-neutral-200 dark:bg-neutral-900`}
    >
      <MenuButton
        onClickCheckRemoteButton={check_remote_head}
        db={props.ctx.db}
        logOut={props.logOut}
      />
      <button
        className="btn-icon"
        onClick={stop_all}
        onDoubleClick={prevent_propagation}
      >
        {consts.STOP_MARK}
      </button>
      <AddButton node_id={root} id="add-root-button" />
      <button
        className="btn-icon"
        arial-label="Undo."
        onClick={_undo}
        onDoubleClick={prevent_propagation}
      >
        {consts.UNDO_MARK}
      </button>
      <button
        className="btn-icon"
        arial-label="Redo."
        onClick={_redo}
        onDoubleClick={prevent_propagation}
      >
        <span className="material-icons">redo</span>
      </button>
      <div onClick={get_toggle(set_show_todo_only)} className="shrink-0">
        TODO{" "}
        <input
          type="radio"
          checked={show_todo_only}
          onChange={_suppress_missing_onChange_handler_warning}
        />
      </div>
      <div onClick={get_toggle(set_show_strong_edge_only)} className="shrink-0">
        Strong{" "}
        <input
          type="radio"
          checked={show_strong_edge_only}
          onChange={_suppress_missing_onChange_handler_warning}
        />
      </div>
      <button
        className="btn-icon shrink-0"
        onClick={_smallestToTop}
        onDoubleClick={prevent_propagation}
      >
        Small
      </button>
      <button
        className="btn-icon shrink-0"
        onClick={_closestToTop}
        onDoubleClick={prevent_propagation}
      >
        Due
      </button>
      <button
        className="btn-icon shrink-0"
        onClick={move_important_node_to_top}
        onDoubleClick={prevent_propagation}
      >
        Important
      </button>
      <NodeFilterQueryInput />
      <NodeIdsInput />
      <span className="grow" />
      <NLeftButton />
    </div>
  );
};

const Body = () => {
  const root = useSelector((state) => {
    return state.data.root;
  });
  const session = React.useContext(states.session_key_context);
  const [pin, setPin] = Jotai.useAtom(states.pinQueueAtomMap.get(session));
  return (
    <div className="flex flex-1 gap-x-[1em] overflow-y-hidden">
      <div className={`overflow-y-auto shrink-0`}>
        <SBTTB />
        <ToggleButton
          value={pin}
          setValue={setPin}
          titleOnFalse="Pin"
          titleOnTrue="Unpin"
        />
        <PredictedNextNodes />
        <TodoQueueNodes />
      </div>
      <div className={utils.join("flex", pin && "w-full overflow-x-auto")}>
        <CoveyQuadrants />
        <div className={`overflow-y-auto shrink-0`}>
          <Timeline />
        </div>
        <div className={`overflow-y-auto shrink-0`}>
          <SBTTB />
          <TreeNode node_id={root} />
        </div>
        <div className={`overflow-y-auto shrink-0`}>
          <SBTTB />
          <NonTodoQueueNodes />
        </div>
        <PinnedSubTrees />
      </div>
    </div>
  );
};

const CoveyQuadrants = () => {
  return (
    <>
      <div className={`w-[16em] shrink-0`}>
        <CoveyQuadrant quadrant_id="important_urgent" />
        <CoveyQuadrant quadrant_id="not_important_urgent" />
      </div>
      <div className={`w-[16em] shrink-0`}>
        <CoveyQuadrant quadrant_id="important_not_urgent" />
        <CoveyQuadrant quadrant_id="not_important_not_urgent" />
      </div>
    </>
  );
};

const PinnedSubTrees = React.memo(() => {
  const pinned_sub_trees = useSelector((state) => {
    return state.data.pinned_sub_trees;
  });
  return (
    <>
      {pinned_sub_trees.map((node_id) => {
        return <DndTreeNode key={node_id} node_id={node_id} />;
      })}
    </>
  );
});

const TogglePinButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const pinned_sub_trees = useSelector((state) => {
    return state.data.pinned_sub_trees;
  });
  const on_click = React.useCallback(() => {
    dispatch(actions.toggle_pin_action({ node_id: props.node_id }));
  }, [props.node_id, dispatch]);
  const is_pinned = pinned_sub_trees.includes(props.node_id);
  return (
    <button
      className="btn-icon"
      onClick={on_click}
      onDoubleClick={prevent_propagation}
    >
      {is_pinned ? "Unpin" : "Pin"}
    </button>
  );
};

const DoneOrDontToTodoButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const on_click = React.useCallback(() => {
    dispatch(actions.done_or_dont_to_todo_action(props.node_id));
  }, [props.node_id, dispatch]);
  return (
    <button
      className="btn-icon"
      onClick={on_click}
      onDoubleClick={prevent_propagation}
    >
      {consts.UNDO_MARK}
    </button>
  );
};

const EstimationInput = React.memo((props: { node_id: types.TNodeId }) => {
  const estimate = useSelector(
    (state) => state.data.nodes[props.node_id].estimate,
  );
  const dispatch = useDispatch();
  const on_change = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        actions.set_estimate_action({
          node_id: props.node_id,
          estimate: Number(e.target.value),
        }),
      );
    },
    [props.node_id, dispatch],
  );

  return (
    <input
      type="number"
      step="any"
      min={0}
      value={estimate}
      onChange={on_change}
      onFocus={move_cursor_to_the_end}
      className="w-[3em]"
    />
  );
});

const CoveyQuadrant = React.memo(
  (props: {
    quadrant_id:
      | "important_urgent"
      | "important_not_urgent"
      | "not_important_urgent"
      | "not_important_not_urgent";
  }) => {
    const nodes = useSelector(
      (state) => state.data.covey_quadrants[props.quadrant_id].nodes,
    );
    const dispatch = useDispatch();
    const selectedNodeIds = Jotai.useAtomValue(states.nodeIdsState);
    const assign_nodes = React.useCallback(() => {
      const node_ids = node_ids_list_of_node_ids_string(selectedNodeIds);
      if (node_ids.length < 1) {
        return;
      }
      const payload = {
        quadrant_id: props.quadrant_id,
        node_ids,
      };
      dispatch(actions.assign_nodes_to_covey_quadrant_action(payload));
    }, [props.quadrant_id, selectedNodeIds, dispatch]);
    return (
      <div className={`overflow-y-auto h-[50%] p-[0.5em]`}>
        <button className="btn-icon" onClick={assign_nodes}>
          {consts.ADD_MARK}
        </button>
        {props.quadrant_id}
        {nodes
          .slice(0)
          .reverse()
          .map((node_id) => (
            <CoveyQuadrantNode
              node_id={node_id}
              quadrant_id={props.quadrant_id}
              key={node_id}
            />
          ))}
      </div>
    );
  },
);

const CoveyQuadrantNode = React.memo(
  (props: {
    node_id: types.TNodeId;
    quadrant_id:
      | "important_urgent"
      | "important_not_urgent"
      | "not_important_urgent"
      | "not_important_not_urgent";
  }) => {
    const text = useSelector((state) => state.caches[props.node_id].text);
    const status = useSelector(
      (state) => state.data.nodes[props.node_id].status,
    );
    const dispatch = useDispatch();
    const { isOn, turnOn, turnOff } = useOn();
    const is_running = useIsRunning(props.node_id);
    const unassign_node = React.useCallback(() => {
      dispatch(
        actions.unassign_nodes_of_covey_quadrant_action({
          quadrant_id: props.quadrant_id,
          node_ids: [props.node_id],
        }),
      );
    }, [props.quadrant_id, props.node_id, dispatch]);
    const to_tree = useToTree(props.node_id);
    return status === "todo" ? (
      <div
        className={utils.join(
          "p-[0.0625em] inline-block",
          is_running ? "running" : undefined,
        )}
        onMouseOver={turnOn}
        onMouseLeave={turnOff}
      >
        <span
          onClick={to_tree}
          className="w-[15em] block whitespace-nowrap overflow-hidden cursor-pointer"
        >
          {text.slice(0, 40)}
        </span>
        {(isOn || is_running) && (
          <div className="flex w-fit gap-x-[0.25em]">
            <StartButton node_id={props.node_id} />
            <StartConcurrentButton node_id={props.node_id} />
            <CopyNodeIdButton node_id={props.node_id} />
            <button className="btn-icon" onClick={unassign_node}>
              {consts.DELETE_MARK}
            </button>
          </div>
        )}
      </div>
    ) : null;
  },
);

const Timeline = React.memo(() => {
  const dispatch = useDispatch();
  const count = useSelector((state) => state.data.timeline.count);
  const increment_count = React.useCallback(
    () => dispatch(actions.increment_count_action()),
    [dispatch],
  );
  const decade_nodes = React.useMemo(() => {
    const res = [];
    for (let i_count = 0; i_count < count; ++i_count) {
      const time_node_id = `e${i_count}`;
      if (types.is_TTimeNodeId(time_node_id)) {
        res.push(<TimeNode time_node_id={time_node_id} key={time_node_id} />);
      }
    }
    return res;
  }, [count]);
  return (
    <>
      {decade_nodes}
      <button className="btn-icon" onClick={increment_count}>
        {consts.ADD_MARK}
      </button>
    </>
  );
});

const TimeNode = React.memo((props: { time_node_id: types.TTimeNodeId }) => {
  const time_node = useSelector(
    (state) => state.data.timeline.time_nodes[props.time_node_id],
  );

  const year_begin = useSelector((state) => state.data.timeline.year_begin);
  const child_time_node_ids = child_time_node_ids_of(
    props.time_node_id,
    year_begin,
  );
  const id = `tl-${props.time_node_id}`;
  const id_el = (
    <a href={`#${id}`} id={id}>
      {time_node_id_repr_of(props.time_node_id, year_begin)}
    </a>
  );

  const node_ids =
    time_node?.show_children !== "none"
      ? ops.sorted_keys_of(time_node?.nodes || {})
      : [];
  const planned_nodes = node_ids.map((node_id) => (
    <tr key={node_id}>
      <td />
      <PlannedNode
        node_id={node_id}
        time_node_id={props.time_node_id}
        Component="td"
      />
    </tr>
  ));
  if (props.time_node_id[0] === "h") {
    return (
      <>
        <tr>
          <td>{id_el}</td>
          <TimeNodeEntry time_node_id={props.time_node_id} />
        </tr>
        {planned_nodes}
      </>
    );
  }
  if (props.time_node_id[0] === "d") {
    return (
      <table>
        <tbody>
          <tr>
            <td />
            <td> {id_el}</td>
          </tr>
          <tr>
            <td />
            <TimeNodeEntry time_node_id={props.time_node_id} />
          </tr>
          {planned_nodes}
          {child_time_node_ids.map((child_time_node_id) => (
            <TimeNode
              time_node_id={child_time_node_id}
              key={child_time_node_id}
            />
          ))}
        </tbody>
      </table>
    );
  }
  const children =
    time_node?.show_children === "full" &&
    child_time_node_ids.map((child_time_node_id) => (
      <TimeNode time_node_id={child_time_node_id} key={child_time_node_id} />
    ));

  return (
    <div className="pb-[0.0625em] pl-[0.5em] flex gap-x-[0.125em] items-start">
      <div>
        {id_el}
        <TimeNodeEntry time_node_id={props.time_node_id} />
        {node_ids.map((node_id) => (
          <PlannedNode
            node_id={node_id}
            time_node_id={props.time_node_id}
            Component="div"
            key={node_id}
          />
        ))}
      </div>
      {props.time_node_id[0] === "w" ? children : <div>{children}</div>}
    </div>
  );
});

const TimeNodeEntry = React.memo(
  (props: { time_node_id: types.TTimeNodeId }) => {
    const dispatch = useDispatch();
    const time_node = useSelector(
      (state) => state.data.timeline.time_nodes[props.time_node_id],
    );
    const selectedNodeIds = Jotai.useAtomValue(states.nodeIdsState);
    const text = time_node?.text ? time_node.text : EMPTY_STRING;
    const { isOn, turnOn, turnOff } = useOn(0);

    const toggle_show_children = React.useCallback(() => {
      const payload = props.time_node_id;
      dispatch(actions.toggle_show_time_node_children_action(payload));
    }, [props.time_node_id, dispatch]);
    const assign_nodes = React.useCallback(() => {
      const node_ids = node_ids_list_of_node_ids_string(selectedNodeIds);
      if (node_ids.length < 1) {
        return;
      }
      const payload = {
        time_node_id: props.time_node_id,
        node_ids,
      };
      dispatch(actions.assign_nodes_to_time_node_action(payload));
    }, [props.time_node_id, selectedNodeIds, dispatch]);
    const dispatch_set_text_action = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const el = e.target;
        dispatch(
          actions.set_time_node_text_action({
            time_node_id: props.time_node_id,
            text: el.innerText,
          }),
        );
      },
      [dispatch, props.time_node_id],
    );

    return (
      <td onMouseLeave={turnOff}>
        <AutoHeightTextArea
          text={text}
          onBlur={dispatch_set_text_action}
          onClick={turnOn}
          onDoubleClick={prevent_propagation}
          className="textarea whitespace-pre-wrap overflow-wrap-anywhere w-[17em] overflow-hidden p-[0.125em] bg-white dark:bg-neutral-800 py-[0.4em]"
        />
        {isOn && (
          <div className="flex w-fit gap-x-[0.125em]">
            <button className="btn-icon" onClick={assign_nodes}>
              {consts.ADD_MARK}
            </button>
            <CopyDescendantTimeNodesPlannedNodeIdsButton
              time_node_id={props.time_node_id}
            />
            <button className="btn-icon" onClick={toggle_show_children}>
              {time_node === undefined || time_node.show_children === "partial"
                ? consts.IS_PARTIAL_MARK
                : time_node.show_children === "full"
                ? consts.IS_FULL_MARK
                : consts.IS_NONE_MARK}
            </button>
          </div>
        )}
      </td>
    );
  },
);

const PlannedNode = (props: {
  node_id: types.TNodeId;
  time_node_id: types.TTimeNodeId;
  Component: "div" | "td";
}) => {
  const text = useSelector((state) => state.caches[props.node_id].text);
  const status = useSelector((state) => state.data.nodes[props.node_id].status);
  const dispatch = useDispatch();
  const { isOn, turnOn, turnOff } = useOn();
  const is_running = useIsRunning(props.node_id);
  const unassign_node = React.useCallback(() => {
    dispatch(
      actions.unassign_nodes_of_time_node_action({
        time_node_id: props.time_node_id,
        node_ids: [props.node_id],
      }),
    );
  }, [props.time_node_id, props.node_id, dispatch]);
  const to_tree = useToTree(props.node_id);
  return (
    <props.Component
      className={utils.join(
        "py-[0.0625em]",
        is_running ? "running" : undefined,
      )}
      onMouseOver={turnOn}
      onMouseLeave={turnOff}
    >
      <span
        title={text}
        onClick={to_tree}
        className={utils.join(
          "w-[15em] block whitespace-nowrap overflow-hidden cursor-pointer",
          status === "done"
            ? "text-red-600 dark:text-red-400"
            : status === "dont"
            ? "text-neutral-500"
            : undefined,
        )}
      >
        {text.slice(0, 40)}
      </span>
      {(isOn || is_running) && (
        <div className="flex w-fit gap-x-[0.25em]">
          {is_running ? (
            <StopButton node_id={props.node_id} />
          ) : (
            <>
              <StartButton node_id={props.node_id} />
              <StartConcurrentButton node_id={props.node_id} />
            </>
          )}
          <CopyNodeIdButton node_id={props.node_id} />
          <button className="btn-icon" onClick={unassign_node}>
            {consts.DELETE_MARK}
          </button>
        </div>
      )}
    </props.Component>
  );
};

const TodoQueueNodes = () => {
  const queue = useQueue("todo_node_ids");
  return <QueueNodes node_ids={queue} />;
};

const QueueNodes = React.memo((props: { node_ids: types.TNodeId[] }) => {
  return (
    <ol className="list-outside pl-[4em]">
      {props.node_ids.map((node_id) => (
        <QueueEntry node_id={node_id} key={node_id} />
      ))}
    </ol>
  );
});

const DndTreeNode = React.memo((props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const [{ isDragging }, drag] = Dnd.useDrag(
    {
      type: "tree_node",
      item: { node_id: props.node_id },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    },
    [props.node_id],
  );
  const [{ canDrop }, drop] = Dnd.useDrop(
    {
      accept: "tree_node",
      drop: (item: { node_id: types.TNodeId }) => {
        if (item.node_id === props.node_id) {
          return;
        }
        dispatch(
          actions.move_pinned_sub_tree_action({
            from: item.node_id,
            to: props.node_id,
          }),
        );
      },
      collect: (monitor) => ({
        canDrop:
          !!monitor.canDrop() &&
          !!monitor.isOver() &&
          monitor.getItem().node_id !== props.node_id,
      }),
    },
    [props.node_id, dispatch],
  );
  const ref = React.useCallback(
    (el: HTMLDivElement | null) => {
      drag(drop(el));
    },
    [drag, drop],
  );
  return (
    <div
      ref={ref}
      className={utils.join(
        isDragging ? "opacity-50" : "opacity-100",
        "overflow-y-auto shrink-0 relative",
      )}
    >
      <TreeNode node_id={props.node_id} prefix="p-" />
      {canDrop && (
        <div className="absolute top-0 left-0 h-full w-full z-10 opacity-50 bg-yellow-200 dark:bg-yellow-900" />
      )}
    </div>
  );
});

const TreeNode = React.memo(
  (props: { node_id: types.TNodeId; prefix?: string }) => {
    return (
      <>
        <TreeEntry node_id={props.node_id} prefix={props.prefix} />
        <EdgeList node_id={props.node_id} prefix={props.prefix} />
      </>
    );
  },
);

const NonTodoQueueNodes = () => {
  const node_ids = useQueue("non_todo_node_ids");
  return <QueueNodes node_ids={node_ids} />;
};

const EdgeList = React.memo(
  (props: { node_id: types.TNodeId; prefix?: string }) => {
    const children = useSelector(
      (state) => state.data.nodes[props.node_id].children,
    );
    const edge_ids = ops.sorted_keys_of(children);
    return edge_ids.length ? (
      <ol className="list-outside pl-[4em]">
        {edge_ids.map((edge_id) => (
          <Edge edge_id={edge_id} key={edge_id} prefix={props.prefix} />
        ))}
      </ol>
    ) : null;
  },
);

const Edge = React.memo(
  (props: { edge_id: types.TEdgeId; prefix?: string }) => {
    const session = React.useContext(states.session_key_context);
    const show_todo_only = Jotai.useAtomValue(
      states.show_todo_only_atom_map.get(session),
    );
    const show_strong_edge_only = Jotai.useAtomValue(
      states.show_strong_edge_only_atom_map.get(session),
    );
    const edge = useSelector((state) => state.data.edges[props.edge_id]);
    const child_node_status = useSelector(
      (state) => state.data.nodes[edge.c].status,
    );
    if (
      edge.hide ||
      (show_strong_edge_only && edge.t === "weak") ||
      (show_todo_only && child_node_status !== "todo")
    ) {
      return null;
    }
    return (
      <li>
        <TreeNode node_id={edge.c} prefix={props.prefix} />
      </li>
    );
  },
);

const QueueEntry = React.memo((props: { node_id: types.TNodeId }) => {
  const { isOn, turnOn, turnOff } = useOn(0);
  const show_detail = useSelector(
    (state) => state.caches[props.node_id].show_detail,
  );
  const cache = useSelector((state) => state.caches[props.node_id]);
  const status = useSelector((state) => state.data.nodes[props.node_id].status);
  const is_todo = status === "todo";
  const is_running = useIsRunning(props.node_id);
  const to_tree = useToTree(props.node_id);
  const handleKeyDown = useTaskShortcutKeys(props.node_id, TREE_PREFIX);

  return (
    <EntryWrapper node_id={props.node_id} onMouseLeave={turnOff} component="li">
      <div className="flex items-end w-fit">
        <button onClick={to_tree}>←</button>
        <CopyNodeIdButton node_id={props.node_id} />
        <TextArea
          node_id={props.node_id}
          id={utils.queue_textarea_id_of(props.node_id)}
          className="w-[29em]"
          onKeyDown={handleKeyDown}
          onClick={turnOn}
        />
        <EntryInfos node_id={props.node_id} />
      </div>
      {is_todo &&
        0 <= cache.leaf_estimates_sum &&
        digits1(cache.leaf_estimates_sum) + " | "}
      {is_todo && cache.percentiles.map(digits1).join(", ")}
      {(isOn || is_running || show_detail) && (
        <EntryButtons node_id={props.node_id} />
      )}
      <Details node_id={props.node_id} />
    </EntryWrapper>
  );
});

const MobileMenu = (props: {
  ctx: states.PersistentStateManager;
  logOut: () => void;
}) => {
  const root = useSelector((state) => state.data.root);
  const dispatch = useDispatch();
  const stop_all = useCallback(
    () => dispatch(actions.stop_all_action()),
    [dispatch],
  );
  const session = React.useContext(states.session_key_context);
  const [show_todo_only, set_show_todo_only] = Jotai.useAtom(
    states.show_todo_only_atom_map.get(session),
  );
  const _undo = useCallback(() => {
    dispatch({ type: undoable.UNDO_TYPE });
  }, [dispatch]);
  const _redo = useCallback(() => {
    dispatch({ type: undoable.REDO_TYPE });
  }, [dispatch]);
  const check_remote_head = useCallback(async () => {
    try {
      await props.ctx.check_remote_head();
    } catch {}
  }, [props.ctx]);
  return (
    <div
      className={`flex items-center overflow-x-auto gap-x-[0.25em] h-[3rem] w-full top-0 bg-neutral-200 dark:bg-neutral-900`}
    >
      <MenuButton
        onClickCheckRemoteButton={check_remote_head}
        db={props.ctx.db}
        logOut={props.logOut}
      />
      <button
        className="btn-icon"
        onClick={stop_all}
        onDoubleClick={prevent_propagation}
      >
        {consts.STOP_MARK}
      </button>
      <AddButton node_id={root} />
      <button
        className="btn-icon"
        arial-label="Undo."
        onClick={_undo}
        onDoubleClick={prevent_propagation}
      >
        {consts.UNDO_MARK}
      </button>
      <button
        className="btn-icon"
        arial-label="Redo."
        onClick={_redo}
        onDoubleClick={prevent_propagation}
      >
        <span className="material-icons">redo</span>
      </button>
      <div onClick={get_toggle(set_show_todo_only)} className="shrink-0">
        TODO{" "}
        <input
          type="radio"
          checked={show_todo_only}
          onChange={_suppress_missing_onChange_handler_warning}
        />
      </div>
      <MobileNodeFilterQueryInput />
      <span className="grow" />
      <NLeftButton />
    </div>
  );
};

const MobileBody = () => {
  return (
    <div className="flex flex-1 gap-x-[1em] overflow-y-hidden">
      <div className={`overflow-y-auto shrink-0`}>
        <MobileQueueColumn />
      </div>
    </div>
  );
};

const MobileQueueColumn = () => {
  return (
    <>
      <MobilePredictedNextNodes />
      <MobileQueueNodes />
    </>
  );
};

const MobileQueueNodes = () => {
  const queue = useSelector((state) => state.data.queue);
  const caches = useSelector((state) => state.caches);
  const nodes = useSelector((state) => state.data.nodes);
  const session = React.useContext(states.session_key_context);
  const show_todo_only = Jotai.useAtomValue(
    states.show_todo_only_atom_map.get(session),
  );
  const nodeFilterQuery = React.useDeferredValue(
    Jotai.useAtomValue(states.nodeFilterQueryState),
  );

  const node_ids = React.useMemo(() => {
    return ops
      .sorted_keys_of(queue)
      .filter((node_id) => {
        const node = nodes[node_id];
        const cache = caches[node_id];
        return !(
          (show_todo_only && node.status !== "todo") ||
          _should_hide_of(nodeFilterQuery, cache.text, node_id)
        );
      })
      .slice(0, 100);
  }, [queue, caches, nodes, show_todo_only, nodeFilterQuery]);

  return <MobileQueueNodesImpl node_ids={node_ids} />;
};

const MobileQueueNodesImpl = React.memo(
  (props: { node_ids: types.TNodeId[] }) => {
    return (
      <>
        {props.node_ids.map((node_id) => (
          <EntryWrapper node_id={node_id} key={node_id}>
            <TextArea node_id={node_id} className="w-[100vw]" />
            <MobileEntryButtons node_id={node_id} />
            <Details node_id={node_id} />
          </EntryWrapper>
        ))}
      </>
    );
  },
);

const TreeEntry = React.memo(
  (props: { node_id: types.TNodeId; prefix?: string }) => {
    const show_detail = useSelector(
      (state) => state.caches[props.node_id].show_detail,
    );
    const { isOn, turnOn, turnOff } = useOn(0);
    const is_running = useIsRunning(props.node_id);
    const cache = useSelector((state) => state.caches[props.node_id]);
    const status = useSelector(
      (state) => state.data.nodes[props.node_id].status,
    );
    const to_queue = useToQueue(props.node_id);
    const root = useSelector((state) => state.data.root);
    const is_root = props.node_id === root;
    const prefix = props.prefix || TREE_PREFIX;
    const handleKeyDown = useTaskShortcutKeys(props.node_id, prefix);

    return (
      <EntryWrapper node_id={props.node_id} onMouseLeave={turnOff}>
        <div className="flex items-end w-fit">
          {is_root ? null : <button onClick={to_queue}>→</button>}
          <CopyNodeIdButton node_id={props.node_id} />
          <TextArea
            node_id={props.node_id}
            id={`${prefix}${props.node_id}`}
            className="w-[29em]"
            onKeyDown={handleKeyDown}
            onClick={turnOn}
          />
          <EntryInfos node_id={props.node_id} />
        </div>
        {status === "todo" &&
          0 <= cache.leaf_estimates_sum &&
          digits1(cache.leaf_estimates_sum) + " | "}
        {status === "todo" && cache.percentiles.map(digits1).join(", ")}
        {(isOn || is_running || show_detail) && (
          <EntryButtons node_id={props.node_id} prefix={prefix} />
        )}
        <Details node_id={props.node_id} />
      </EntryWrapper>
    );
  },
);

const useTaskShortcutKeys = (node_id: null | types.TNodeId, prefix: string) => {
  const dispatch = useDispatch();
  const session = React.useContext(states.session_key_context);
  const show_mobile = Jotai.useAtomValue(
    states.show_mobile_atom_map.get(session),
  );
  const is_running = useIsRunning(node_id);
  return React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (node_id === null) {
        return;
      }
      if (event.ctrlKey || event.metaKey) {
        if (event.key === "Enter") {
          event.preventDefault();
          dispatch(actions.add_action({ node_id, show_mobile }));
          dispatch(focusFirstChildTextAreaActionOf(node_id, prefix));
        } else if (event.key === ".") {
          event.preventDefault();
          if (is_running) {
            if (event.shiftKey) {
              dispatch(actions.stop_action(node_id));
            } else {
              dispatch(actions.stop_all_action());
            }
          } else {
            dispatch(
              actions.start_action({ node_id, is_concurrent: event.shiftKey }),
            );
          }
        }
      } else if (event.key === "Enter") {
        event.preventDefault();
        doFocusTextArea(`${prefix}${node_id}`);
      }
    },
    [node_id, is_running, show_mobile, dispatch, prefix],
  );
};

const Details = React.memo((props: { node_id: types.TNodeId }) => {
  const show_detail = useSelector(
    (state) => state.caches[props.node_id].show_detail,
  );
  return show_detail ? <DetailsImpl node_id={props.node_id} /> : null;
});

const DetailsImpl = React.memo((props: { node_id: types.TNodeId }) => {
  const [new_edge_type, set_new_edge_type] =
    React.useState<types.TEdgeType>("weak");
  const handle_new_edge_type_change = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      if (types.is_TEdgeType(v)) {
        set_new_edge_type(v);
      } else {
        toast.add("error", `Invalid edge type: ${v}`);
      }
    },
    [set_new_edge_type],
  );
  const dispatch = useDispatch();
  const nodeIds = Jotai.useAtomValue(states.nodeIdsState);
  const handle_add_parents = React.useCallback(() => {
    dispatch(
      actions.add_edges_action(
        node_ids_list_of_node_ids_string(nodeIds).map((p) => ({
          p,
          c: props.node_id,
          t: new_edge_type,
        })),
      ),
    );
  }, [dispatch, nodeIds, new_edge_type, props.node_id]);
  const handle_add_children = React.useCallback(() => {
    dispatch(
      actions.add_edges_action(
        node_ids_list_of_node_ids_string(nodeIds).map((c) => ({
          p: props.node_id,
          c,
          t: new_edge_type,
        })),
      ),
    );
  }, [dispatch, nodeIds, new_edge_type, props.node_id]);
  const hline = (
    <hr className="my-[0.5em] border-neutral-300 dark:border-neutral-600 bg-neutral-300 dark:bg-neutral-600" />
  );
  return (
    <div className="pt-[0.25em] bg-neutral-200 dark:bg-neutral-900">
      {hline}
      <div className="flex w-fit gap-x-[0.25em] items-baseline">
        <TogglePinButton node_id={props.node_id} />
        <TocForm nodeId={props.node_id} />
      </div>
      {hline}
      <div className="flex gap-x-[0.25em] items-baseline">
        Add:
        <select value={new_edge_type} onChange={handle_new_edge_type_change}>
          {types.edge_type_values.map((t, i) => (
            <option value={t} key={i}>
              {t}
            </option>
          ))}
        </select>
        <button
          className="btn-icon"
          onClick={handle_add_parents}
          onDoubleClick={prevent_propagation}
        >
          Parents
        </button>
        <button
          className="btn-icon"
          onClick={handle_add_children}
          onDoubleClick={prevent_propagation}
        >
          Children
        </button>
      </div>
      {hline}
      <ParentEdgeTable node_id={props.node_id} />
      {hline}
      <ChildEdgeTable node_id={props.node_id} />
      {hline}
      <RangesTable node_id={props.node_id} />
      {hline}
    </div>
  );
});

const RangesTable = (props: { node_id: types.TNodeId }) => {
  const rows_per_page = 10;
  const [offset, set_offset] = React.useState(0);
  const n = useSelector(
    (state) => state.data.nodes[props.node_id].ranges.length,
  );
  const handle_offset_input = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      set_offset(Math.min(Math.max(0, parseInt(e.target.value)), n - 1)),
    [n, set_offset],
  );
  const handle_offset_next = React.useCallback(
    () => set_offset((offset) => Math.min(offset + rows_per_page, n - 1)),
    [n, set_offset],
  );
  const handle_offset_prev = React.useCallback(
    () => set_offset((offset) => Math.max(offset - rows_per_page, 0)),
    [set_offset],
  );
  const rows = [];
  for (let i = offset; i < Math.min(offset + rows_per_page, n); ++i) {
    const i_range = n - i - 1;
    rows[i] = (
      <RangesTableRow i_range={i_range} node_id={props.node_id} key={i_range} />
    );
  }
  return (
    <>
      <div className="flex gap-x-[0.25em] items-baseline">
        <button
          disabled={offset - rows_per_page < 0}
          onClick={handle_offset_prev}
          className="btn-icon"
          onDoubleClick={prevent_propagation}
        >
          {consts.BACK_MARK}
        </button>
        <input
          onChange={handle_offset_input}
          type="number"
          className="w-[5em]"
          value={offset}
        />
        /{n}
        <button
          disabled={n <= offset + rows_per_page}
          onClick={handle_offset_next}
          className="btn-icon"
          onDoubleClick={prevent_propagation}
        >
          {consts.FORWARD_MARK}
        </button>
      </div>
      <table className="table-auto">
        <tbody className="block max-h-[10em] overflow-y-auto">{rows}</tbody>
      </table>
    </>
  );
};
const RangesTableRow = (props: { node_id: types.TNodeId; i_range: number }) => {
  const range = useSelector(
    (state) => state.data.nodes[props.node_id].ranges[props.i_range],
  );
  const dispatch = useDispatch();
  const set_start = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        actions.set_range_value_action({
          node_id: props.node_id,
          i_range: props.i_range,
          k: "start",
          v: e.target.value,
        }),
      );
    },
    [props.node_id, props.i_range, dispatch],
  );
  const set_end = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        actions.set_range_value_action({
          node_id: props.node_id,
          i_range: props.i_range,
          k: "end",
          v: e.target.value,
        }),
      );
    },
    [props.node_id, props.i_range, dispatch],
  );
  const handle_delete = React.useCallback(() => {
    dispatch(
      actions.delete_range_action({
        node_id: props.node_id,
        i_range: props.i_range,
      }),
    );
  }, [props.node_id, props.i_range, dispatch]);
  const start_date = utils.datetime_local_of_milliseconds(range.start);
  const end_date = range.end
    ? utils.datetime_local_of_milliseconds(range.end)
    : undefined;
  return React.useMemo(
    () => (
      <tr>
        <td className="p-[0.25em]">
          <input
            type="datetime-local"
            value={start_date}
            onChange={set_start}
          />
        </td>
        <td className="p-[0.25em]">
          {end_date && (
            <input type="datetime-local" value={end_date} onChange={set_end} />
          )}
        </td>
        <td className="p-[0.25em]">
          <button
            className="btn-icon"
            onClick={handle_delete}
            onDoubleClick={prevent_propagation}
          >
            {consts.DELETE_MARK}
          </button>
        </td>
      </tr>
    ),
    [end_date, start_date, handle_delete, set_start, set_end],
  );
};

const ChildEdgeTable = React.memo((props: { node_id: types.TNodeId }) => {
  const children = useSelector(
    (state) => state.data.nodes[props.node_id].children,
  );
  return (
    <table className="table-auto">
      <tbody className="block max-h-[10em] overflow-y-auto">
        {ops.sorted_keys_of(children).map((edge_id) => (
          <EdgeRow edge_id={edge_id} key={edge_id} target="c" />
        ))}
      </tbody>
    </table>
  );
});

const ParentEdgeTable = React.memo((props: { node_id: types.TNodeId }) => {
  const parents = useSelector(
    (state) => state.data.nodes[props.node_id].parents,
  );
  return (
    <table className="table-auto">
      <tbody className="block max-h-[10em] overflow-y-auto">
        {ops.sorted_keys_of(parents).map((edge_id) => (
          <EdgeRow edge_id={edge_id} key={edge_id} target={"p"} />
        ))}
      </tbody>
    </table>
  );
});

const EdgeRow = React.memo(
  (props: { edge_id: types.TEdgeId; target: "p" | "c" }) => {
    const edge = useSelector((state) => state.data.edges[props.edge_id]);
    const hide = useSelector((state) => state.data.edges[props.edge_id].hide);
    const dispatch = useDispatch();
    const delete_edge = React.useCallback(
      () => dispatch(actions.delete_edge_action(props.edge_id)),
      [props.edge_id, dispatch],
    );
    const set_edge_type = React.useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        const edge_type = e.target.value;
        if (types.is_TEdgeType(edge_type)) {
          dispatch(
            actions.set_edge_type_action({
              edge_id: props.edge_id,
              edge_type,
            }),
          );
        } else {
          toast.add("error", `Invalid edge type: ${edge_type}`);
        }
      },
      [props.edge_id, dispatch],
    );
    const toggle_edge_hide = React.useCallback(() => {
      dispatch(actions.toggle_edge_hide_action(props.edge_id));
    }, [props.edge_id, dispatch]);
    const node_id = edge[props.target];
    return (
      <tr>
        <EdgeRowContent node_id={node_id} />
        <td className="p-[0.25em]">
          <select value={edge.t} onChange={set_edge_type}>
            {types.edge_type_values.map((t, i) => (
              <option value={t} key={i}>
                {t}
              </option>
            ))}
          </select>
        </td>
        <td className="p-[0.25em]">
          <input
            type="radio"
            checked={!hide}
            onClick={toggle_edge_hide}
            onChange={_suppress_missing_onChange_handler_warning}
          />
        </td>
        <td className="p-[0.25em]">
          <button
            className="btn-icon"
            onClick={delete_edge}
            onDoubleClick={prevent_propagation}
          >
            {consts.DELETE_MARK}
          </button>
        </td>
      </tr>
    );
  },
);

const EdgeRowContent = React.memo((props: { node_id: types.TNodeId }) => {
  const to_tree = useToTree(props.node_id);
  const text = useSelector((state) => state.caches[props.node_id].text);
  const disabled = useSelector((state) => {
    return (
      props.node_id === state.data.root ||
      state.data.nodes[props.node_id].status !== "todo"
    );
  });
  return (
    <>
      <td>
        <TopButton node_id={props.node_id} disabled={disabled} />
      </td>
      <td title={text} onClick={to_tree} className="p-[0.25em] cursor-pointer">
        {text.slice(0, 15)}
      </td>
    </>
  );
});

const useIsRunning = (node_id: null | types.TNodeId) => {
  const ranges = useSelector((state) =>
    node_id === null ? null : state.data.nodes[node_id].ranges,
  );
  if (ranges === null) return false;
  const last_range = ranges.at(-1);
  const is_running = last_range && last_range.end === null;
  return is_running;
};

const EntryWrapper = (props: {
  node_id: types.TNodeId;
  children: React.ReactNode;
  onMouseOver?: () => void;
  onMouseLeave?: () => void;
  component?: keyof JSX.IntrinsicElements;
}) => {
  const is_running = useIsRunning(props.node_id);
  const n_hidden_child_edges = useSelector(
    (state) => state.caches[props.node_id].n_hidden_child_edges,
  );
  const has_hidden_leaf = 0 < n_hidden_child_edges;

  const dispatch = useDispatch();
  const handle_toggle_show_children = useCallback(() => {
    dispatch(actions.toggle_show_children(props.node_id));
  }, [props.node_id, dispatch]);

  const Component = props.component || "div";
  return (
    <Component
      className={
        utils.join(
          is_running ? "running" : has_hidden_leaf ? "hidden-leafs" : undefined,
        ) || undefined
      }
      onDoubleClick={handle_toggle_show_children}
      onMouseOver={props.onMouseOver}
      onMouseLeave={props.onMouseLeave}
    >
      {props.children}
    </Component>
  );
};

const MobileEntryButtons = (props: { node_id: types.TNodeId }) => {
  const cache = useSelector((state) => state.caches[props.node_id]);

  const status = useSelector((state) => state.data.nodes[props.node_id].status);

  const root = useSelector((state) => state.data.root);
  const is_root = props.node_id === root;

  return React.useMemo(
    () => (
      <div
        className={utils.join(
          !cache.show_detail && "opacity-40 hover:opacity-100",
        )}
      >
        <div className="flex w-fit gap-x-[0.25em] items-baseline pt-[0.25em]">
          {is_root || <EstimationInput node_id={props.node_id} />}
          {is_root || status !== "todo" || (
            <StartOrStopButtons node_id={props.node_id} />
          )}
          {is_root || status !== "todo" || (
            <TodoToDoneButton node_id={props.node_id} />
          )}
          {is_root || status !== "todo" || (
            <TodoToDontButton node_id={props.node_id} />
          )}
          {is_root || status === "todo" || (
            <DoneOrDontToTodoButton node_id={props.node_id} />
          )}
          {status === "todo" && <EvalButton node_id={props.node_id} />}
          {is_root || status !== "todo" || (
            <TopButton node_id={props.node_id} />
          )}
          <DeleteButton node_id={props.node_id} />
          <CopyNodeIdButton node_id={props.node_id} />
          {status === "todo" && <AddButton node_id={props.node_id} />}
          <ShowDetailButton node_id={props.node_id} />
          <TotalTime node_id={props.node_id} />
          {is_root || <LastRange node_id={props.node_id} />}
        </div>
        <div className="flex w-fit gap-x-[0.25em] items-baseline pt-[0.25em]">
          {status === "todo" &&
            0 <= cache.leaf_estimates_sum &&
            digits1(cache.leaf_estimates_sum) + " | "}
          {status === "todo" && cache.percentiles.map(digits1).join(", ")}
        </div>
      </div>
    ),
    [
      cache.percentiles,
      cache.leaf_estimates_sum,
      cache.show_detail,
      status,
      is_root,
      props.node_id,
    ],
  );
};

const EntryButtons = React.memo(
  (props: { node_id: types.TNodeId; prefix?: string }) => {
    const status = useSelector(
      (state) => state.data.nodes[props.node_id].status,
    );

    const root = useSelector((state) => state.data.root);
    const is_root = props.node_id === root;
    const is_todo = status === "todo";

    return (
      <div className="flex w-fit gap-x-[0.25em] items-baseline pt-[0.25em]">
        {is_root || !is_todo || <StartOrStopButtons node_id={props.node_id} />}
        {is_root || !is_todo || <TodoToDoneButton node_id={props.node_id} />}
        {is_root || !is_todo || <TodoToDontButton node_id={props.node_id} />}
        {is_root || is_todo || (
          <DoneOrDontToTodoButton node_id={props.node_id} />
        )}
        {is_todo && <EvalButton node_id={props.node_id} />}
        {is_root || !is_todo || <TopButton node_id={props.node_id} />}
        {is_root || !is_todo || <MoveUpButton node_id={props.node_id} />}
        {is_root || !is_todo || <MoveDownButton node_id={props.node_id} />}
        <DeleteButton node_id={props.node_id} />
        {is_todo && <AddButton node_id={props.node_id} prefix={props.prefix} />}
        <ShowDetailButton node_id={props.node_id} />
      </div>
    );
  },
);

const EntryInfos = React.memo((props: { node_id: types.TNodeId }) => {
  const root = useSelector((state) => state.data.root);
  const is_root = props.node_id === root;

  return (
    <div className="flex w-fit gap-x-[0.25em] items-baseline pt-[0.25em]">
      {is_root || <EstimationInput node_id={props.node_id} />}
      <TotalTime node_id={props.node_id} />
      {is_root || <LastRange node_id={props.node_id} />}
    </div>
  );
});

const TotalTime = (props: { node_id: types.TNodeId }) => {
  const total_time = useSelector(
    (state) => state.caches[props.node_id].total_time,
  );
  const dispatch = useDispatch();
  const observe = total_time_utils.observe_of(dispatch);
  const ref_cb = React.useCallback(
    (el: null | HTMLSpanElement) => {
      if (el === null) {
        return;
      }
      observe(el, props.node_id);
    },
    [observe, props.node_id],
  );

  return (
    <span ref={ref_cb}>
      {total_time < 0 ? "-" : digits1(total_time / (1000 * 3600))}
    </span>
  );
};

const StartOrStopButtons = (props: { node_id: types.TNodeId }) => {
  const ranges = useSelector((state) => state.data.nodes[props.node_id].ranges);
  const last_range = ranges.at(-1);
  const running = last_range && last_range.end === null;

  return running ? (
    <StopButton node_id={props.node_id} ref={stopButtonRefOf(props.node_id)} />
  ) : (
    <>
      <StartButton node_id={props.node_id} />
      <StartConcurrentButton node_id={props.node_id} />
    </>
  );
};

const StartButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const on_click = React.useCallback(() => {
    dispatch(
      actions.start_action({ node_id: props.node_id, is_concurrent: false }),
    );
  }, [props.node_id, dispatch]);
  return (
    <button
      className="btn-icon"
      onClick={on_click}
      onDoubleClick={prevent_propagation}
    >
      {consts.START_MARK}
    </button>
  );
};
const StartConcurrentButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const on_click = React.useCallback(() => {
    dispatch(
      actions.start_action({ node_id: props.node_id, is_concurrent: true }),
    );
  }, [props.node_id, dispatch]);
  return (
    <button
      className="btn-icon"
      onClick={on_click}
      onDoubleClick={prevent_propagation}
    >
      {consts.START_CONCURRNET_MARK}
    </button>
  );
};

const AddButton = (props: {
  node_id: types.TNodeId;
  prefix?: string;
  id?: string;
}) => {
  const dispatch = useDispatch();
  const session = React.useContext(states.session_key_context);
  const show_mobile = Jotai.useAtomValue(
    states.show_mobile_atom_map.get(session),
  );
  const prefix = props.prefix || TREE_PREFIX;
  const handle_click = React.useCallback(() => {
    dispatch(
      actions.add_action({ node_id: props.node_id, show_mobile: show_mobile }),
    );
    dispatch(focusFirstChildTextAreaActionOf(props.node_id, prefix));
  }, [props.node_id, dispatch, show_mobile, prefix]);
  return (
    <button
      className="btn-icon"
      id={props.id}
      onClick={handle_click}
      onDoubleClick={prevent_propagation}
    >
      {consts.ADD_MARK}
    </button>
  );
};

const StopButton = React.forwardRef<
  HTMLButtonElement,
  { node_id: types.TNodeId }
>((props, ref) => {
  const dispatch = useDispatch();
  const on_click = React.useCallback(() => {
    dispatch(actions.stop_action(props.node_id));
  }, [props.node_id, dispatch]);

  return (
    <button
      className="btn-icon"
      arial-label="Stop."
      onClick={on_click}
      ref={ref}
      onDoubleClick={prevent_propagation}
    >
      {consts.STOP_MARK}
    </button>
  );
});

const TopButton = (props: { node_id: types.TNodeId; disabled?: boolean }) => {
  const dispatch = useDispatch();
  const on_click = React.useCallback(() => {
    dispatch(actions.top_action(props.node_id));
  }, [props.node_id, dispatch]);
  return (
    <button
      className="btn-icon"
      onClick={on_click}
      onDoubleClick={prevent_propagation}
      disabled={props.disabled}
    >
      {consts.TOP_MARK}
    </button>
  );
};

const MoveUpButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const on_click = useCallback(() => {
    dispatch(actions.moveUp_(props.node_id));
    doFocusMoveUpButton(props.node_id);
  }, [props.node_id, dispatch]);

  return (
    <button
      className="btn-icon"
      onClick={on_click}
      ref={moveUpButtonRefOf(props.node_id)}
      onDoubleClick={prevent_propagation}
    >
      {consts.MOVE_UP_MARK}
    </button>
  );
};

const MoveDownButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const on_click = useCallback(() => {
    dispatch(actions.moveDown_(props.node_id));
    doFocusMoveDownButton(props.node_id);
  }, [props.node_id, dispatch]);

  return (
    <button
      className="btn-icon"
      onClick={on_click}
      ref={moveDownButtonRefOf(props.node_id)}
      onDoubleClick={prevent_propagation}
    >
      {consts.MOVE_DOWN_MARK}
    </button>
  );
};

const TodoToDoneButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const on_click = useCallback(
    () => dispatch(actions.todoToDone(props.node_id)),
    [props.node_id, dispatch],
  );

  return (
    <button
      className="btn-icon"
      onClick={on_click}
      onDoubleClick={prevent_propagation}
    >
      {consts.DONE_MARK}
    </button>
  );
};

const TodoToDontButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const on_click = useCallback(
    () => dispatch(actions.todoToDont(props.node_id)),
    [props.node_id, dispatch],
  );

  return (
    <button
      className="btn-icon"
      onClick={on_click}
      onDoubleClick={prevent_propagation}
    >
      {consts.DONT_MARK}
    </button>
  );
};

const ShowDetailButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const on_click = useCallback(
    () => dispatch(actions.flipShowDetail(props.node_id)),
    [props.node_id, dispatch],
  );

  return (
    <button
      className="btn-icon"
      onClick={on_click}
      onDoubleClick={prevent_propagation}
    >
      {consts.DETAIL_MARK}
    </button>
  );
};

const DeleteButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const on_click = React.useCallback(() => {
    dispatch(actions.delete_action(props.node_id));
  }, [props.node_id, dispatch]);

  return (
    <button
      className="btn-icon"
      onClick={on_click}
      onDoubleClick={prevent_propagation}
    >
      {consts.DELETE_MARK}
    </button>
  );
};

const EvalButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const on_click = React.useCallback(() => {
    dispatch(actions.eval_(props.node_id));
  }, [props.node_id, dispatch]);

  return (
    <button
      className="btn-icon"
      onClick={on_click}
      onDoubleClick={prevent_propagation}
    >
      {consts.EVAL_MARK}
    </button>
  );
};

const MobilePredictedNextNodes = () => {
  const predicted_next_nodes = useSelector(
    (state) => state.predicted_next_nodes,
  );
  return (
    <>
      {predicted_next_nodes.map((node_id) => (
        <MobilePredictedNextNode node_id={node_id} key={node_id} />
      ))}
    </>
  );
};
const MobilePredictedNextNode = (props: { node_id: types.TNodeId }) => {
  const text = useSelector((state) => state.caches[props.node_id].text);
  const to_tree = useToTree(props.node_id);
  return (
    <div className="flex w-fit gap-x-[0.25em] items-baseline py-[0.125em]">
      <StartButton node_id={props.node_id} />
      <StartConcurrentButton node_id={props.node_id} />
      <span onClick={to_tree} className="cursor-pointer">
        {text.slice(0, 30)}
      </span>
    </div>
  );
};

const PredictedNextNodes = () => {
  const predicted_next_nodes = useSelector(
    (state) => state.predicted_next_nodes,
  );
  return (
    <ol className="list-outside pl-[4em]">
      {predicted_next_nodes.map((node_id) => (
        <li>
          <PredictedNextNode node_id={node_id} key={node_id} />
        </li>
      ))}
    </ol>
  );
};
const PredictedNextNode = React.memo((props: { node_id: types.TNodeId }) => {
  const text = useSelector((state) => state.caches[props.node_id].text);
  const to_tree = useToTree(props.node_id);
  return (
    <div className="flex w-fit gap-x-[0.25em] items-baseline py-[0.125em]">
      <StartButton node_id={props.node_id} />
      <StartConcurrentButton node_id={props.node_id} />
      <CopyNodeIdButton node_id={props.node_id} />
      <span onClick={to_tree} className="cursor-pointer">
        {text.slice(0, 30)}
      </span>
    </div>
  );
});

const CopyNodeIdButton = (props: { node_id: types.TNodeId }) => {
  const { copy, is_copied } = utils.useClipboard();
  const setNodeIds = Jotai.useSetAtom(states.nodeIdsState);
  const handle_click = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const multi = e.ctrlKey || e.metaKey;
      setNodeIds((node_ids: string) => {
        const res = multi ? props.node_id + " " + node_ids : props.node_id;
        copy(res);
        return res;
      });
    },
    [props.node_id, setNodeIds, copy],
  );
  return (
    <button
      className="btn-icon"
      onClick={handle_click}
      onDoubleClick={prevent_propagation}
    >
      {is_copied ? consts.DONE_MARK : consts.COPY_MARK}
    </button>
  );
};

const TextArea = ({
  node_id,
  className,
  ...textarea_props
}: { node_id: types.TNodeId } & React.HTMLProps<HTMLTextAreaElement>) => {
  const root = useSelector((state) => state.data.root);
  return node_id === root ? null : (
    <TextAreaImpl node_id={node_id} {...textarea_props} className={className} />
  );
};

const TextAreaImpl = ({
  node_id,
  className,
  ...textarea_props
}: { node_id: types.TNodeId } & Omit<
  React.HTMLProps<HTMLTextAreaElement>,
  "ref"
>) => {
  const state_text = useSelector((state) => state.caches[node_id].text);
  const status = useSelector((state) => state.data.nodes[node_id].status);
  const dispatch = useDispatch();
  const onBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      const _onBlur = textarea_props.onBlur;
      if (_onBlur !== undefined) {
        _onBlur(e);
      }

      // Set text.
      const el = e.target;
      dispatch(
        actions.set_text_action({
          k: node_id,
          text: el.value,
        }),
      );
    },
    [dispatch, node_id, textarea_props.onBlur],
  );
  return (
    <AutoHeightTextArea
      {...textarea_props}
      text={state_text}
      onBlur={onBlur}
      onDoubleClick={prevent_propagation}
      className={utils.join(
        "whitespace-pre-wrap overflow-wrap-anywhere overflow-hidden  bg-white dark:bg-neutral-800 px-[0.75em] py-[0.5em]",
        className,
        status === "done"
          ? "text-red-600 dark:text-red-400"
          : status === "dont"
          ? "text-neutral-500"
          : undefined,
      )}
    />
  );
};

const NLeftButton = () => {
  const dispatch = useDispatch();
  const n_unsaved_patches = useSelector((state) => state.n_unsaved_patches);
  const handle_click = React.useCallback(() => {
    dispatch((disptch, getState) => {
      const state = getState();
      utils.downloadJson("evidence_based_scheduling.json", state.data);
    });
  }, [dispatch]);
  return (
    <button
      className="btn-icon"
      onClick={handle_click}
      onDoubleClick={prevent_propagation}
    >
      {n_unsaved_patches}
    </button>
  );
};

const CopyDescendantTimeNodesPlannedNodeIdsButton = (props: {
  time_node_id: types.TTimeNodeId;
}) => {
  const { copy, is_copied } = utils.useClipboard();
  const setNodeIds = Jotai.useSetAtom(states.nodeIdsState);
  const dispatch = useDispatch();
  const handle_click = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const multi = e.ctrlKey || e.metaKey;
      const descend = !e.shiftKey;
      dispatch(
        copy_descendant_time_nodes_planned_node_ids_action(
          props.time_node_id,
          multi,
          descend,
          setNodeIds,
          copy,
        ),
      );
    },
    [props.time_node_id, setNodeIds, copy, dispatch],
  );
  return (
    <button
      className="btn-icon"
      onClick={handle_click}
      onDoubleClick={prevent_propagation}
    >
      {is_copied ? consts.DONE_MARK : consts.COPY_MARK}
    </button>
  );
};

const doFocusMoveUpButton = (node_id: types.TNodeId) => {
  setTimeout(() => utils.focus(moveUpButtonRefOf(node_id).current), 100);
};

const doFocusMoveDownButton = (node_id: types.TNodeId) => {
  setTimeout(() => utils.focus(moveDownButtonRefOf(node_id).current), 100);
};

const doFocusTextArea = (id: string) => {
  setTimeout(() => utils.focus(document.getElementById(id)), 100);
};

const stopButtonRefOf = utils.memoize1((_: types.TNodeId) =>
  React.createRef<HTMLButtonElement>(),
);

const moveUpButtonRefOf = utils.memoize1((_: types.TNodeId) =>
  React.createRef<HTMLButtonElement>(),
);

const moveDownButtonRefOf = utils.memoize1((_: types.TNodeId) =>
  React.createRef<HTMLButtonElement>(),
);

const LastRange = (props: { node_id: types.TNodeId }) => {
  const ranges = useSelector((state) => state.data.nodes[props.node_id].ranges);
  const last_range = last_range_of(ranges);
  return (
    <>
      {last_range &&
        last_range.end &&
        digits2((last_range.end - last_range.start) / (1000 * 3600))}
    </>
  );
};

const focusFirstChildTextAreaActionOf =
  (node_id: types.TNodeId, prefix: string) =>
  (dispatch: types.AppDispatch, getState: () => types.IState) => {
    const state = getState();
    doFocusTextArea(
      `${prefix}${
        state.data.edges[
          ops.sorted_keys_of(state.data.nodes[node_id].children)[0]
        ].c
      }`,
    );
  };

const useToTree = (node_id: types.TNodeId) => {
  const dispatch = useDispatch();
  return React.useCallback(() => {
    dispatch(actions.show_path_to_selected_node(node_id));
    setTimeout(() => utils.focus(document.getElementById(`t-${node_id}`)), 100);
  }, [node_id, dispatch]);
};

const useToQueue = (node_id: types.TNodeId) => {
  return React.useCallback(() => {
    utils.focus(document.getElementById(utils.queue_textarea_id_of(node_id)));
  }, [node_id]);
};

const useOn = (delayMsec: number = DEFAULT_DELAY_MSEC) => {
  const [isOn, setHover] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  const clearDelay = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const turnOn = useCallback(() => {
    clearDelay();
    setHover(true);
  }, [clearDelay]);

  const turnOff = useCallback(() => {
    clearDelay();
    if (0 < delayMsec) {
      timeoutRef.current = window.setTimeout(() => {
        setHover(false);
      }, delayMsec);
    } else {
      setHover(false);
    }
  }, [clearDelay, delayMsec]);

  React.useEffect(() => {
    return clearDelay;
  }, [clearDelay]);

  return React.useMemo(() => {
    return {
      isOn,
      turnOn,
      turnOff,
    };
  }, [isOn, turnOn, turnOff]);
};

const _should_hide_of = (
  node_filter_query: string,
  text: string,
  node_id: types.TNodeId,
) => {
  const node_filter_query_lower = node_filter_query.toLowerCase();
  const text_lower = text.toLowerCase();
  let is_match_filter_node_query = true;
  for (const q of node_filter_query_lower.split(" ")) {
    if (node_id !== q && !text_lower.includes(q)) {
      is_match_filter_node_query = false;
      break;
    }
  }
  return !is_match_filter_node_query;
};

const node_ids_list_of_node_ids_string = (node_ids: string) => {
  const seen = new Set<types.TNodeId>();
  for (const node_id of node_ids.split(" ")) {
    if (node_id && types.is_TNodeId(node_id) && !seen.has(node_id)) {
      seen.add(node_id);
    }
  }
  return Array.from(seen);
};

const digits2 = (x: number) => {
  return Math.round(x * 100) / 100;
};

const digits1 = (x: number) => {
  return Math.round(x * 10) / 10;
};

const last_range_of = (ranges: types.TRange[]): null | types.TRange => {
  const n = ranges.length;
  if (n < 1) {
    return null;
  } else {
    const last = ranges[n - 1];
    if (last.end === null) {
      if (n - 2 < 0) {
        return null;
      } else {
        return ranges[n - 2];
      }
    } else {
      return last;
    }
  }
};

const time_node_id_repr_of = (
  time_node_id: types.TTimeNodeId,
  year_begin: number,
) => {
  if (time_node_id[0] === "e") {
    // dEcade
    const i_count = parseInt(time_node_id.slice(1));
    if (isNaN(i_count)) {
      throw new Error(`Invalid format: ${time_node_id}`);
    }
    const y0 = year_begin + 10 * i_count;
    return (
      <>
        <b>{"E "}</b>
        {`${y0}/P10Y`}
      </>
    );
  } else if (time_node_id[0] === "y") {
    return (
      <>
        <b>{"Y "}</b>
        {time_node_id.slice(1)}
      </>
    );
  } else if (time_node_id[0] === "q") {
    return (
      <>
        <b>{"Q "}</b>
        {time_node_id.slice(1)}
      </>
    );
  } else if (time_node_id[0] === "m") {
    return (
      <>
        <b>{"M "}</b>
        {time_node_id.slice(1)}
      </>
    );
  } else if (time_node_id[0] === "w") {
    const w = parseInt(time_node_id.slice(1));
    if (isNaN(w)) {
      throw new Error(`Invalid format: ${time_node_id}`);
    }
    const t0 = new Date(Number(WEEK_0_BEGIN) + WEEK_MSEC * w);
    const y0 = t0.getUTCFullYear();
    const m0 = (t0.getUTCMonth() + 1).toString().padStart(2, "0");
    const d0 = t0.getUTCDate().toString().padStart(2, "0");
    return (
      <>
        <b>{"W "}</b>
        {`${y0}-${m0}-${d0}/P7D`}
      </>
    );
  } else if (time_node_id[0] === "d") {
    return <>{time_node_id.slice(-8)}</>;
  } else if (time_node_id[0] === "h") {
    return <>{time_node_id.slice(-2)}</>;
  } else {
    throw new Error(`Unsupported time_node_id: ${time_node_id}`);
  }
};

const child_time_node_ids_of = (
  time_node_id: types.TTimeNodeId,
  year_begin: number,
) => {
  const child_time_node_ids: string[] = child_time_node_ids_of_impl(
    time_node_id,
    year_begin,
  );
  return child_time_node_ids as types.TTimeNodeId[];
};
const child_time_node_ids_of_impl = (
  time_node_id: types.TTimeNodeId,
  year_begin: number,
) => {
  if (time_node_id[0] === "e") {
    // dEcade
    const decade_count = parseInt(time_node_id.slice(1));
    if (isNaN(decade_count)) {
      throw new Error(`Invalid format: ${time_node_id}`);
    }
    const offset = year_begin + 10 * decade_count;
    const res = [];
    for (let dy = 0; dy < 10; ++dy) {
      res.push(`y${offset + dy}`);
    }
    return res;
  } else if (time_node_id[0] === "y") {
    const y = time_node_id.slice(1);
    return [`q${y}-Q1`, `q${y}-Q2`, `q${y}-Q3`, `q${y}-Q4`];
  } else if (time_node_id[0] === "q") {
    const y = time_node_id.slice(1, 5);
    const q = time_node_id.at(-1);
    if (q === "1") {
      return [`m${y}-01`, `m${y}-02`, `m${y}-03`];
    } else if (q === "2") {
      return [`m${y}-04`, `m${y}-05`, `m${y}-06`];
    } else if (q === "3") {
      return [`m${y}-07`, `m${y}-08`, `m${y}-09`];
    } else if (q === "4") {
      return [`m${y}-10`, `m${y}-11`, `m${y}-12`];
    } else {
      throw new Error(`Invalid format: ${time_node_id}`);
    }
  } else if (time_node_id[0] === "m") {
    const y = parseInt(time_node_id.slice(1, 5));
    if (isNaN(y)) {
      throw new Error(`Invalid format: ${time_node_id}`);
    }
    const m = parseInt(time_node_id.slice(6, 8));
    if (isNaN(m)) {
      throw new Error(`Invalid format: ${time_node_id}`);
    }
    const w0 = Math.floor(
      (Date.UTC(y, m - 1, 1) - Number(WEEK_0_BEGIN)) / WEEK_MSEC,
    );
    const w1 = Math.floor(
      (Date.UTC(y, m - 1 + 1, 0) - Number(WEEK_0_BEGIN)) / WEEK_MSEC,
    );
    const res = [];
    for (let w = w0; w < w1 + 1; ++w) {
      res.push(`w${w}`);
    }
    return res;
  } else if (time_node_id[0] === "w") {
    const w = parseInt(time_node_id.slice(1));
    if (isNaN(w)) {
      throw new Error(`Invalid format: ${time_node_id}`);
    }
    const t0 = new Date(Number(WEEK_0_BEGIN) + WEEK_MSEC * w);
    const y0 = t0.getUTCFullYear();
    const m0 = t0.getUTCMonth();
    const d0 = t0.getUTCDate();
    const res = [];
    for (let i = 0; i < 7; ++i) {
      const t = new Date(Date.UTC(y0, m0, d0 + i));
      res.push(
        `d${t.getUTCFullYear()}-${(t.getUTCMonth() + 1)
          .toString()
          .padStart(2, "0")}-${t.getUTCDate().toString().padStart(2, "0")}`,
      );
    }
    return res;
  } else if (time_node_id[0] === "d") {
    const d = time_node_id.slice(1);
    const res = [];
    for (let h = 0; h < 24; ++h) {
      res.push(`h${d}T${h.toString().padStart(2, "0")}`);
    }
    return res;
  } else if (time_node_id[0] === "h") {
    return [];
  } else {
    throw new Error(`Unsupported time_node_id: ${time_node_id}`);
  }
};

const copy_descendant_time_nodes_planned_node_ids_action = (
  time_node_id: types.TTimeNodeId,
  multi: boolean,
  descend: boolean,
  set_node_ids: (payload: (node_ids: string) => string) => void,
  copy: (text: string) => void,
) => {
  return (dispatch: types.AppDispatch, getState: () => types.IState) => {
    const state = getState();
    const descendant_node_ids = collect_descendant_time_nodes_planned_node_ids(
      [],
      time_node_id,
      descend,
      state,
    ).join(" ");
    set_node_ids((node_ids: string) => {
      const res = multi
        ? descendant_node_ids + " " + node_ids
        : descendant_node_ids;
      copy(res);
      return res;
    });
  };
};

const collect_descendant_time_nodes_planned_node_ids = (
  res: types.TNodeId[],
  time_node_id: types.TTimeNodeId,
  descend: boolean,
  state: types.IState,
) => {
  const time_node = state.data.timeline.time_nodes[time_node_id];
  if (time_node !== undefined) {
    for (const node of ops.keys_of(time_node.nodes)) {
      if (state.data.nodes[node].status === "todo") {
        res.push(node);
      }
    }
  }
  if (!descend) {
    return res;
  }
  for (const child_time_node_id of child_time_node_ids_of(
    time_node_id,
    state.data.timeline.year_begin,
  )) {
    collect_descendant_time_nodes_planned_node_ids(
      res,
      child_time_node_id,
      descend,
      state,
    );
  }
  return res;
};

const move_cursor_to_the_end = (e: React.FocusEvent<HTMLInputElement>) => {
  const el = e.target;
  el.select();
};

const get_toggle = utils.memoize1(
  (set: (fn: typeof _toggle) => void) => () => set(_toggle),
);
const _toggle = (x: boolean) => !x;

const _suppress_missing_onChange_handler_warning = () => {};
