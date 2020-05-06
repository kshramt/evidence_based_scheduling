import React from "react";
import ReactDOM from "react-dom";
import { connect, Provider } from "react-redux";
import { Action, Store, createStore, Dispatch } from "redux";
import produce, { Draft, setAutoFreeze } from "immer";

import "./index.css";

setAutoFreeze(false); // Refs in the cache should not be frozen.

const API_VERSION = "v1";
const NO_ESTIMATION = 0;
const STOP_MARK = "■";
const NEW_MARK = "+";
const START_MARK = "▶";
const TOP_MARK = "⬆";
const MOVE_UP_MARK = "↑";
const MOVE_DOWN_MARK = "↓";
const UNDO_MARK = "⬅";
const REDO_MARK = "➡";
const UNINDENT_MARK = "↖︎";
const INDENT_MARK = "↘︎︎";
const EVAL_MARK = "⏳";
const DELETE_MARK = "×";
const DONE_MARK = "✓";
const DONT_MARK = "🗑";
const DETAIL_MARK = "⋮";

type TStatus = "done" | "dont" | "todo";

interface IListProps {
  ks: string[];
}

interface INodeProps {
  k: string;
  todo: string[];
  done: string[];
  dont: string[];
  showTodoOnly: boolean;
}

interface IEntryProps {
  k: string;
  v: IEntry;
  running: boolean;
  cache: ICache;
}

interface IQueueNodeProps {
  k: string;
  v: IEntry;
  running: boolean;
  cache: ICache;
  shouldHide: boolean;
}

interface IHistory {
  prev: null | IHistory;
  value: IState;
  next: null | IHistory;
}

interface IState {
  data: IData;
  caches: ICaches;

  saveSuccess: boolean;
}

interface IAppProps {
  data: IData;
}

interface IMenuProps {
  saveSuccess: boolean;
}

interface INodeOwnProps {
  k: string;
}

interface IEntryOwnProps {
  k: string;
}

interface IQueueColumnProps {
  queue: string[];
}

interface IData {
  current_entry: null | string;
  root: string;
  kvs: IKvs;
  queue: string[];
  showTodoOnly: boolean;
}

interface IKvs {
  [k: string]: IEntry;
}

interface IEntry {
  done: string[];
  dont: string[];
  end_time: null | string;
  estimate: number;
  parent: null | string;
  ranges: IRange[];
  show_detail: boolean;
  start_time: string;
  status: TStatus;
  style: IStyle;
  text: string;
  todo: string[];
}

interface IStyle {
  height: string;
  width: string;
}

interface IRange {
  start: number;
  end: null | number;
}

interface ICaches {
  [k: string]: ICache;
}

interface ICache {
  total_time_spent: number;
  percentiles: number[];
  newButton: JSX.Element;
  setLastRange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setText: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  resizeTextArea: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
  textAreaOf: (
    text: string,
    status: TStatus,
    style: IStyle,
    ref: null | React.RefObject<HTMLTextAreaElement>,
  ) => JSX.Element;
}

interface IEvalAction extends Action {
  type: "eval_";
  k: string;
}
interface IDeleteActin extends Action {
  type: "delete_";
  k: string;
}
interface INewAction extends Action {
  type: "new_";
  parent: string;
}
interface ISaveAction extends Action {
  type: "save";
}
interface IUndoAction extends Action {
  type: "undo";
}
interface IRedoActin extends Action {
  type: "redo";
}
interface IFlipShowTodoOnlyAction extends Action {
  type: "flipShowTodoOnly";
}
interface IFlipShowDetailAction extends Action {
  type: "flipShowDetail";
  k: string;
}
interface IStartAction extends Action {
  type: "start";
  k: string;
}
interface IFocusStopButtonAction extends Action {
  type: "focusStopButton";
  k: string;
}
interface ITopAction extends Action {
  type: "top";
  k: string;
}
interface ISmallestToTopAction extends Action {
  type: "smallestToTop";
}
interface IClosestToTopAction extends Action {
  type: "closestToTop";
}
interface IStopAction extends Action {
  type: "stop";
}
interface IMoveUpAction extends Action {
  type: "moveUp";
  k: string;
}
interface IFocusMoveUpButtonAction extends Action {
  type: "focusMoveUpButton";
  k: string;
}
interface IMoveDownAction extends Action {
  type: "moveDown";
  k: string;
}
interface IFocusMoveDownButtonAction extends Action {
  type: "focusMoveDownButton";
  k: string;
}
interface IUnindentAction extends Action {
  type: "unindent";
  k: string;
}
interface IFocusUnindentButtonAction extends Action {
  type: "focusUnindentButton";
  k: string;
}
interface IIndentAction extends Action {
  type: "indent";
  k: string;
}
interface IFocusIndentButtonAction extends Action {
  type: "focusIndentButton";
  k: string;
}
interface ISetEstimateAction extends Action {
  type: "setEstimate";
  k: string;
  estimate: number;
}
interface ISetLastRangeAction extends Action {
  type: "setLastRange";
  k: string;
  t: number;
}
interface ISetTextAction extends Action {
  type: "setText";
  k: string;
  text: string;
}
interface IResizeTextAreaAction extends Action {
  type: "resizeTextArea";
  k: string;
  width: null | string;
  height: null | string;
}
interface ITodoToDoneAction extends Action {
  type: "todoToDone";
  k: string;
}
interface ITodoToDontAction extends Action {
  type: "todoToDont";
  k: string;
}
interface IDoneToTodoAction extends Action {
  type: "doneToTodo";
  k: string;
}
interface IDontToTodoAction extends Action {
  type: "dontToTodo";
  k: string;
}
interface IFocusTextAreaAction extends Action {
  type: "focusTextArea";
  k: string;
}

