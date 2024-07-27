import * as Jotai from "jotai";
import * as React from "react";
import * as Rr from "react-redux";
import * as Dnd from "react-dnd";
import * as Mt from "@mantine/core";
import * as Rv from "react-virtuoso";

import { AddButton } from "./AddButton";
import AutoHeightTextArea from "src/AutoHeightTextArea";
import Calendar from "./Calendar";
import CopyNodeIdButton from "./CopyNodeIdButton";
import { DoneOrDontToTodoButton } from "./DoneOrDontToTodoButton";
import { EntryButtons } from "./EntryButtons";
import { EntryInfos } from "./EntryInfos";
import { EntryWrapper } from "./EntryWrapper";
import { EstimationInput } from "./EstimationInput";
import { EvalButton } from "./EvalButton";
import GanttChart from "./GanttChart";
import { LastRange } from "./LastRange";
import { QueueEntry } from "./QueueEntry";
import MenuButton from "./Header/MenuButton";
import {
  ShowDetailsButton,
  component as drawerComponent,
} from "./ShowDetailsButton";
import ShowGanttToggle from "./ShowGanttToggle";
import StartButton from "./StartButton";
import StartConcurrentButton from "./StartConcurrentButton";
import { StartOrStopButtons } from "./StartOrStopButtons";
import StopButton from "./StopButton";
import { TextArea } from "./TextArea";
import { TodoToDoneButton } from "./TodoToDoneButton";
import { TodoToDontButton } from "./TodoToDontButton";
import ToggleButton from "./ToggleButton";
import TopButton from "./TopButton";
import { TotalTime } from "./TotalTime";
import * as types from "./types";
import { useSelector, useDispatch } from "./types";

import * as actions from "./actions";
import * as consts from "./consts";
import * as hooks from "./hooks";
import * as states from "./states";
import * as utils from "./utils";
import { prevent_propagation } from "./utils";
import * as ops from "./ops";
import * as undoable from "./undoable";

const SCROLL_BACK_TO_TOP_MARK = (
  <span className="material-icons">vertical_align_top</span>
);

const SCROLL_BACK_TO_BOTTOM_MARK = (
  <span className="material-icons">vertical_align_bottom</span>
);

const nonTodoQueueNodesRef = React.createRef<Rv.VirtuosoHandle>();
const todoQueueNodesRef = React.createRef<Rv.VirtuosoHandle>();

export const MobileApp = (props: {
  ctx: states.PersistentStateManager;
  logOut: () => void;
}) => {
  return (
    <div className="flex flex-col h-screen w-screen">
      <MobileMenu ctx={props.ctx} logOut={props.logOut} />
      <MobileBody />
      {drawerComponent}
    </div>
  );
};

export const DesktopApp = (props: {
  ctx: states.PersistentStateManager;
  logOut: () => void;
}) => {
  return (
    <div className="flex flex-col h-screen w-screen">
      <Menu ctx={props.ctx} logOut={props.logOut} />
      <Body />
      {drawerComponent}
    </div>
  );
};