type TActions =
  | IEvalAction
  | IDeleteActin
  | INewAction
  | ISaveAction
  | IUndoAction
  | IRedoActin
  | IFlipShowTodoOnlyAction
  | IFlipShowDetailAction
  | IStartAction
  | IFocusStopButtonAction
  | ITopAction
  | ISmallestToTopAction
  | IClosestToTopAction
  | IStopAction
  | IMoveUpAction
  | IFocusMoveUpButtonAction
  | IMoveDownAction
  | IFocusMoveDownButtonAction
  | IUnindentAction
  | IFocusUnindentButtonAction
  | IIndentAction
  | IFocusIndentButtonAction
  | ISetEstimateAction
  | ISetLastRangeAction
  | ISetTextAction
  | IResizeTextAreaAction
  | ITodoToDoneAction
  | ITodoToDontAction
  | IDoneToTodoAction
  | IDontToTodoAction
  | IFocusTextAreaAction;

class App extends React.Component<IAppProps, IState> {
  menuButtons: JSX.Element;
  my_state: {
    dirtyHistory: boolean;
    dirtyDump: boolean;
    history: IHistory;
  };
  store: Store<IState, TActions>;

  constructor(props: IAppProps) {
    super(props);
    const caches = {} as ICaches;
    for (const k of Object.keys(props.data.kvs)) {
      this.setCache(caches, k, props.data.kvs);
    }
    const state = {
      data: props.data,
      caches,
      saveSuccess: true,
    };
    this.my_state = {
      dirtyHistory: false,
      dirtyDump: false,
      history: {
        prev: null,
        value: state,
        next: null,
      },
    };
    this.store = createStore(root_reducer_of(state, this), state);

    this.menuButtons = (
      <div>
        <StopButton k={state.data.root} />
        {state.caches[state.data.root].newButton}
        <button
          onClick={() => {
            this.store.dispatch({ type: "save" });
            this.store.dispatch({ type: "undo" });
            this.store.dispatch({ type: "save" });
          }}
        >
          {UNDO_MARK}
        </button>
        <button
          onClick={() => {
            this.store.dispatch({ type: "save" });
            this.store.dispatch({ type: "redo" });
            this.store.dispatch({ type: "save" });
          }}
        >
          {REDO_MARK}
        </button>
        <button
          onClick={() => {
            this.store.dispatch({ type: "flipShowTodoOnly" });
            this.store.dispatch({ type: "save" });
          }}
        >
          👀
        </button>
        <button
          onClick={() => {
            this.store.dispatch({ type: "smallestToTop" });
            this.store.dispatch({ type: "save" });
          }}
        >
          Small
        </button>
        <button
          onClick={() => {
            this.store.dispatch({ type: "closestToTop" });
            this.store.dispatch({ type: "save" });
          }}
        >
          Due
        </button>
      </div>
    );
  }
  setCache = (caches: ICaches, k: string, kvs: IKvs) => {
    if (caches[k] === undefined) {
      const sumChildren = (xs: string[]) => {
        return xs.reduce((total, current) => {
          this.setCache(caches, current, kvs);
          return total + caches[current].total_time_spent;
        }, 0);
      };
      const resizeTextArea = (e: React.MouseEvent<HTMLTextAreaElement>) => {
        this.resizeTextArea(
          k,
          e.currentTarget.style.width,
          e.currentTarget.style.height,
        );
      };
      const setText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        this.setText(k, e.currentTarget.value);
      };
      caches[k] = {
        total_time_spent: kvs[k].ranges.reduce((total, current) => {
          return current.end === null
            ? total
            : total + (current.end - current.start);
        }, sumChildren(kvs[k].todo) + sumChildren(kvs[k].done) + sumChildren(kvs[k].dont)),
        percentiles: [] as number[], // 0, 10, 33, 50, 67, 90, 100
        newButton: (
          <button
            onClick={() => {
              this.new_(k);
            }}
          >
            {NEW_MARK}
          </button>
        ),
        setLastRange: (e: React.ChangeEvent<HTMLInputElement>) => {
          this.setLastRange(k, Number(e.currentTarget.value));
        },
        setText,
        resizeTextArea,
        textAreaOf: (
          text: string,
          status: TStatus,
          style: IStyle,
          ref: null | React.RefObject<HTMLTextAreaElement>,
        ) => {
          return (
            <textarea
              value={text}
              onChange={setText}
              onBlur={this.save}
              onMouseUp={resizeTextArea}
              className={status}
              style={style}
              ref={ref}
            />
          );
        },
      };
    }
  };
  new_ = (parent: string) => {
    this.store.dispatch({ type: "new_", parent });
    this.store.dispatch({ type: "save" });
    this.store.dispatch({
      type: "focusTextArea",
      k: this.store.getState().data.kvs[parent].todo[0],
    });
  };
  $new_ = (state: IState, parent: string) => {};
  save = () => {
    this.store.dispatch({ type: "save" });
  };
  setLastRange = (k: string, t: number) => {
    this.store.dispatch({ type: "setLastRange", k, t });
    this.store.dispatch({ type: "save" });
  };
  setText = (k: string, text: string) => {
    this.store.dispatch({ type: "setText", k, text });
  };
  resizeTextArea = (k: string, width: null | string, height: null | string) => {
    this.store.dispatch({ type: "resizeTextArea", k, width, height });
    this.store.dispatch({ type: "save" });
  };
  render = () => {
    const Menu = connect((state: IState) => {
      return { saveSuccess: state.saveSuccess };
    })((props: IMenuProps) => {
      return (
        <div className={"menu"}>
          {props.saveSuccess ? null : <p>Failed to save.</p>}
          {this.menuButtons}
        </div>
      );
    });
    return (
      <Provider store={this.store}>
        <div id="columns">
          <Menu />
          <QueueColumn />
          <div id="tree">
            <Node k={this.store.getState().data.root} />
          </div>
        </div>
      </Provider>
    );
  };
}

const _eval_ = (draft: Draft<IState>, k: string) => {
  const candidates = Object.values(draft.data.kvs).filter(v => {
    return (
      (v.status === "done" || v.status === "dont") &&
      v.estimate !== NO_ESTIMATION
    );
  });
  const ratios = candidates.length
    ? candidates.map(v => {
        return draft.caches[v.start_time].total_time_spent / 3600 / v.estimate;
      })
    : [1];
  const now = Number(new Date()) / 1000;
  const weights = candidates.length
    ? candidates.map(v => {
        // 1/e per year
        return Math.exp(
          -(now - Date.parse(v.end_time as string) / 1000) / (86400 * 365.25),
        );
      })
    : [1];
  const leaf_estimates = Array.from(leafs(draft.data.kvs[k], draft.data.kvs))
    .filter(v => {
      return v.estimate !== NO_ESTIMATION;
    })
    .map(v => {
      return v.estimate;
    });
  const n_mc = 2000;
  const ts = _estimate(leaf_estimates, ratios, weights, n_mc);
  draft.caches[k].percentiles = [
    ts[0],
    ts[Math.round(n_mc / 10)],
    ts[Math.round(n_mc / 3)],
    ts[Math.round(n_mc / 2)],
    ts[Math.round((n_mc * 2) / 3)],
    ts[Math.round((n_mc * 9) / 10)],
    ts[n_mc - 1],
  ];
};

const _rmTodoEntry = (draft: Draft<IState>, k: string) => {
  const pk = draft.data.kvs[k].parent;
  if (pk) {
    deleteAtVal(draft.data.kvs[pk].todo, k);
    _addDt(draft, pk, -draft.caches[k].total_time_spent);
  }
};

const _addTodoEntry = (
  draft: Draft<IState>,
  pk: string,
  i: number,
  k: string,
) => {
  if (pk) {
    draft.data.kvs[k].parent = pk;
    draft.data.kvs[pk].todo.splice(i, 0, k);
    _addDt(draft, pk, draft.caches[k].total_time_spent);
  }
};

const _top = (draft: Draft<IState>, k: string) => {
  _topTree(draft, k);
  _topQueue(draft, k);
};

const _topTree = (draft: Draft<IState>, k: string) => {
  let ck = k;
  let pk = draft.data.kvs[ck].parent;
  while (pk !== null) {
    toFront(draft.data.kvs[pk].todo, ck);
    ck = pk;
    pk = draft.data.kvs[ck].parent;
  }
};

const _addDt = (draft: Draft<IState>, k: null | string, dt: number) => {
  while (k) {
    draft.caches[k].total_time_spent += dt;
    k = draft.data.kvs[k].parent;
  }
};

const _topQueue = (draft: Draft<IState>, k: string) => {
  toFront(draft.data.queue, k);
};

const _doneToTodo = (draft: Draft<IState>, k: string) => {
  _rmFromDone(draft, k);
  _addToTodo(draft, k);
  const pk = draft.data.kvs[k].parent;
  if (pk != null) {
    switch (draft.data.kvs[pk].status) {
      case "done":
        _doneToTodo(draft, pk);
        break;
      case "dont":
        _dontToTodo(draft, pk);
        break;
    }
  }
};

const _dontToTodo = (draft: Draft<IState>, k: string) => {
  _rmFromDont(draft, k);
  _addToTodo(draft, k);
  const pk = draft.data.kvs[k].parent;
  if (pk != null) {
    switch (draft.data.kvs[pk].status) {
      case "done":
        _doneToTodo(draft, pk);
        break;
      case "dont":
        _dontToTodo(draft, pk);
        break;
    }
  }
};

const _rmFromDone = (draft: Draft<IState>, k: string) => {
  const pk = draft.data.kvs[k].parent;
  if (pk) {
    deleteAtVal(draft.data.kvs[pk].done, k);
  }
};

const _rmFromDont = (draft: Draft<IState>, k: string) => {
  const pk = draft.data.kvs[k].parent;
  if (pk) {
    deleteAtVal(draft.data.kvs[pk].dont, k);
  }
};

const _addToTodo = (draft: Draft<IState>, k: string) => {
  draft.data.kvs[k].status = "todo";
  const pk = draft.data.kvs[k].parent;
  if (pk) {
    draft.data.kvs[pk].todo.unshift(k);
  }
};

const _addToDone = (draft: Draft<IState>, k: string) => {
  draft.data.kvs[k].status = "done";
  draft.data.kvs[k].end_time = new Date().toISOString();
  const pk = draft.data.kvs[k].parent;
  if (pk) {
    draft.data.kvs[pk].done.unshift(k);
  }
};

const _addToDont = (draft: Draft<IState>, k: string) => {
  draft.data.kvs[k].status = "dont";
  draft.data.kvs[k].end_time = new Date().toISOString();
  const pk = draft.data.kvs[k].parent;
  if (pk) {
    draft.data.kvs[pk].dont.unshift(k);
  }
};

const QueueColumn = connect((state: IState) => {
  return { queue: state.data.queue };
})((props: IQueueColumnProps) => {
  return (
    <div id="queue">
      {props.queue.length ? (
        <ol>
          {props.queue.map(k => {
            return <QueueNode k={k} key={k} />;
          })}
        </ol>
      ) : null}
    </div>
  );
});

const List = React.memo((props: IListProps) => {
  return props.ks.length ? (
    <ol>
      {props.ks.map(k => {
        return (
          <li key={k}>
            <Node k={k} />
          </li>
        );
      })}
    </ol>
  ) : null;
});

const Node = connect((state: IState, ownProps: INodeOwnProps) => {
  const k = ownProps.k;
  const v = state.data.kvs[k];
  return {
    k,
    todo: v.todo,
    done: v.done,
    dont: v.dont,
    showTodoOnly: state.data.showTodoOnly,
  };
})((props: INodeProps) => {
  return (
    <React.Fragment>
      <Entry k={props.k} />
      <List ks={props.todo} />
      {props.showTodoOnly ? null : <List ks={props.done} />}
      {props.showTodoOnly ? null : <List ks={props.dont} />}
    </React.Fragment>
  );
});