const MobileNodeFilterQueryInput = () => {
  const [nodeFilterQuery, setNodeFilterQuery] = Jotai.useAtom(
    states.nodeFilterQueryState,
  );
  const handle_change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setNodeFilterQuery(v);
  };
  const clear_input = () => {
    const v = consts.EMPTY_STRING;
    setNodeFilterQuery(v);
  };
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
  const handle_change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setNodeFilterQuery(v);
  };
  const clear_input = () => {
    const v = consts.EMPTY_STRING;
    setNodeFilterQuery(v);
  };
  const ref = useMetaK();
  const queue = useQueue(true, nodeFilterQuery);
  const node_id = queue[0] || null;
  const taskShortcutKeys = hooks.useTaskShortcutKeys(
    node_id,
    consts.TREE_PREFIX,
  );
  const toTree = utils.useToTree(node_id);
  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (taskShortcutKeys(event)) {
      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        event.preventDefault();
        void toTree();
      }
    }
  };

  return (
    <>
      {consts.SEARCH_MARK}
      <div className="flex items-center border border-solid border-neutral-400">
        <input
          value={nodeFilterQuery}
          onChange={handle_change}
          onKeyDown={onKeyDown}
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

const RunningNodes = () => {
  const queues = hooks.useQueues();
  const queue = queues.todoQueue;
  const ranges = useSelector((state) => state.swapped_nodes.ranges);
  const nodeIds = queue.filter((nodeId) => {
    return ranges?.[nodeId].at(-1)?.end === null;
  });
  return <QueueNodes node_ids={nodeIds} />;
};

function memo1_3<A, B, C, R>(
  fn: (a: A, b: B, c: C) => R,
): (a: A, b: B, c: C) => R {
  let a: A | undefined;
  let b: B | undefined;
  let c: C | undefined;
  let r: R | undefined;
  return (a_, b_, c_) => {
    if (a === a_ && b === b_ && c === c_) {
      if (r === undefined) {
        throw new Error("Must not happen: r is undefined");
      }
      return r;
    }
    a = a_;
    b = b_;
    c = c_;
    r = fn(a_, b_, c_);
    return r;
  };
}

const getQueueNodeIds = (
  queue: types.TNodeId[],
  texts: types.TState["swapped_caches"]["text"],
  nodeFilterQuery: string,
) => {
  if (nodeFilterQuery.length === 0) {
    return queue;
  }
  const processedQuery = nodeFilterQuery.toLowerCase().split(" ");
  if (processedQuery.length === 0) {
    return queue;
  }
  const head = [];
  const tail = [];
  for (const nodeId of queue) {
    const text = utils.assertV(texts?.[nodeId]);
    if (getIsMatch(processedQuery, text, nodeId)) {
      head.push(nodeId);
    } else {
      tail.push(nodeId);
    }
  }
  if (head.length === 0) {
    return queue;
  }
  head.sort((a, b) => {
    const aText = utils.assertV(texts?.[a]);
    const bText = utils.assertV(texts?.[b]);
    return aText.length - bText.length;
  });
  return head.concat(tail);
};

const getTodoQueueNodeIds = memo1_3(getQueueNodeIds);
const getNonTodoQueueNodeIds = memo1_3(getQueueNodeIds);
const getTodoQueueNodeIdsSortByCtime = memo1_3(getQueueNodeIds);
const getNonTodoQueueNodeIdsSortByCtime = memo1_3(getQueueNodeIds);

const useQueue = (isTodo: boolean, nodeFilterQuery: string) => {
  const queues = hooks.useQueues();
  const session = React.useContext(states.session_key_context);
  const sortByCtime = Jotai.useAtomValue(states.sortByCtimeMap.get(session));
  const texts = useSelector((state) => state.swapped_caches.text);
  return sortByCtime
    ? isTodo
      ? getTodoQueueNodeIdsSortByCtime(
          queues.todoQueueCtime,
          texts,
          nodeFilterQuery,
        )
      : getNonTodoQueueNodeIdsSortByCtime(
          queues.nonTodoQueueCtime,
          texts,
          nodeFilterQuery,
        )
    : isTodo
      ? getTodoQueueNodeIds(queues.todoQueue, texts, nodeFilterQuery)
      : getNonTodoQueueNodeIds(queues.nonTodoQueue, texts, nodeFilterQuery);
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
  const handle_change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setNodeIds(v);
  };
  const clear_input = () => {
    const v = consts.EMPTY_STRING;
    setNodeIds(v);
  };
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

const SBTTB = (props: { onClick: () => void }) => {
  return (
    <button
      onClick={props.onClick}
      className="sticky top-[60%] left-[50%] -translate-x-1/2 -translate-y-1/2 px-[0.15rem] dark:bg-neutral-300 bg-neutral-600 dark:hover:bg-neutral-400 hover:bg-neutral-500 text-center min-w-[3rem] h-[3rem] text-[2rem] border-none shadow-none opacity-70 hover:opacity-100 float-left mt-[-3rem] z-40"
    >
      {SCROLL_BACK_TO_TOP_MARK}
    </button>
  );
};

const SBTBB = (props: { onClick: () => void }) => {
  return (
    <button
      onClick={props.onClick}
      className="sticky top-[calc(60%+4rem)] left-[50%] -translate-x-1/2 -translate-y-1/2 px-[0.15rem] dark:bg-neutral-300 bg-neutral-600 dark:hover:bg-neutral-400 hover:bg-neutral-500 text-center min-w-[3rem] h-[3rem] text-[2rem] border-none shadow-none opacity-70 hover:opacity-100 float-left mt-[-3rem] z-40"
    >
      {SCROLL_BACK_TO_BOTTOM_MARK}
    </button>
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
  const handleClick = () => {
    set_show_mobile((v) => !v);
    setShowMobileUpdatedAt(Date.now());
  };
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
  const stop_all = () => dispatch(actions.stop_all_action());
  const session = React.useContext(states.session_key_context);
  const [sortByCtime, setSortByCtime] = Jotai.useAtom(
    states.sortByCtimeMap.get(session),
  );
  const [show_todo_only, set_show_todo_only] = Jotai.useAtom(
    states.show_todo_only_atom_map.get(session),
  );
  const [show_strong_edge_only, set_show_strong_edge_only] = Jotai.useAtom(
    states.show_strong_edge_only_atom_map.get(session),
  );
  const _undo = () => {
    dispatch({ type: undoable.UNDO_TYPE });
  };
  const _redo = () => {
    dispatch({ type: undoable.REDO_TYPE });
  };
  const _smallestToTop = () => {
    dispatch(actions.smallestToTop());
  };
  const _closestToTop = () => {
    dispatch(actions.closestToTop());
  };
  const move_important_node_to_top = () => {
    dispatch(actions.move_important_node_to_top_action());
  };
  const check_remote_head = async () => {
    try {
      await props.ctx.check_remote_head();
    } catch {
      /* empty */
    }
  };
  const [pin, setPin] = Jotai.useAtom(states.pinQueueAtomMap.get(session));
  return (
    <div
      className={`flex items-center overflow-x-auto h-[3rem] gap-x-[0.25em] w-full top-0`}
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
        aria-label="Undo."
        onClick={_undo}
        onDoubleClick={prevent_propagation}
      >
        {consts.UNDO_MARK}
      </button>
      <button
        className="btn-icon"
        aria-label="Redo."
        onClick={_redo}
        onDoubleClick={prevent_propagation}
      >
        <span className="material-icons">redo</span>
      </button>
      <Mt.Switch
        checked={sortByCtime}
        onChange={get_toggle(setSortByCtime)}
        label="Ctime"
      />
      <Mt.Switch
        checked={show_todo_only}
        onChange={get_toggle(set_show_todo_only)}
        label="To Do"
      />
      <Mt.Switch
        checked={show_strong_edge_only}
        onChange={get_toggle(set_show_strong_edge_only)}
        label="Strong"
      />
      <button
        className="btn-icon flex-none"
        onClick={_smallestToTop}
        onDoubleClick={prevent_propagation}
      >
        Small
      </button>
      <button
        className="btn-icon flex-none"
        onClick={_closestToTop}
        onDoubleClick={prevent_propagation}
      >
        Due
      </button>
      <button
        className="btn-icon flex-none"
        onClick={move_important_node_to_top}
        onDoubleClick={prevent_propagation}
      >
        Important
      </button>
      <NodeFilterQueryInput />
      <NodeIdsInput />
      <ToggleButton
        value={pin}
        setValue={setPin}
        titleOnFalse="Pin"
        titleOnTrue="Unpin"
      />
      <ShowGanttToggle />
      <span className="grow" />
    </div>
  );
};

const Body = () => {
  const root = useSelector((state) => {
    return state.data.root;
  });
  const session = React.useContext(states.session_key_context);
  const pin = Jotai.useAtomValue(states.pinQueueAtomMap.get(session));
  const handleNonTodoQueueSBTTBClick = () => {
    nonTodoQueueNodesRef.current?.scrollTo({ top: 0 });
  };
  const handleTodoQueueSBTTBClick = () => {
    todoQueueNodesRef.current?.scrollTo({ top: 0 });
  };
  const handleTodoQueueSBTBBClick = () => {
    todoQueueNodesRef.current?.scrollTo({ top: Number.MAX_SAFE_INTEGER });
  };
  const treeNodesRef = React.useRef<HTMLDivElement>(null);
  const handleTreeSBTTBClick = () => {
    treeNodesRef.current?.scrollTo({ top: 0 });
  };
  return (
    <div className="flex flex-1 gap-x-[1em] overflow-y-hidden">
      <div className="overflow-y-auto flex-none w-[52em] pl-[2em]">
        <SBTTB onClick={handleTodoQueueSBTTBClick} />
        <SBTBB onClick={handleTodoQueueSBTBBClick} />
        <TodoQueueNodes virtuosoRef={todoQueueNodesRef} />
      </div>
      <div className={utils.join("flex", pin && "w-full overflow-x-auto")}>
        <div className="overflow-y-auto flex-none w-[46em] pl-[2em]">
          <SBTTB onClick={handleNonTodoQueueSBTTBClick} />
          <NonTodoQueueNodes virtuosoRef={nonTodoQueueNodesRef} />
        </div>
        <div
          className="content-visibility-auto overflow-y-auto flex-none"
          ref={treeNodesRef}
        >
          <SBTTB onClick={handleTreeSBTTBClick} />
          <TreeNode node_id={root} />
        </div>
        <div className="content-visibility-auto overflow-y-auto flex-none">
          <Calendar />
        </div>
        <GanttChart indexColumnWidth={320} />
        <div className={`content-visibility-auto overflow-y-auto flex-none`}>
          <Timeline />
        </div>
        <PinnedSubTrees />
        <CoveyQuadrants />
      </div>
    </div>
  );
};

const CoveyQuadrants = () => {
  return (
    <>
      <div className="content-visibility-auto w-[16em] flex-none">
        <CoveyQuadrant quadrant_id="important_urgent" />
        <CoveyQuadrant quadrant_id="not_important_urgent" />
      </div>
      <div className="content-visibility-auto w-[16em] flex-none">
        <CoveyQuadrant quadrant_id="important_not_urgent" />
        <CoveyQuadrant quadrant_id="not_important_not_urgent" />
      </div>
    </>
  );
};

const PinnedSubTrees = () => {
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
};

const CoveyQuadrant = (props: {
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
  const assign_nodes = () => {
    const node_ids = utils.node_ids_list_of_node_ids_string(selectedNodeIds);
    if (node_ids.length < 1) {
      return;
    }
    const payload = {
      quadrant_id: props.quadrant_id,
      node_ids,
    };
    dispatch(actions.assign_nodes_to_covey_quadrant_action(payload));
  };
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
};

const CoveyQuadrantNode = (props: {
  node_id: types.TNodeId;
  quadrant_id:
    | "important_urgent"
    | "important_not_urgent"
    | "not_important_urgent"
    | "not_important_not_urgent";
}) => {
  const text = utils.assertV(
    useSelector((state) => state.swapped_caches.text?.[props.node_id]),
  );
  const status = utils.assertV(
    useSelector((state) => state.swapped_nodes.status?.[props.node_id]),
  );
  const dispatch = useDispatch();
  const { isOn, turnOn, turnOff } = utils.useOn();
  const is_running = utils.useIsRunning(props.node_id);
  const unassign_node = () => {
    dispatch(
      actions.unassign_nodes_of_covey_quadrant_action({
        quadrant_id: props.quadrant_id,
        node_ids: [props.node_id],
      }),
    );
  };
  const to_tree = utils.useToTree(props.node_id);
  return status === "todo" ? (
    <div
      className={utils.join(
        "p-[0.0625em] inline-block",
        is_running ? "running" : undefined,
      )}
      onMouseOver={turnOn}
      onFocus={turnOn}
      onMouseLeave={turnOff}
    >
      <span
        onClick={to_tree}
        className="w-[15em] block whitespace-nowrap overflow-hidden cursor-pointer"
        role="button"
        tabIndex={0}
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
};

const Timeline = () => {
  const dispatch = useDispatch();
  const count = useSelector((state) => state.data.timeline.count);
  const increment_count = () => dispatch(actions.increment_count_action());
  const decade_nodes = () => {
    const res = [];
    for (let i_count = 0; i_count < count; ++i_count) {
      const time_node_id = `e${i_count}`;
      if (types.tTimeNodeId(time_node_id)) {
        res.push(<TimeNode time_node_id={time_node_id} key={time_node_id} />);
      }
    }
    return res;
  };
  return (
    <>
      {decade_nodes}
      <button className="btn-icon" onClick={increment_count}>
        {consts.ADD_MARK}
      </button>
    </>
  );
};

const getTimeNodeIdEl = (
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
    const t0 = new Date(Number(consts.WEEK_0_BEGIN) + consts.WEEK_MSEC * w);
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

const TimeNode = (props: { time_node_id: types.TTimeNodeId }) => {
  const time_node = useSelector(
    (state) => state.data.timeline.time_nodes[props.time_node_id],
  );

  const year_begin = useSelector((state) => state.data.timeline.year_begin);
  const child_time_node_ids = utils.child_time_node_ids_of(
    props.time_node_id,
    year_begin,
  );
  const id = `tl-${props.time_node_id}`;
  const id_el = (
    <a href={`#${id}`} id={id}>
      {getTimeNodeIdEl(props.time_node_id, year_begin)}
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
};

const TimeNodeEntry = (props: { time_node_id: types.TTimeNodeId }) => {
  const dispatch = useDispatch();
  const time_node = useSelector(
    (state) => state.data.timeline.time_nodes[props.time_node_id],
  );
  const selectedNodeIds = Jotai.useAtomValue(states.nodeIdsState);
  const text = time_node?.text ? time_node.text : consts.EMPTY_STRING;
  const { isOn, turnOn, turnOff } = utils.useOn(0);

  const toggle_show_children = () => {
    const payload = props.time_node_id;
    dispatch(actions.toggle_show_time_node_children_action(payload));
  };
  const assign_nodes = () => {
    const node_ids = utils.node_ids_list_of_node_ids_string(selectedNodeIds);
    if (node_ids.length < 1) {
      return;
    }
    const payload = {
      time_node_id: props.time_node_id,
      node_ids,
    };
    dispatch(actions.assign_nodes_to_time_node_action(payload));
  };
  const dispatch_set_text_action = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const el = e.target;
    dispatch(
      actions.set_time_node_text_action({
        time_node_id: props.time_node_id,
        text: el.value,
      }),
    );
  };

  return (
    <td onMouseLeave={turnOff}>
      <AutoHeightTextArea
        text={text}
        className="textarea whitespace-pre-wrap overflow-wrap-anywhere w-[17em] overflow-hidden bg-white dark:bg-neutral-800 px-[0.75em] py-[0.5em]"
        onBlur={dispatch_set_text_action}
        onClick={turnOn}
        onDoubleClick={prevent_propagation}
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
};

const PlannedNode = (props: {
  node_id: types.TNodeId;
  time_node_id: types.TTimeNodeId;
  Component: "div" | "td";
}) => {
  const text = utils.assertV(
    useSelector((state) => state.swapped_caches.text?.[props.node_id]),
  );
  const status = utils.assertV(
    useSelector((state) => state.swapped_nodes.status?.[props.node_id]),
  );
  const dispatch = useDispatch();
  const { isOn, turnOn, turnOff } = utils.useOn();
  const is_running = utils.useIsRunning(props.node_id);
  const unassign_node = () => {
    dispatch(
      actions.unassign_nodes_of_time_node_action({
        time_node_id: props.time_node_id,
        node_ids: [props.node_id],
      }),
    );
  };
  const to_tree = utils.useToTree(props.node_id);
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
        role="button"
        tabIndex={0}
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

type TNodeIdsWithPrefix = ["special/header", ...types.TNodeId[]];

const TodoQueueNodes = (props: {
  virtuosoRef: React.RefObject<Rv.VirtuosoHandle>;
}) => {
  const nodeFilterQuery = React.useDeferredValue(
    Jotai.useAtomValue(states.nodeFilterQueryState),
  );
  const queue = useQueue(true, nodeFilterQuery);
  const queueWithPrefix = ["special/header"].concat(
    queue,
  ) as unknown as TNodeIdsWithPrefix;
  return (
    <VirtualizedQueueNodes
      node_ids={queueWithPrefix}
      virtuosoRef={props.virtuosoRef}
    />
  );
};

const QueueNodes = (props: { node_ids: types.TNodeId[] }) => {
  return (
    <div>
      {props.node_ids.map((node_id, index) => (
        <QueueEntry node_id={node_id} index={index} key={node_id} />
      ))}
    </div>
  );
};

const VirtualizedQueueNodes = (props: {
  node_ids: types.TNodeId[] | TNodeIdsWithPrefix;
  virtuosoRef: React.Ref<Rv.VirtuosoHandle>;
}) => {
  return (
    <Rv.Virtuoso
      style={{ height: "100%" }}
      data={props.node_ids}
      computeItemKey={queueComputeItemKey}
      itemContent={queueItemContent}
      ref={props.virtuosoRef}
    />
  );
};

function queueItemContent(index: number, item: TNodeIdsWithPrefix[number]) {
  switch (item) {
    case "special/header": {
      return (
        <div className="min-h-[1px]">
          <PredictedNextNodes />
          <RunningNodes />
          <hr />
        </div>
      );
    }
    default: {
      return <QueueEntry index={index} node_id={item} />;
    }
  }
}

function queueComputeItemKey(_: number, item: TNodeIdsWithPrefix[number]) {
  return item;
}

const DndTreeNode = (props: { node_id: types.TNodeId }) => {
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
  const ref = (el: HTMLDivElement | null) => {
    drag(drop(el));
  };
  return (
    <div
      ref={ref}
      className={utils.join(
        "content-visibility-auto overflow-y-auto flex-none relative",
        isDragging ? "opacity-50" : "opacity-100",
      )}
    >
      <TreeNode node_id={props.node_id} prefix="p-" />
      {canDrop && (
        <div className="absolute top-0 left-0 h-full w-full z-10 opacity-50 bg-yellow-200 dark:bg-yellow-900" />
      )}
    </div>
  );
};

const TreeNode = (props: {
  node_id: types.TNodeId;
  prefix?: undefined | string;
}) => {
  return (
    <>
      <TreeEntry node_id={props.node_id} prefix={props.prefix} />
      <EdgeList node_id={props.node_id} prefix={props.prefix} />
    </>
  );
};

const NonTodoQueueNodes = (props: {
  virtuosoRef: React.Ref<Rv.VirtuosoHandle>;
}) => {
  const nodeFilterQuery = React.useDeferredValue(
    Jotai.useAtomValue(states.nodeFilterQueryState),
  );
  const node_ids = useQueue(false, nodeFilterQuery);
  return (
    <VirtualizedQueueNodes
      node_ids={node_ids}
      virtuosoRef={props.virtuosoRef}
    />
  );
};

const EdgeList = (props: {
  node_id: types.TNodeId;
  prefix?: undefined | string;
}) => {
  const children = utils.assertV(
    useSelector((state) => state.swapped_nodes.children?.[props.node_id]),
  );
  const statuses = utils.assertV(
    useSelector((state) => state.swapped_nodes.status),
  );
  const cs = utils.assertV(useSelector((state) => state.swapped_edges.c ?? {}));
  const todos = Array<JSX.Element>();
  const dones = Array<JSX.Element>();
  const donts = Array<JSX.Element>();
  for (const edgeId of ops.sorted_keys_of(children)) {
    const c = cs[edgeId];
    const status = statuses[c];
    if (status === "todo") {
      todos.push(<Edge edge_id={edgeId} key={edgeId} prefix={props.prefix} />);
    } else if (status === "done") {
      dones.push(<Edge edge_id={edgeId} key={edgeId} prefix={props.prefix} />);
    } else if (status === "dont") {
      donts.push(<Edge edge_id={edgeId} key={edgeId} prefix={props.prefix} />);
    }
  }
  const edge_ids = ops.sorted_keys_of(children);
  return edge_ids.length ? (
    <ol className="list-outside pl-[4em] content-visibility-auto">
      {todos.concat(dones, donts)}
    </ol>
  ) : null;
};

const Edge = (props: {
  edge_id: types.TEdgeId;
  prefix?: undefined | string;
}) => {
  const session = React.useContext(states.session_key_context);
  const show_todo_only = Jotai.useAtomValue(
    states.show_todo_only_atom_map.get(session),
  );
  const show_strong_edge_only = Jotai.useAtomValue(
    states.show_strong_edge_only_atom_map.get(session),
  );
  const edgeHide = useSelector(
    (state) => state.swapped_edges.hide?.[props.edge_id],
  );
  const edgeT = utils.assertV(
    useSelector((state) => state.swapped_edges.t?.[props.edge_id]),
  );
  const edgeC = utils.assertV(
    useSelector((state) => state.swapped_edges.c?.[props.edge_id]),
  );
  const childNodeStatus = utils.assertV(
    useSelector((state) => state.swapped_nodes.status?.[edgeC]),
  );
  if (
    edgeHide ||
    (show_strong_edge_only && edgeT === "weak") ||
    (show_todo_only && childNodeStatus !== "todo")
  ) {
    return null;
  }
  return (
    <li>
      <TreeNode node_id={edgeC} prefix={props.prefix} />
    </li>
  );
};

const MobileMenu = (props: {
  ctx: states.PersistentStateManager;
  logOut: () => void;
}) => {
  const root = useSelector((state) => state.data.root);
  const dispatch = useDispatch();
  const stop_all = () => dispatch(actions.stop_all_action());
  const session = React.useContext(states.session_key_context);
  const [show_todo_only, set_show_todo_only] = Jotai.useAtom(
    states.show_todo_only_atom_map.get(session),
  );
  const _undo = () => {
    dispatch({ type: undoable.UNDO_TYPE });
  };
  const _redo = () => {
    dispatch({ type: undoable.REDO_TYPE });
  };
  const check_remote_head = async () => {
    try {
      await props.ctx.check_remote_head();
    } catch {
      /* empty */
    }
  };
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
        aria-label="Undo."
        onClick={_undo}
        onDoubleClick={prevent_propagation}
      >
        {consts.UNDO_MARK}
      </button>
      <button
        className="btn-icon"
        aria-label="Redo."
        onClick={_redo}
        onDoubleClick={prevent_propagation}
      >
        <span className="material-icons">redo</span>
      </button>
      <Mt.Switch
        checked={show_todo_only}
        onChange={get_toggle(set_show_todo_only)}
        label="To Do"
      />
      <MobileNodeFilterQueryInput />
      <span className="grow" />
    </div>
  );
};

const MobileBody = () => {
  return (
    <div className="flex flex-1 gap-x-[1em] overflow-y-hidden">
      <div className={`overflow-y-auto flex-none`}>
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
  const statuses = utils.assertV(
    useSelector((state) => state.swapped_nodes.status),
  );
  const texts = utils.assertV(
    useSelector((state) => state.swapped_caches.text),
  );
  const session = React.useContext(states.session_key_context);
  const show_todo_only = Jotai.useAtomValue(
    states.show_todo_only_atom_map.get(session),
  );
  const nodeFilterQuery = React.useDeferredValue(
    Jotai.useAtomValue(states.nodeFilterQueryState),
  );
  const processedQuery = nodeFilterQuery.toLowerCase().split(" ");

  const node_ids = ops
    .sorted_keys_of(queue)
    .filter((node_id) => {
      return (
        !(show_todo_only && statuses[node_id] !== "todo") &&
        getIsMatch(processedQuery, texts[node_id], node_id)
      );
    })
    .slice(0, 100);

  return <MobileQueueNodesImpl node_ids={node_ids} />;
};

const MobileQueueNodesImpl = (props: { node_ids: types.TNodeId[] }) => {
  return (
    <>
      {props.node_ids.map((nodeId) => (
        <MobileQueueNode nodeId={nodeId} key={nodeId} />
      ))}
    </>
  );
};
const MobileQueueNode = (props: { nodeId: types.TNodeId }) => {
  return (
    <EntryWrapper node_id={props.nodeId}>
      <TextArea
        node_id={props.nodeId}
        className="w-[100vw] px-[0.75em] py-[0.5em]"
      />
      <MobileEntryButtons node_id={props.nodeId} />
    </EntryWrapper>
  );
};

const TreeEntry = (props: {
  node_id: types.TNodeId;
  prefix?: undefined | string;
}) => {
  const leaf_estimates_sum = utils.assertV(
    useSelector(
      (state) => state.swapped_caches.leaf_estimates_sum?.[props.node_id],
    ),
  );
  const percentiles = utils.assertV(
    useSelector((state) => state.swapped_caches.percentiles?.[props.node_id]),
  );
  const status = utils.assertV(
    useSelector((state) => state.swapped_nodes.status?.[props.node_id]),
  );

  const to_queue = useToQueue(props.node_id);
  const root = useSelector((state) => state.data.root);
  const is_root = props.node_id === root;
  const prefix = props.prefix || consts.TREE_PREFIX;
  const handleKeyDown = hooks.useTaskShortcutKeys(props.node_id, prefix);

  return (
    <EntryWrapper node_id={props.node_id}>
      <div className="flex items-end w-fit content-visibility-auto">
        {is_root ? null : <button onClick={to_queue}>→</button>}
        <CopyNodeIdButton node_id={props.node_id} />
        {is_root ? null : (
          <TextArea
            node_id={props.node_id}
            id={`${prefix}${props.node_id}`}
            className={utils.join(
              "w-[29em] px-[0.75em] py-[0.5em]",
              status === "done"
                ? "text-red-600 dark:text-red-400"
                : status === "dont"
                  ? "text-neutral-500"
                  : null,
            )}
            onKeyDown={handleKeyDown}
          />
        )}
        <EntryInfos node_id={props.node_id} />
      </div>
      {status === "todo" &&
        0 <= leaf_estimates_sum &&
        utils.digits1(leaf_estimates_sum) + " | "}
      {status === "todo" && percentiles.map(utils.digits1).join(", ")}
      {is_root ? null : (
        <EntryButtons node_id={props.node_id} prefix={prefix} />
      )}
    </EntryWrapper>
  );
};

const MobileEntryButtons = (props: { node_id: types.TNodeId }) => {
  const leaf_estimates_sum = utils.assertV(
    useSelector(
      (state) => state.swapped_caches.leaf_estimates_sum?.[props.node_id],
    ),
  );
  const percentiles = utils.assertV(
    useSelector((state) => state.swapped_caches.percentiles?.[props.node_id]),
  );
  const status = utils.assertV(
    useSelector((state) => state.swapped_nodes.status?.[props.node_id]),
  );
  const root = useSelector((state) => state.data.root);
  const is_root = props.node_id === root;

  return (
    <div>
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
        {is_root || status !== "todo" || <TopButton node_id={props.node_id} />}
        {/* <DeleteButton node_id={props.node_id} /> */}
        <CopyNodeIdButton node_id={props.node_id} />
        {status === "todo" && <AddButton node_id={props.node_id} />}
        <ShowDetailsButton node_id={props.node_id} />
        <TotalTime node_id={props.node_id} />
        {is_root || <LastRange node_id={props.node_id} />}
      </div>
      <div className="flex w-fit gap-x-[0.25em] items-baseline pt-[0.25em]">
        {status === "todo" &&
          0 <= leaf_estimates_sum &&
          utils.digits1(leaf_estimates_sum) + " | "}
        {status === "todo" && percentiles.map(utils.digits1).join(", ")}
      </div>
    </div>
  );
};

// const DeleteButton = (props: { node_id: types.TNodeId }) => {
//   const dispatch = useDispatch();
//   const on_click = React.useCallback(() => {
//     dispatch(actions.delete_action(props.node_id));
//   }, [props.node_id, dispatch]);

//   return (
//     <button
//       className="btn-icon"
//       onClick={on_click}
//       onDoubleClick={prevent_propagation}
//     >
//       {consts.DELETE_MARK}
//     </button>
//   );
// };

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
  const text = utils.assertV(
    useSelector((state) => state.swapped_caches.text?.[props.node_id]),
  );
  const to_tree = utils.useToTree(props.node_id);
  return (
    <div className="flex w-fit gap-x-[0.25em] items-baseline py-[0.125em]">
      <StartButton node_id={props.node_id} />
      <StartConcurrentButton node_id={props.node_id} />
      <span
        onClick={to_tree}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
      >
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
        <li key={node_id}>
          <PredictedNextNode node_id={node_id} />
        </li>
      ))}
    </ol>
  );
};
const PredictedNextNode = (props: { node_id: types.TNodeId }) => {
  const text = utils.assertV(
    useSelector((state) => state.swapped_caches.text?.[props.node_id]),
  );
  const to_tree = utils.useToTree(props.node_id);
  return (
    <div className="flex w-fit gap-x-[0.25em] items-baseline py-[0.125em]">
      <StartButton node_id={props.node_id} />
      <StartConcurrentButton node_id={props.node_id} />
      <CopyNodeIdButton node_id={props.node_id} />
      <span
        onClick={to_tree}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
      >
        {text.slice(0, 30)}
      </span>
    </div>
  );
};

const CopyDescendantTimeNodesPlannedNodeIdsButton = (props: {
  time_node_id: types.TTimeNodeId;
}) => {
  const { copy, is_copied } = utils.useClipboard();
  const setNodeIds = Jotai.useSetAtom(states.nodeIdsState);
  const dispatch = useDispatch();
  const handle_click = (e: React.MouseEvent<HTMLButtonElement>) => {
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
  };
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

const useToQueue = (nodeId: types.TNodeId) => {
  const store = Rr.useStore<types.TState>();
  const session = React.useContext(states.session_key_context);
  const sortByCtime = Jotai.useAtomValue(states.sortByCtimeMap.get(session));
  return () => {
    const state = store.getState();
    const queues = utils.getQueues(
      state.data.queue,
      state.swapped_nodes.status,
      state.swapped_nodes.start_time,
    );
    const isTodo = state.data.nodes[nodeId].status === "todo";
    const queue = sortByCtime
      ? isTodo
        ? queues.todoQueueCtime
        : queues.nonTodoQueueCtime
      : isTodo
        ? queues.todoQueue
        : queues.nonTodoQueue;
    const index = queue.indexOf(nodeId);
    if (index === -1) {
      return;
    }
    const ref = isTodo ? todoQueueNodesRef : nonTodoQueueNodesRef;
    const offset = isTodo ? 1 : 0;
    ref.current?.scrollToIndex(index + offset);
  };
};

const getIsMatch = (
  processedQuery: readonly string[],
  text: string,
  nodeId: types.TNodeId,
) => {
  const textLower = text.toLowerCase();
  for (const q of processedQuery) {
    if (nodeId !== q && !textLower.includes(q)) {
      return false;
    }
  }
  return true;
};

const copy_descendant_time_nodes_planned_node_ids_action = (
  time_node_id: types.TTimeNodeId,
  multi: boolean,
  descend: boolean,
  set_node_ids: (payload: (node_ids: string) => string) => void,
  copy: (text: string) => void,
) => {
  return (dispatch: types.AppDispatch, getState: () => types.TState) => {
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
  state: types.TState,
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
  for (const child_time_node_id of utils.child_time_node_ids_of(
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

const get_toggle = utils.memoize1(
  (set: (fn: typeof _toggle) => void) => () => set(_toggle),
);
const _toggle = (x: boolean) => !x;