const QueueNode = connect((state: IState, ownProps: IEntryOwnProps) => {
  const k = ownProps.k;
  const v = state.data.kvs[k];
  return {
    k,
    v,
    cache: state.caches[k],
    running: k === state.data.current_entry,
    shouldHide: state.data.showTodoOnly && v.status !== "todo",
  };
})((props: IQueueNodeProps) => {
  const v = props.v;
  const cache = props.cache;
  return props.shouldHide ? null : (
    <li key={props.k}>
      <div
        id={`queue${props.k}`}
        className={props.running ? `${v.status} running` : v.status}
      >
        {v.parent ? toTreeButtonOf(props.k) : null}
        <DoneToTodoButton k={props.k} />
        <DontToTodoButton k={props.k} />
        {v.parent !== null && v.status === "todo" ? cache.newButton : null}
        {v.parent === null
          ? null
          : cache.textAreaOf(v.text, v.status, v.style, null)}
        {v.parent === null ? null : props.running ? (
          <StopButton k={props.k} />
        ) : (
          <StartButton k={props.k} />
        )}
        <EstimationInput k={props.k} />
        {digits1(cache.total_time_spent / 3600)}
        <TopButton k={props.k} />
        <EvalButton k={props.k} />
        <TodoToDoneButton k={props.k} />
        <TodoToDontButton k={props.k} />
        <ShowDetailButton k={props.k} />
        <MoveUpButton k={props.k} />
        <MoveDownButton k={props.k} />
        {v.status === "todo" ? cache.percentiles.map(digits1).join(" ") : null}
        {v.parent && v.show_detail
          ? showLastRange(lastRange(v.ranges), cache.setLastRange)
          : null}
        <DeleteButton k={props.k} />
      </div>
    </li>
  );
});

const Entry = connect((state: IState, ownProps: IEntryOwnProps) => {
  const k = ownProps.k;
  return {
    k,
    v: state.data.kvs[k],
    cache: state.caches[k],
    running: k === state.data.current_entry,
  };
})((props: IEntryProps) => {
  const v = props.v;
  const cache = props.cache;
  return (
    <div
      id={`tree${props.k}`}
      className={props.running ? `${v.status} running` : v.status}
    >
      <DoneToTodoButton k={props.k} />
      <DontToTodoButton k={props.k} />
      {v.parent !== null && v.status === "todo" ? cache.newButton : null}
      {v.parent === null
        ? null
        : cache.textAreaOf(v.text, v.status, v.style, textAreaRefOf(props.k))}
      {v.parent === null ? null : props.running ? (
        <StopButton k={props.k} />
      ) : (
        <StartButton k={props.k} />
      )}
      <EstimationInput k={props.k} />
      {digits1(cache.total_time_spent / 3600)}
      <TopButton k={props.k} />
      <EvalButton k={props.k} />
      <TodoToDoneButton k={props.k} />
      <TodoToDontButton k={props.k} />
      <ShowDetailButton k={props.k} />
      <MoveUpButton k={props.k} />
      <MoveDownButton k={props.k} />
      <UnindentButton k={props.k} />
      <IndentButton k={props.k} />
      {v.status === "todo" ? cache.percentiles.map(digits1).join(" ") : null}
      {v.parent && v.show_detail
        ? showLastRange(lastRange(v.ranges), cache.setLastRange)
        : null}
      <DeleteButton k={props.k} />
    </div>
  );
});

const _estimate = (
  estimates: number[],
  ratios: number[],
  weights: number[],
  n_mc: number,
) => {
  const ts = [];
  const rng = multinomial(ratios, weights);
  for (let i = 0; i < n_mc; i++) {
    ts.push(
      sum(
        estimates.map(x => {
          return rng.next().value * x;
        }),
      ),
    );
  }
  ts.sort((a, b) => a - b);
  return ts;
};

const showLastRange = (
  l: null | IRange,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
) => {
  return l === null || l.end === null ? null : (
    <input
      type="number"
      step="any"
      value={(l.end - l.start) / 3600}
      onChange={onChange}
    />
  );
};

const lastRange = (ranges: IRange[]): null | IRange => {
  return ranges.length
    ? last(ranges).end === null
      ? lastRange(butLast(ranges))
      : last(ranges)
    : null;
};

const butLast = <T extends {}>(xs: T[]): T[] => {
  return xs.length ? xs.slice(0, -1) : xs;
};

const focus = <T extends HTMLElement>(r: null | T) => {
  if (r) {
    r.focus();
  }
};

const last = <T extends {}>(a: T[]) => {
  return a[a.length - 1];
};

const digits2 = (x: number) => {
  return Math.round(x * 100) / 100;
};

const digits1 = (x: number) => {
  return Math.round(x * 10) / 10;
};

const toFront = <T extends {}>(a: T[], x: T) => {
  const i = a.indexOf(x);
  if (i !== -1) {
    a.splice(i, 1);
    a.unshift(x);
  }
  return a;
};
const moveUp = <T extends {}>(a: T[], x: T) => {
  const i = a.indexOf(x);
  if (i > 0) {
    [a[i - 1], a[i]] = [a[i], a[i - 1]];
  }
  return a;
};

const moveDown = <T extends {}>(a: T[], x: T) => {
  const i = a.indexOf(x);
  if (-1 < i && i < a.length - 1) {
    [a[i], a[i + 1]] = [a[i + 1], a[i]];
  }
  return a;
};

const toRear = <T extends {}>(a: T[], x: T) => {
  const i = a.indexOf(x);
  if (i !== -1) {
    a.splice(i, 1);
    a.push(x);
  }
  return a;
};

const deleteAtVal = <T extends {}>(a: T[], x: T) => {
  const i = a.indexOf(x);
  if (i !== -1) {
    a.splice(i, 1);
  }
};

export const cumsum = (xs: number[]) => {
  const ret = [0];
  xs.reduce((total, current, i) => {
    const t = total + current;
    ret.push(t);
    return t;
  }, 0);
  return ret;
};

export const sum = (xs: number[]) => {
  return xs.reduce((total, current) => {
    return total + current;
  }, 0);
};

function* leafs(v: IEntry, kvs: IKvs): Iterable<IEntry> {
  if (v.status === "todo") {
    if (v.todo.length) {
      for (const c of v.todo) {
        yield* leafs(kvs[c], kvs);
      }
    } else {
      yield v;
    }
  }
}

export function* multinomial<T>(xs: T[], ws: number[]) {
  const total = sum(ws);
  const partitions = cumsum(ws.map(w => w / total)).map(v => {
    return Math.min(v, 1);
  });
  partitions[partitions.length - 1] = 1;
  while (true) {
    const r = Math.random();
    if (r === 0) {
      yield xs[0];
    } else {
      // todo: Use binary search.
      for (const i of ws.keys()) {
        if (partitions[i] < r && r <= partitions[i + 1]) {
          yield xs[i];
          break;
        }
      }
    }
  }
  // todo: For the stricter generators introduced in TypeScript version 3.6.
  assert(false, "Must not happen.");
  return 0;
}

const pushHistory = (h: IHistory, v: IState) => {
  return (h.next = {
    prev: h,
    value: v,
    next: null,
  });
};

const isApprox = (x: number, y: number) => {
  const atol = 1e-7;
  const rtol = 1e-4;
  return (
    Math.abs(y - x) <= Math.max(atol, rtol * Math.max(Math.abs(x), Math.abs(y)))
  );
};

const assertIsApprox = (actual: number, expected: number) => {
  assert(isApprox(actual, expected), actual + " ≉ " + expected);
};

const assert = (v: boolean, msg: string) => {
  if (!v) {
    throw new Error(msg);
  }
};

const newEntryValue = (parent: string, start_time: string) => {
  return {
    done: [] as string[],
    dont: [] as string[],
    end_time: null,
    estimate: NO_ESTIMATION,
    parent,
    ranges: [] as IRange[],
    show_detail: false,
    start_time,
    status: "todo" as TStatus,
    style: { width: "49ex", height: "3ex" },
    text: "",
    todo: [] as string[],
  };
};

const root_reducer_of = (state_: IState, app: App) => {
  const _stop = (draft: Draft<IState>) => {
    if (draft.data.current_entry !== null) {
      const e = draft.data.kvs[draft.data.current_entry];
      const r = last(e.ranges);
      r.end = Number(new Date()) / 1000;
      const dt = r.end - r.start;
      _addDt(draft, draft.data.current_entry, dt);
      draft.data.current_entry = null;
      app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
    }
  };

  const _rmFromTodo = (draft: Draft<IState>, k: string) => {
    if (draft.data.current_entry === k) {
      _stop(draft);
    }
    const pk = draft.data.kvs[k].parent;
    if (pk) {
      deleteAtVal(draft.data.kvs[pk].todo, k);
    }
  };

  const produce_top = (state: IState, k: string) =>
    produce(state, draft => {
      _top(draft, k);
      app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
    });

  return (state: undefined | IState, action: TActions) => {
    if (state === undefined) {
      return state_;
    } else {
      switch (action.type) {
        case "eval_": {
          const k = action.k;
          return produce(state, draft => {
            _eval_(draft, k);
          });
        }
        case "delete_": {
          const k = action.k;
          return produce(state, draft => {
            if (draft.data.kvs[k].todo.length === 0) {
              _rmTodoEntry(draft, k);
              deleteAtVal(draft.data.queue, k);
              delete draft.data.kvs[k];
              delete draft.caches[k];
              if (draft.data.current_entry === k) {
                draft.data.current_entry = null;
              }
              app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
            }
          });
        }
        case "new_": {
          const parent = action.parent;
          const k = new Date().toISOString();
          return produce(state, draft => {
            const v = newEntryValue(parent, k);
            draft.data.kvs[k] = v;
            draft.data.kvs[parent].todo.unshift(k);
            draft.data.queue.unshift(k);
            app.setCache(draft.caches as ICaches, k, draft.data.kvs);
            app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
          });
        }
        case "save": {
          if (app.my_state.dirtyHistory) {
            app.my_state.history = pushHistory(app.my_state.history, state);
            app.my_state.dirtyHistory = false;
          }
          if (app.my_state.dirtyDump) {
            fetch("api/" + API_VERSION + "/post", {
              method: "POST",
              headers: {
                "Content-Type": "application/json; charset=utf-8",
              },
              body: JSON.stringify(state.data),
            }).then(r => {
              // todo: Use redux-thunk.
              state = produce(state, (draft: Draft<IState>) => {
                draft.saveSuccess = r.ok;
              });
            });
            app.my_state.dirtyDump = false;
          }
          return state;
        }
        case "undo": {
          if (app.my_state.history.prev !== null) {
            app.my_state.history = app.my_state.history.prev;
            state = app.my_state.history.value;
            app.my_state.dirtyDump = true;
          }
          return state;
        }
        case "redo": {
          if (app.my_state.history.next !== null) {
            app.my_state.history = app.my_state.history.next;
            state = app.my_state.history.value;
          }
          return state;
        }
        case "flipShowTodoOnly": {
          return produce(state, draft => {
            draft.data.showTodoOnly = !draft.data.showTodoOnly;
            app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
          });
        }
        case "flipShowDetail": {
          const k = action.k;
          return produce(state, draft => {
            draft.data.kvs[k].show_detail = !draft.data.kvs[k].show_detail;
            app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
          });
        }
        case "start": {
          const k = action.k;
          return produce(state, draft => {
            if (k !== draft.data.current_entry) {
              switch (draft.data.kvs[k].status) {
                case "done":
                  _doneToTodo(draft, k);
                  break;
                case "dont":
                  _dontToTodo(draft, k);
                  break;
              }
              _top(draft, k);
              assert(draft.data.kvs[k].status === "todo", "Must not happen");
              _stop(draft);
              draft.data.current_entry = k;
              draft.data.kvs[k].ranges.push({
                start: Number(new Date()) / 1000,
                end: null,
              });
              app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
            }
          });
        }
        case "focusStopButton": {
          const k = action.k;
          setTimeout(() => focus(stopButtonRefOf(k).current), 50);
          return state;
        }
        case "top": {
          return produce_top(state, action.k);
        }
        case "smallestToTop": {
          let k_min = null;
          let estimate_min = Infinity;
          for (const k in state.data.kvs) {
            const v = state.data.kvs[k];
            if (
              v.status === "todo" &&
              v.todo.length <= 0 &&
              0 < v.estimate &&
              v.estimate < estimate_min
            ) {
              k_min = k;
              estimate_min = v.estimate;
            }
          }
          return k_min === null ? state : produce_top(state, k_min);
        }
        case "closestToTop": {
          let k_min = null;
          let due_min = ":due: 9999-12-31T23:59:59";
          for (let k in state.data.kvs) {
            let v = state.data.kvs[k];
            if (v.status === "todo" && v.todo.length <= 0) {
              while (true) {
                let due = null;
                for (const w of v.text.split("\n")) {
                  if (w.startsWith(":due: ")) {
                    due = w;
                  }
                }
                if (due !== null) {
                  if (due < due_min) {
                    k_min = k;
                    due_min = due;
                  }
                  break;
                }
                if (v.parent === null) {
                  break;
                }
                k = v.parent;
                v = state.data.kvs[k];
              }
            }
          }
          return k_min === null ? state : produce_top(state, k_min);
        }
        case "stop": {
          return produce(state, _stop);
        }
        case "moveUp": {
          const k = action.k;
          return produce(state, draft => {
            const pk = draft.data.kvs[k].parent;
            if (pk) {
              moveUp(draft.data.kvs[pk].todo, k);
              moveUp(draft.data.queue, k);
              app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
            }
          });
        }
        case "focusMoveUpButton": {
          const k = action.k;
          focus(moveUpButtonRefOf(k).current);
          return state;
        }
        case "moveDown": {
          const k = action.k;
          return produce(state, draft => {
            const pk = draft.data.kvs[k].parent;
            if (pk) {
              moveDown(draft.data.kvs[pk].todo, k);
              moveDown(draft.data.queue, k);
              app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
            }
          });
        }
        case "focusMoveDownButton": {
          const k = action.k;
          focus(moveDownButtonRefOf(k).current);
          return state;
        }
        case "unindent": {
          const k = action.k;
          return produce(state, draft => {
            const pk = draft.data.kvs[k].parent;
            if (pk !== null) {
              const ppk = draft.data.kvs[pk].parent;
              if (ppk !== null) {
                const _total_time_spent_pk_orig =
                  draft.caches[pk].total_time_spent;
                const _total_time_spent_ppk_orig =
                  draft.caches[ppk].total_time_spent;
                _rmTodoEntry(draft, k);
                const entries = draft.data.kvs[ppk].todo;
                const i = entries.indexOf(pk);
                assert(i !== -1, "Must not happen.");
                _addTodoEntry(draft, ppk, i, k);
                assertIsApprox(
                  _total_time_spent_pk_orig - draft.caches[pk].total_time_spent,
                  draft.caches[k].total_time_spent,
                );
                if (_total_time_spent_ppk_orig !== null) {
                  assertIsApprox(
                    _total_time_spent_ppk_orig,
                    draft.caches[ppk].total_time_spent,
                  );
                }
                app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
              }
            }
          });
        }
        case "focusUnindentButton": {
          const k = action.k;
          focus(unindentButtonRefOf(k).current);
          return state;
        }
        case "indent": {
          const k = action.k;
          return produce(state, draft => {
            const pk = draft.data.kvs[k].parent;
            if (pk) {
              const entries = draft.data.kvs[pk].todo;
              if (last(entries) !== k) {
                const i = entries.indexOf(k);
                const new_pk = entries[i + 1];
                const total_time_spent_new_pk_orig =
                  draft.caches[new_pk].total_time_spent;
                const total_time_spent_k = draft.caches[k].total_time_spent;
                _rmTodoEntry(draft, k);
                _addTodoEntry(draft, new_pk, 0, k);
                assertIsApprox(
                  draft.caches[new_pk].total_time_spent,
                  total_time_spent_new_pk_orig + total_time_spent_k,
                );
                app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
              }
            }
          });
        }
        case "focusIndentButton": {
          const k = action.k;
          focus(indentButtonRefOf(k).current);
          return state;
        }
        case "setEstimate": {
          const k = action.k;
          const estimate = action.estimate;
          return produce(state, draft => {
            if (draft.data.kvs[k].estimate !== estimate) {
              draft.data.kvs[k].estimate = estimate;
              app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
            }
          });
        }
        case "setLastRange": {
          const k = action.k;
          const t = action.t;
          return produce(state, draft => {
            const l = lastRange(draft.data.kvs[k].ranges);
            if (l !== null && l.end) {
              const t1 = l.end - l.start;
              const t2 = t * 3600;
              const dt = t2 - t1;
              if (dt !== 0) {
                l.end = l.start + t2;
                _addDt(draft, k, dt);
                app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
              }
            }
          });
        }
        case "setText": {
          const k = action.k;
          const text = action.text;
          return produce(state, draft => {
            draft.data.kvs[k].text = text;
            app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
          });
        }
        case "resizeTextArea": {
          const k = action.k;
          const width = action.width;
          const height = action.height;
          return width === null || height === null
            ? state
            : produce(state, draft => {
                const v = draft.data.kvs[k];
                // if (v.style.width !== width) {
                //   v.style.width = width;
                //   app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
                // }
                if (v.style.height !== height) {
                  v.style.height = height;
                  app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
                }
              });
        }
        case "todoToDone": {
          const k = action.k;
          return produce(state, draft => {
            _rmFromTodo(draft, k);
            _addToDone(draft, k);
            _topQueue(draft, k);
            app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
          });
        }
        case "todoToDont": {
          const k = action.k;
          return produce(state, draft => {
            _rmFromTodo(draft, k);
            _addToDont(draft, k);
            _topQueue(draft, k);
            app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
          });
        }
        case "doneToTodo": {
          const k = action.k;
          return produce(state, draft => {
            _doneToTodo(draft, k);
            app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
          });
        }
        case "dontToTodo": {
          const k = action.k;
          return produce(state, draft => {
            _dontToTodo(draft, k);
            app.my_state.dirtyHistory = app.my_state.dirtyDump = true;
          });
        }
        case "focusTextArea": {
          const k = action.k;
          // todo: Use more reliable method to focus on the textarea.
          setTimeout(() => focus(textAreaRefOf(k).current), 50);
          return state;
        }
        default:
          const _: never = action; // 1 or state cannot be used here
          return state;
      }
    }
  };
};

const memoize1 = <A, R>(fn: (a: A) => R) => {
  const cache = new Map<A, R>();
  return (a: A) => {
    if (!cache.has(a)) {
      cache.set(a, fn(a));
    }
    return cache.get(a) as R;
  };
};

const stopButtonRefOf = memoize1((_: string) =>
  React.createRef<HTMLButtonElement>(),
);

const moveUpButtonRefOf = memoize1((_: string) =>
  React.createRef<HTMLButtonElement>(),
);

const moveDownButtonRefOf = memoize1((_: string) =>
  React.createRef<HTMLButtonElement>(),
);

const unindentButtonRefOf = memoize1((_: string) =>
  React.createRef<HTMLButtonElement>(),
);

const indentButtonRefOf = memoize1((_: string) =>
  React.createRef<HTMLButtonElement>(),
);

const textAreaRefOf = memoize1((_: string) =>
  React.createRef<HTMLTextAreaElement>(),
);

const toTreeButtonOf = memoize1((k: string) => (
  <a href={`#tree${k}`}>
    <button>→</button>
  </a>
));

const connect_show_k = (
  fn_show: (v: IEntry) => any,
  mapDispatchToProps: (
    dispatch: Dispatch<TActions>,
    ownProps: {
      k: string;
    },
  ) => {
    onClick: () => void;
  },
  fn: (onClick: () => void) => null | JSX.Element,
) =>
  connect(
    (
      state: IState,
      ownProps: {
        k: string;
      },
    ) => ({
      show: Boolean(fn_show(state.data.kvs[ownProps.k])),
    }),
    mapDispatchToProps,
  )((props: { onClick: () => void; show: boolean }) =>
    props.show ? fn(props.onClick) : null,
  );

const TodoToDoneButton = connect_show_k(
  (v: IEntry) => v.parent && v.status === "todo" && v.todo.length === 0,
  (
    dispatch: Dispatch<TActions>,
    ownProps: {
      k: string;
    },
  ) => ({
    onClick: () => {
      dispatch({ type: "todoToDone", k: ownProps.k });
      dispatch({ type: "save" });
    },
  }),
  (onClick: () => void) => <button onClick={onClick}>{DONE_MARK}</button>,
);

const TodoToDontButton = connect_show_k(
  (v: IEntry) => v.parent && v.status === "todo" && v.todo.length === 0,
  (
    dispatch: Dispatch<TActions>,
    ownProps: {
      k: string;
    },
  ) => ({
    onClick: () => {
      dispatch({ type: "todoToDont", k: ownProps.k });
      dispatch({ type: "save" });
    },
  }),
  (onClick: () => void) => <button onClick={onClick}>{DONT_MARK}</button>,
);

const DoneToTodoButton = connect_show_k(
  (v: IEntry) => v.parent !== null && v.status === "done",
  (
    dispatch: Dispatch<TActions>,
    ownProps: {
      k: string;
    },
  ) => ({
    onClick: () => {
      dispatch({ type: "doneToTodo", k: ownProps.k });
      dispatch({ type: "save" });
    },
  }),
  (onClick: () => void) => (
    <button className="done" onClick={onClick}>
      {DONE_MARK}
    </button>
  ),
);

const DontToTodoButton = connect_show_k(
  (v: IEntry) => v.parent !== null && v.status === "dont",
  (
    dispatch: Dispatch<TActions>,
    ownProps: {
      k: string;
    },
  ) => ({
    onClick: () => {
      dispatch({ type: "dontToTodo", k: ownProps.k });
      dispatch({ type: "save" });
    },
  }),
  (onClick: () => void) => (
    <button className="dont" onClick={onClick}>
      {DONT_MARK}
    </button>
  ),
);

const StopButton = connect(
  (
    _: IState,
    ownProps: {
      k: string;
    },
  ) => ownProps,
  (dispatch: Dispatch<TActions>) => ({
    onClick: () => {
      dispatch({ type: "stop" });
      dispatch({ type: "save" });
    },
  }),
)((props: { k: string; onClick: () => void }) => (
  <button onClick={props.onClick} ref={stopButtonRefOf(props.k)}>
    {STOP_MARK}
  </button>
));

const StartButton = connect(
  null,
  (
    dispatch: Dispatch<TActions>,
    ownProps: {
      k: string;
    },
  ) => ({
    onClick: () => {
      dispatch({ type: "start", k: ownProps.k });
      dispatch({ type: "save" });
      dispatch({ type: "focusStopButton", k: ownProps.k });
    },
  }),
)((props: { onClick: () => void }) => (
  <button onClick={props.onClick}>{START_MARK}</button>
));

const TopButton = connect_show_k(
  (v: IEntry) => v.parent && v.status === "todo",
  (
    dispatch: Dispatch<TActions>,
    ownProps: {
      k: string;
    },
  ) => ({
    onClick: () => {
      dispatch({ type: "top", k: ownProps.k });
      dispatch({ type: "save" });
    },
  }),
  (onClick: () => void) => <button onClick={onClick}>{TOP_MARK}</button>,
);

const MoveUpButton = connect(
  (
    state: IState,
    ownProps: {
      k: string;
    },
  ) => {
    const v = state.data.kvs[ownProps.k];
    return {
      show: Boolean(v.parent && v.show_detail && v.status === "todo"),
      k: ownProps.k,
    };
  },
  (
    dispatch: Dispatch<TActions>,
    ownProps: {
      k: string;
    },
  ) => ({
    onClick: () => {
      dispatch({ type: "moveUp", k: ownProps.k });
      dispatch({ type: "save" });
      dispatch({ type: "focusMoveUpButton", k: ownProps.k });
    },
  }),
)((props: { show: boolean; k: string; onClick: () => void }) =>
  props.show ? (
    <button onClick={props.onClick} ref={moveUpButtonRefOf(props.k)}>
      {MOVE_UP_MARK}
    </button>
  ) : null,
);

const MoveDownButton = connect(
  (
    state: IState,
    ownProps: {
      k: string;
    },
  ) => {
    const v = state.data.kvs[ownProps.k];
    return {
      show: Boolean(v.parent && v.show_detail && v.status === "todo"),
      k: ownProps.k,
    };
  },
  (
    dispatch: Dispatch<TActions>,
    ownProps: {
      k: string;
    },
  ) => ({
    onClick: () => {
      dispatch({ type: "moveDown", k: ownProps.k });
      dispatch({ type: "save" });
      dispatch({ type: "focusMoveDownButton", k: ownProps.k });
    },
  }),
)((props: { show: boolean; k: string; onClick: () => void }) =>
  props.show ? (
    <button onClick={props.onClick} ref={moveDownButtonRefOf(props.k)}>
      {MOVE_DOWN_MARK}
    </button>
  ) : null,
);

const UnindentButton = connect(
  (
    state: IState,
    ownProps: {
      k: string;
    },
  ) => {
    const v = state.data.kvs[ownProps.k];
    return {
      show: Boolean(v.parent && v.show_detail && v.status === "todo"),
      k: ownProps.k,
    };
  },
  (
    dispatch: Dispatch<TActions>,
    ownProps: {
      k: string;
    },
  ) => ({
    onClick: () => {
      dispatch({ type: "unindent", k: ownProps.k });
      dispatch({ type: "save" });
      dispatch({ type: "focusUnindentButton", k: ownProps.k });
    },
  }),
)((props: { show: boolean; k: string; onClick: () => void }) =>
  props.show ? (
    <button onClick={props.onClick} ref={unindentButtonRefOf(props.k)}>
      {UNINDENT_MARK}
    </button>
  ) : null,
);

const IndentButton = connect(
  (
    state: IState,
    ownProps: {
      k: string;
    },
  ) => {
    const v = state.data.kvs[ownProps.k];
    return {
      show: Boolean(v.parent && v.show_detail && v.status === "todo"),
      k: ownProps.k,
    };
  },
  (
    dispatch: Dispatch<TActions>,
    ownProps: {
      k: string;
    },
  ) => ({
    onClick: () => {
      dispatch({ type: "indent", k: ownProps.k });
      dispatch({ type: "save" });
      dispatch({ type: "focusIndentButton", k: ownProps.k });
    },
  }),
)((props: { show: boolean; k: string; onClick: () => void }) =>
  props.show ? (
    <button onClick={props.onClick} ref={indentButtonRefOf(props.k)}>
      {INDENT_MARK}
    </button>
  ) : null,
);

const EvalButton = connect_show_k(
  (v: IEntry) => v.status === "todo",
  (
    dispatch: Dispatch<TActions>,
    ownProps: {
      k: string;
    },
  ) => ({
    onClick: () => {
      dispatch({ type: "eval_", k: ownProps.k });
    },
  }),
  (onClick: () => void) => <button onClick={onClick}>{EVAL_MARK}</button>,
);

const ShowDetailButton = connect_show_k(
  (v: IEntry) => v.parent,
  (
    dispatch: Dispatch<TActions>,
    ownProps: {
      k: string;
    },
  ) => ({
    onClick: () => {
      dispatch({ type: "flipShowDetail", k: ownProps.k });
      dispatch({ type: "save" });
    },
  }),
  (onClick: () => void) => <button onClick={onClick}>{DETAIL_MARK}</button>,
);

const DeleteButton = connect_show_k(
  (v: IEntry) =>
    v.parent &&
    v.show_detail &&
    v.status === "todo" &&
    v.todo.length === 0 &&
    v.done.length === 0 &&
    v.dont.length === 0,
  (
    dispatch: Dispatch<TActions>,
    ownProps: {
      k: string;
    },
  ) => ({
    onClick: () => {
      dispatch({ type: "delete_", k: ownProps.k });
      dispatch({ type: "save" });
    },
  }),
  (onClick: () => void) => <button onClick={onClick}>{DELETE_MARK}</button>,
);

const EstimationInput = connect(
  (
    state: IState,
    ownProps: {
      k: string;
    },
  ) => {
    const v = state.data.kvs[ownProps.k];
    return {
      show: v.parent !== null,
      estimate: v.estimate,
      className: v.status,
    };
  },
  (
    dispatch: Dispatch<TActions>,
    ownProps: {
      k: string;
    },
  ) => ({
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({
        type: "setEstimate",
        k: ownProps.k,
        estimate: Number(e.currentTarget.value),
      });
      dispatch({ type: "save" });
    },
  }),
)(
  (props: {
    show: boolean;
    estimate: number;
    className: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) =>
    props.show ? (
      <input
        type="number"
        step="any"
        value={props.estimate}
        onChange={props.onChange}
        className={props.className}
      />
    ) : null,
);

const main = () => {
  fetch("api/" + API_VERSION + "/get")
    .then(r => r.json())
    .then((data: IData) => {
      ReactDOM.render(<App data={data} />, document.getElementById("root"));
    });
};

main();
