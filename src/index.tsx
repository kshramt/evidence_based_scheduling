import React from "react";
import ReactDOM from "react-dom";
import { connect, Provider } from "react-redux";
import { Action, Store, createStore } from "redux";
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

type TListProps = {
  ks: string[];
};

type TQueueProps = {
  ks: string[];
};

type TNodeProps = {
  k: string;
  todo: string[];
  done: string[];
  dont: string[];
  showTodoOnly: boolean;
};

type TEntryProps = {
  k: string;
  v: TEntry;
  running: boolean;
  cache: TCache;
};

type TQueueNodeProps = {
  k: string;
  v: TEntry;
  running: boolean;
  cache: TCache;
  showTodoOnly: boolean;
};

type THistory = {
  prev: null | THistory;
  value: TState;
  next: null | THistory;
};

type TState = {
  data: TData;
  caches: TCaches;

  saveSuccess: boolean;
};

type TAppProps = {
  data: TData;
};

type TMenuProps = {
  saveSuccess: boolean;
};

type TNodeOwnProps = {
  k: string;
};

type TEntryOwnProps = {
  k: string;
};

type TQueueColumnProps = {
  queue: string[];
};

type TData = {
  current_entry: null | string;
  root: string;
  kvs: TKvs;
  queue: string[];
  showTodoOnly: boolean;
};

type TKvs = {
  [k: string]: TEntry;
};

type TEntry = {
  done: string[];
  dont: string[];
  end_time: null | string;
  estimate: number;
  parent: null | string;
  ranges: TRange[];
  show_detail: boolean;
  start_time: string;
  status: TStatus;
  style: TStyle;
  text: string;
  todo: string[];
};

type TStyle = {
  height: string;
  width: string;
};

type TRange = {
  start: number;
  end: null | number;
};

type TCaches = {
  [k: string]: TCache;
};

type TCache = {
  total_time_spent: number;
  percentiles: number[];
  stopButtonRef: React.RefObject<HTMLButtonElement>;
  moveUpButtonRef: React.RefObject<HTMLButtonElement>;
  moveDownButtonRef: React.RefObject<HTMLButtonElement>;
  unindentButtonRef: React.RefObject<HTMLButtonElement>;
  indentButtonRef: React.RefObject<HTMLButtonElement>;
  textAreaRef: React.RefObject<HTMLTextAreaElement>;
  treeDoneToTodoButton: JSX.Element;
  treeDontToTodoButton: JSX.Element;
  queueDoneToTodoButton: JSX.Element;
  queueDontToTodoButton: JSX.Element;
  treeNewButton: JSX.Element;
  queueNewButton: JSX.Element;
  stopButton: JSX.Element;
  startButton: JSX.Element;
  topButton: JSX.Element;
  moveUpButton: JSX.Element;
  moveDownButton: JSX.Element;
  unindentButton: JSX.Element;
  indentButton: JSX.Element;
  evalButton: JSX.Element;
  showDetailButton: JSX.Element;
  deleteButton: JSX.Element;
  toTreeButton: JSX.Element;
  todoToDoneButton: JSX.Element;
  todoToDontButton: JSX.Element;
  setLastRange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setEstimate: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setText: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  resizeTextArea: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
  textAreaOf: (
    text: string,
    status: TStatus,
    style: TStyle,
    ref: null | React.RefObject<HTMLTextAreaElement>,
  ) => JSX.Element;
};

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

class App extends React.Component<TAppProps, TState> {
  dirtyHistory: boolean;
  dirtyDump: boolean;
  history: THistory;
  menuButtons: JSX.Element;
  store: Store<TState, TActions>;

  constructor(props: TAppProps) {
    super(props);
    const caches = {} as TCaches;
    for (const k of Object.keys(props.data.kvs)) {
      this.setCache(caches, k, props.data.kvs);
    }
    const state = {
      data: props.data,
      caches,
      saveSuccess: true,
    };
    const _state = state;
    this.store = createStore((state: undefined | TState, action: TActions) => {
      if (state === undefined) {
        return _state;
      } else {
        switch (action.type) {
          case "eval_":
            return this.$eval_(state, action.k);
          case "delete_":
            return this.$delete_(state, action.k);
          case "new_":
            return this.$new_(state, action.parent);
          case "save":
            return this.$save(state);
          case "undo":
            return this.$undo(state);
          case "redo":
            return this.$redo(state);
          case "flipShowTodoOnly":
            return this.$flipShowTodoOnly(state);
          case "flipShowDetail":
            return this.$flipShowDetail(state, action.k);
          case "start":
            return this.$start(state, action.k);
          case "focusStopButton":
            return this.$focusStopButton(state, action.k);
          case "top":
            return this.$top(state, action.k);
          case "stop":
            return this.$stop(state);
          case "moveUp":
            return this.$moveUp(state, action.k);
          case "focusMoveUpButton":
            return this.$focusMoveUpButton(state, action.k);
          case "moveDown":
            return this.$moveDown(state, action.k);
          case "focusMoveDownButton":
            return this.$focusMoveDownButton(state, action.k);
          case "unindent":
            return this.$unindent(state, action.k);
          case "focusUnindentButton":
            return this.$focusUnindentButton(state, action.k);
          case "indent":
            return this.$indent(state, action.k);
          case "focusIndentButton":
            return this.$focusIndentButton(state, action.k);
          case "setEstimate":
            return this.$setEstimate(state, action.k, action.estimate);
          case "setLastRange":
            return this.$setLastRange(state, action.k, action.t);
          case "setText":
            return this.$setText(state, action.k, action.text);
          case "resizeTextArea":
            return this.$resizeTextArea(
              state,
              action.k,
              action.width,
              action.height,
            );
          case "todoToDone":
            return this.$todoToDone(state, action.k);
          case "todoToDont":
            return this.$todoToDont(state, action.k);
          case "doneToTodo":
            return this.$doneToTodo(state, action.k);
          case "dontToTodo":
            return this.$dontToTodo(state, action.k);
          case "focusTextArea":
            return $focusTextArea(state, action.k);
          default:
            const _: never = action; // 1 or state cannot be used here
            return state;
        }
      }
    }, state);

    this.dirtyHistory = false;
    this.dirtyDump = false;
    this.history = {
      prev: null,
      value: state,
      next: null,
    };

    this.menuButtons = (
      <div>
        {state.caches[state.data.root].stopButton}
        {state.caches[state.data.root].treeNewButton}
        <button onClick={this.undo}>{UNDO_MARK}</button>
        <button onClick={this.redo}>{REDO_MARK}</button>
        <button onClick={this.flipShowTodoOnly}>👀</button>
      </div>
    );
  }
  setCache = (caches: TCaches, k: string, kvs: TKvs) => {
    if (caches[k] === undefined) {
      const sumChildren = (xs: string[]) => {
        return xs.reduce((total, current) => {
          this.setCache(caches, current, kvs);
          return total + caches[current].total_time_spent;
        }, 0);
      };
      const stopButtonRef = React.createRef<HTMLButtonElement>();
      const moveUpButtonRef = React.createRef<HTMLButtonElement>();
      const moveDownButtonRef = React.createRef<HTMLButtonElement>();
      const unindentButtonRef = React.createRef<HTMLButtonElement>();
      const textAreaRef = React.createRef<HTMLTextAreaElement>();
      const indentButtonRef = React.createRef<HTMLButtonElement>();
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
        stopButtonRef,
        moveUpButtonRef,
        moveDownButtonRef,
        unindentButtonRef,
        indentButtonRef,
        textAreaRef,
        treeDoneToTodoButton: (
          <button
            className="done"
            onClick={() => {
              this.doneToTodo(k);
            }}
          >
            {DONE_MARK}
          </button>
        ),
        treeDontToTodoButton: (
          <button
            className="dont"
            onClick={() => {
              this.dontToTodo(k);
            }}
          >
            {DONT_MARK}
          </button>
        ),
        // todo: DRY
        queueDoneToTodoButton: (
          <button
            className="done"
            onClick={() => {
              this.doneToTodo(k);
            }}
          >
            {DONE_MARK}
          </button>
        ),
        queueDontToTodoButton: (
          <button
            className="dont"
            onClick={() => {
              this.dontToTodo(k);
            }}
          >
            {DONT_MARK}
          </button>
        ),
        treeNewButton: (
          <button
            onClick={() => {
              this.new_(k);
            }}
          >
            {NEW_MARK}
          </button>
        ),
        queueNewButton: (
          <button
            onClick={() => {
              this.new_(k);
            }}
          >
            {NEW_MARK}
          </button>
        ),
        startButton: (
          <button
            onClick={() => {
              this.start(k);
            }}
          >
            {START_MARK}
          </button>
        ),
        stopButton: (
          <button onClick={this.stop} ref={stopButtonRef}>
            {STOP_MARK}
          </button>
        ),
        topButton: (
          <button
            onClick={() => {
              this.top(k);
            }}
          >
            {TOP_MARK}
          </button>
        ),
        moveUpButton: (
          <button
            onClick={() => {
              this.moveUp(k);
            }}
            ref={moveUpButtonRef}
          >
            {MOVE_UP_MARK}
          </button>
        ),
        moveDownButton: (
          <button
            onClick={() => {
              this.moveDown(k);
            }}
            ref={moveDownButtonRef}
          >
            {MOVE_DOWN_MARK}
          </button>
        ),
        unindentButton: (
          <button
            onClick={() => {
              this.unindent(k);
            }}
            ref={unindentButtonRef}
          >
            {UNINDENT_MARK}
          </button>
        ),
        indentButton: (
          <button
            onClick={() => {
              this.indent(k);
            }}
            ref={indentButtonRef}
          >
            {INDENT_MARK}
          </button>
        ),
        evalButton: (
          <button
            onClick={() => {
              this.eval_(k);
            }}
          >
            {EVAL_MARK}
          </button>
        ),
        showDetailButton: (
          <button
            onClick={() => {
              this.flipShowDetail(k);
            }}
          >
            {DETAIL_MARK}
          </button>
        ),
        deleteButton: (
          <button
            onClick={() => {
              this.delete_(k);
            }}
          >
            {DELETE_MARK}
          </button>
        ),
        toTreeButton: (
          <a href={`#tree${k}`}>
            <button>→</button>
          </a>
        ),
        todoToDoneButton: XToYButton(
          DONE_MARK,
          this.todoToDone,
          "todoToDone",
          k,
        ),
        todoToDontButton: XToYButton(
          DONT_MARK,
          this.todoToDont,
          "todoToDont",
          k,
        ),
        setLastRange: (e: React.ChangeEvent<HTMLInputElement>) => {
          this.setLastRange(k, Number(e.currentTarget.value));
        },
        setEstimate: (e: React.ChangeEvent<HTMLInputElement>) => {
          this.setEstimate(k, Number(e.currentTarget.value));
        },
        setText,
        resizeTextArea,
        textAreaOf: (
          text: string,
          status: TStatus,
          style: TStyle,
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
  eval_ = (k: string) => {
    this.store.dispatch({ type: "eval_", k });
  };
  $eval_ = (state: TState, k: string) => {
    return produce(state, draft => {
      _eval_(draft, k);
    });
  };
  delete_ = (k: string) => {
    this.store.dispatch({ type: "delete_", k });
    this.store.dispatch({ type: "save" });
  };
  $delete_ = (state: TState, k: string) => {
    return produce(state, draft => {
      if (draft.data.kvs[k].todo.length === 0) {
        _rmTodoEntry(draft, k);
        deleteAtVal(draft.data.queue, k);
        delete draft.data.kvs[k];
        delete draft.caches[k];
        if (draft.data.current_entry === k) {
          draft.data.current_entry = null;
        }
        this.dirtyHistory = this.dirtyDump = true;
      }
    });
  };
  new_ = (parent: string) => {
    this.store.dispatch({ type: "new_", parent });
    this.store.dispatch({ type: "save" });
    this.store.dispatch({
      type: "focusTextArea",
      k: this.store.getState().data.kvs[parent].todo[0],
    });
  };
  $new_ = (state: TState, parent: string) => {
    const k = new Date().toISOString();
    return produce(state, draft => {
      const v = newEntryValue(parent, k);
      draft.data.kvs[k] = v;
      draft.data.kvs[parent].todo.unshift(k);
      draft.data.queue.unshift(k);
      this.setCache(draft.caches as TCaches, k, draft.data.kvs);
      this.dirtyHistory = this.dirtyDump = true;
    });
  };
  save = () => {
    this.store.dispatch({ type: "save" });
  };
  $save = (state: TState) => {
    if (this.dirtyHistory) {
      this.history = pushHistory(this.history, state);
      this.dirtyHistory = false;
    }
    if (this.dirtyDump) {
      fetch("api/" + API_VERSION + "/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(state.data),
      }).then(r => {
        state = produce(state, draft => {
          draft.saveSuccess = r.ok;
        });
      });
      this.dirtyDump = false;
    }
    return state;
  };
  undo = () => {
    this.store.dispatch({ type: "save" });
    this.store.dispatch({ type: "undo" });
    this.store.dispatch({ type: "save" });
  };
  $undo = (state: TState) => {
    if (this.history.prev !== null) {
      this.history = this.history.prev;
      state = this.history.value;
      this.dirtyDump = true;
    }
    return state;
  };
  redo = () => {
    this.store.dispatch({ type: "save" });
    this.store.dispatch({ type: "redo" });
    this.store.dispatch({ type: "save" });
  };
  $redo = (state: TState) => {
    if (this.history.next !== null) {
      this.history = this.history.next;
      state = this.history.value;
    }
    return state;
  };
  flipShowTodoOnly = () => {
    this.store.dispatch({ type: "flipShowTodoOnly" });
    this.store.dispatch({ type: "save" });
  };
  $flipShowTodoOnly = (state: TState) => {
    return produce(state, draft => {
      draft.data.showTodoOnly = !draft.data.showTodoOnly;
      this.dirtyHistory = this.dirtyDump = true;
    });
  };
  flipShowDetail = (k: string) => {
    this.store.dispatch({ type: "flipShowDetail", k });
    this.store.dispatch({ type: "save" });
  };
  $flipShowDetail = (state: TState, k: string) => {
    return produce(state, draft => {
      draft.data.kvs[k].show_detail = !draft.data.kvs[k].show_detail;
      this.dirtyHistory = this.dirtyDump = true;
    });
  };
  start = (k: string) => {
    this.store.dispatch({ type: "start", k });
    this.store.dispatch({ type: "save" });
    this.store.dispatch({ type: "focusStopButton", k });
  };
  $start = (state: TState, k: string) => {
    return produce(state, draft => {
      if (k !== draft.data.current_entry) {
        if (draft.data.kvs[k].status === "done") {
          _doneToTodo(draft, k);
        } else if (draft.data.kvs[k].status === "dont") {
          _dontToTodo(draft, k);
        }
        _top(draft, k);
        assert(draft.data.kvs[k].status === "todo", "Must not happen");
        this._stop(draft);
        draft.data.current_entry = k;
        draft.data.kvs[k].ranges.push({
          start: Number(new Date()) / 1000,
          end: null,
        });
        this.dirtyHistory = this.dirtyDump = true;
      }
    });
  };
  $focusStopButton = (state: TState, k: string) => {
    setTimeout(() => focus(state.caches[k].stopButtonRef.current), 50);
    return state;
  };
  top = (k: string) => {
    this.store.dispatch({ type: "top", k });
    this.store.dispatch({ type: "save" });
  };
  $top = (state: TState, k: string) => {
    return produce(state, draft => {
      _top(draft, k);
      this.dirtyHistory = this.dirtyDump = true;
    });
  };
  moveUp = (k: string) => {
    this.store.dispatch({ type: "moveUp", k });
    this.store.dispatch({ type: "save" });
    this.store.dispatch({ type: "focusMoveUpButton", k });
  };
  $moveUp = (state: TState, k: string) => {
    return produce(state, draft => {
      const pk = draft.data.kvs[k].parent;
      if (pk) {
        moveUp(draft.data.kvs[pk].todo, k);
        this.dirtyHistory = this.dirtyDump = true;
      }
    });
  };
  $focusMoveUpButton = (state: TState, k: string) => {
    focus(state.caches[k].moveUpButtonRef.current);
    return state;
  };
  moveDown = (k: string) => {
    this.store.dispatch({ type: "moveDown", k });
    this.store.dispatch({ type: "save" });
    this.store.dispatch({ type: "focusMoveDownButton", k });
  };
  $moveDown = (state: TState, k: string) => {
    return produce(state, draft => {
      const pk = draft.data.kvs[k].parent;
      if (pk) {
        moveDown(draft.data.kvs[pk].todo, k);
        this.dirtyHistory = this.dirtyDump = true;
      }
    });
  };
  $focusMoveDownButton = (state: TState, k: string) => {
    focus(state.caches[k].moveDownButtonRef.current);
    return state;
  };
  unindent = (k: string) => {
    this.store.dispatch({ type: "unindent", k });
    this.store.dispatch({ type: "save" });
    this.store.dispatch({ type: "focusUnindentButton", k });
  };
  $unindent = (state: TState, k: string) => {
    return produce(state, draft => {
      const pk = draft.data.kvs[k].parent;
      if (pk !== null) {
        const ppk = draft.data.kvs[pk].parent;
        if (ppk !== null) {
          const _total_time_spent_pk_orig = draft.caches[pk].total_time_spent;
          const _total_time_spent_ppk_orig = draft.caches[ppk].total_time_spent;
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
          this.dirtyHistory = this.dirtyDump = true;
        }
      }
    });
  };
  $focusUnindentButton = (state: TState, k: string) => {
    focus(state.caches[k].unindentButtonRef.current);
    return state;
  };
  indent = (k: string) => {
    this.store.dispatch({ type: "indent", k });
    this.store.dispatch({ type: "save" });
    this.store.dispatch({ type: "focusIndentButton", k });
  };
  $indent = (state: TState, k: string) => {
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
          this.dirtyHistory = this.dirtyDump = true;
        }
      }
    });
  };
  $focusIndentButton = (state: TState, k: string) => {
    focus(state.caches[k].indentButtonRef.current);
    return state;
  };
  stop = () => {
    this.store.dispatch({ type: "stop" });
    this.store.dispatch({ type: "save" });
  };
  $stop = (state: TState) => {
    return produce(state, this._stop);
  };
  _stop = (draft: Draft<TState>) => {
    if (draft.data.current_entry !== null) {
      const e = draft.data.kvs[draft.data.current_entry];
      const r = last(e.ranges);
      r.end = Number(new Date()) / 1000;
      const dt = r.end - r.start;
      _addDt(draft, draft.data.current_entry, dt);
      draft.data.current_entry = null;
      this.dirtyHistory = this.dirtyDump = true;
    }
  };
  setEstimate = (k: string, estimate: number) => {
    this.store.dispatch({ type: "setEstimate", k, estimate });
    this.store.dispatch({ type: "save" });
  };
  $setEstimate = (state: TState, k: string, estimate: number) => {
    return produce(state, draft => {
      draft.data.kvs[k].estimate = estimate;
      this.dirtyHistory = this.dirtyDump = true;
    });
  };
  setLastRange = (k: string, t: number) => {
    this.store.dispatch({ type: "setLastRange", k, t });
    this.store.dispatch({ type: "save" });
  };
  $setLastRange = (state: TState, k: string, t: number) => {
    return produce(state, draft => {
      const l = lastRange(draft.data.kvs[k].ranges);
      if (l !== null && l.end) {
        const t1 = l.end - l.start;
        const t2 = t * 3600;
        const dt = t2 - t1;
        if (dt !== 0) {
          l.end = l.start + t2;
          _addDt(draft, k, dt);
          this.dirtyHistory = this.dirtyDump = true;
        }
      }
    });
  };
  setText = (k: string, text: string) => {
    this.store.dispatch({ type: "setText", k, text });
  };
  $setText = (state: TState, k: string, text: string) => {
    return produce(state, draft => {
      draft.data.kvs[k].text = text;
      this.dirtyHistory = this.dirtyDump = true;
    });
  };
  resizeTextArea = (k: string, width: null | string, height: null | string) => {
    this.store.dispatch({ type: "resizeTextArea", k, width, height });
    this.store.dispatch({ type: "save" });
  };
  $resizeTextArea = (
    state: TState,
    k: string,
    width: null | string,
    height: null | string,
  ) => {
    return width && height
      ? produce(state, draft => {
          const v = draft.data.kvs[k];
          // if (v.style.width !== width) {
          //   v.style.width = width;
          //   this.dirtyHistory = this.dirtyDump = true;
          // }
          if (v.style.height !== height) {
            v.style.height = height;
            this.dirtyHistory = this.dirtyDump = true;
          }
        })
      : state;
  };
  _rmFromTodo = (draft: Draft<TState>, k: string) => {
    if (draft.data.current_entry === k) {
      this._stop(draft);
    }
    const pk = draft.data.kvs[k].parent;
    if (pk) {
      deleteAtVal(draft.data.kvs[pk].todo, k);
    }
  };
  todoToDone = (k: string) => {
    this.store.dispatch({ type: "todoToDone", k });
    this.store.dispatch({ type: "save" });
  };
  $todoToDone = (state: TState, k: string) => {
    return produce(state, draft => {
      this._rmFromTodo(draft, k);
      _addToDone(draft, k);
      _topQueue(draft, k);
      this.dirtyHistory = this.dirtyDump = true;
    });
  };
  todoToDont = (k: string) => {
    this.store.dispatch({ type: "todoToDont", k });
    this.store.dispatch({ type: "save" });
  };
  $todoToDont = (state: TState, k: string) => {
    return produce(state, draft => {
      this._rmFromTodo(draft, k);
      _addToDont(draft, k);
      _topQueue(draft, k);
      this.dirtyHistory = this.dirtyDump = true;
    });
  };
  doneToTodo = (k: string) => {
    this.store.dispatch({ type: "doneToTodo", k });
    this.store.dispatch({ type: "save" });
  };
  $doneToTodo = (state: TState, k: string) => {
    return produce(state, draft => {
      _doneToTodo(draft, k);
      this.dirtyHistory = this.dirtyDump = true;
    });
  };
  dontToTodo = (k: string) => {
    this.store.dispatch({ type: "dontToTodo", k });
    this.store.dispatch({ type: "save" });
  };
  $dontToTodo = (state: TState, k: string) => {
    return produce(state, draft => {
      _dontToTodo(draft, k);
      this.dirtyHistory = this.dirtyDump = true;
    });
  };
  render = () => {
    const Menu = connect((state: TState) => {
      return { saveSuccess: state.saveSuccess };
    })((props: TMenuProps) => {
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

const _eval_ = (draft: Draft<TState>, k: string) => {
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

const _rmTodoEntry = (draft: Draft<TState>, k: string) => {
  const pk = draft.data.kvs[k].parent;
  if (pk) {
    deleteAtVal(draft.data.kvs[pk].todo, k);
    _addDt(draft, pk, -draft.caches[k].total_time_spent);
  }
};

const _addTodoEntry = (
  draft: Draft<TState>,
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

const _top = (draft: Draft<TState>, k: string) => {
  _topTree(draft, k);
  _topQueue(draft, k);
};

const _topTree = (draft: Draft<TState>, k: string) => {
  let ck = k;
  let pk = draft.data.kvs[ck].parent;
  while (pk !== null) {
    toFront(draft.data.kvs[pk].todo, ck);
    ck = pk;
    pk = draft.data.kvs[ck].parent;
  }
};

const _addDt = (draft: Draft<TState>, k: null | string, dt: number) => {
  while (k) {
    draft.caches[k].total_time_spent += dt;
    k = draft.data.kvs[k].parent;
  }
};

const _topQueue = (draft: Draft<TState>, k: string) => {
  toFront(draft.data.queue, k);
};

const _doneToTodo = (draft: Draft<TState>, k: string) => {
  _rmFromDone(draft, k);
  _addToTodo(draft, k);
  const pk = draft.data.kvs[k].parent;
  if (pk !== null && draft.data.kvs[pk].status !== "todo") {
    _doneToTodo(draft, pk);
  }
};

const _dontToTodo = (draft: Draft<TState>, k: string) => {
  _rmFromDont(draft, k);
  _addToTodo(draft, k);
  const pk = draft.data.kvs[k].parent;
  if (pk !== null && draft.data.kvs[pk].status !== "todo") {
    _dontToTodo(draft, pk);
  }
};

const _rmFromDone = (draft: Draft<TState>, k: string) => {
  const pk = draft.data.kvs[k].parent;
  if (pk) {
    deleteAtVal(draft.data.kvs[pk].done, k);
  }
};

const _rmFromDont = (draft: Draft<TState>, k: string) => {
  const pk = draft.data.kvs[k].parent;
  if (pk) {
    deleteAtVal(draft.data.kvs[pk].dont, k);
  }
};

const _addToTodo = (draft: Draft<TState>, k: string) => {
  draft.data.kvs[k].status = "todo";
  const pk = draft.data.kvs[k].parent;
  if (pk) {
    draft.data.kvs[pk].todo.unshift(k);
  }
};

const _addToDone = (draft: Draft<TState>, k: string) => {
  draft.data.kvs[k].status = "done";
  draft.data.kvs[k].end_time = new Date().toISOString();
  const pk = draft.data.kvs[k].parent;
  if (pk) {
    draft.data.kvs[pk].done.unshift(k);
  }
};

const _addToDont = (draft: Draft<TState>, k: string) => {
  draft.data.kvs[k].status = "dont";
  draft.data.kvs[k].end_time = new Date().toISOString();
  const pk = draft.data.kvs[k].parent;
  if (pk) {
    draft.data.kvs[pk].dont.unshift(k);
  }
};

const $focusTextArea = (state: TState, k: string) => {
  // todo: Use more reliable method to focus on the textarea.
  setTimeout(() => focus(state.caches[k].textAreaRef.current), 50);
  return state;
};

const QueueColumn = connect((state: TState) => {
  return { queue: state.data.queue };
})((props: TQueueColumnProps) => {
  return (
    <div id="queue">
      <Queue ks={props.queue} />
    </div>
  );
});

const Queue = React.memo((props: TQueueProps) => {
  return props.ks.length ? (
    <ol>
      {props.ks.map(k => {
        return <QueueNode k={k} key={k} />;
      })}
    </ol>
  ) : null;
});

const List = React.memo((props: TListProps) => {
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

const Node = connect((state: TState, ownProps: TNodeOwnProps) => {
  const k = ownProps.k;
  const v = state.data.kvs[k];
  return {
    k,
    todo: v.todo,
    done: v.done,
    dont: v.dont,
    showTodoOnly: state.data.showTodoOnly,
  };
})((props: TNodeProps) => {
  return (
    <React.Fragment>
      <Entry k={props.k} />
      <List ks={props.todo} />
      {props.showTodoOnly ? null : <List ks={props.done} />}
      {props.showTodoOnly ? null : <List ks={props.dont} />}
    </React.Fragment>
  );
});

const QueueNode = connect((state: TState, ownProps: TEntryOwnProps) => {
  const k = ownProps.k;
  return {
    k,
    v: state.data.kvs[k],
    cache: state.caches[k],
    running: k === state.data.current_entry,
    showTodoOnly: state.data.showTodoOnly,
  };
})((props: TQueueNodeProps) => {
  const v = props.v;
  const cache = props.cache;
  return props.showTodoOnly && v.status !== "todo" ? null : (
    <li key={props.k}>
      <div
        id={`queue${props.k}`}
        className={props.running ? `${v.status} running` : v.status}
      >
        {v.parent ? cache.toTreeButton : null}
        {v.parent === null
          ? null
          : v.status === "done"
          ? cache.queueDoneToTodoButton
          : v.status === "dont"
          ? cache.queueDontToTodoButton
          : cache.queueNewButton}
        {v.parent === null
          ? null
          : cache.textAreaOf(v.text, v.status, v.style, null)}
        {v.parent === null ? null : (
          <input
            type="number"
            step="any"
            value={v.estimate}
            onChange={cache.setEstimate}
            className={v.status}
          />
        )}
        {digits1(cache.total_time_spent / 3600)}
        {v.parent === null
          ? null
          : props.running
          ? cache.stopButton
          : cache.startButton}
        {v.parent && v.status === "todo" ? cache.topButton : null}
        {v.status === "todo" ? cache.evalButton : null}
        {v.parent && v.status === "todo"
          ? [cache.todoToDoneButton, cache.todoToDontButton]
          : null}
        {v.parent ? cache.showDetailButton : null}
        {v.status === "todo" ? cache.percentiles.map(digits1).join(" ") : null}
        {v.parent && v.show_detail
          ? showLastRange(lastRange(v.ranges), cache.setLastRange)
          : null}
        {v.parent && v.show_detail
          ? v.status === "todo" &&
            v.todo.length === 0 &&
            v.done.length === 0 &&
            v.dont.length === 0
            ? cache.deleteButton
            : null
          : null}
      </div>
    </li>
  );
});

const Entry = connect((state: TState, ownProps: TEntryOwnProps) => {
  const k = ownProps.k;
  return {
    k,
    v: state.data.kvs[k],
    cache: state.caches[k],
    running: k === state.data.current_entry,
  };
})((props: TEntryProps) => {
  const v = props.v;
  const cache = props.cache;
  return (
    <div
      id={`tree${props.k}`}
      className={props.running ? `${v.status} running` : v.status}
    >
      {v.parent === null
        ? null
        : v.status === "done"
        ? cache.treeDoneToTodoButton
        : v.status === "dont"
        ? cache.treeDontToTodoButton
        : cache.treeNewButton}
      {v.parent === null
        ? null
        : cache.textAreaOf(v.text, v.status, v.style, cache.textAreaRef)}
      {v.parent === null ? null : (
        <input
          type="number"
          step="any"
          value={v.estimate}
          onChange={cache.setEstimate}
          className={v.status}
        />
      )}
      {digits1(cache.total_time_spent / 3600)}
      {v.parent === null
        ? null
        : props.running
        ? cache.stopButton
        : cache.startButton}
      {v.parent && v.status === "todo" ? cache.topButton : null}
      {v.status === "todo" ? cache.evalButton : null}
      {v.parent && v.status === "todo" && v.todo.length === 0
        ? [cache.todoToDoneButton, cache.todoToDontButton]
        : null}
      {v.parent ? cache.showDetailButton : null}
      {v.parent && v.show_detail && v.status === "todo"
        ? cache.moveUpButton
        : null}
      {v.parent && v.show_detail && v.status === "todo"
        ? cache.moveDownButton
        : null}
      {v.parent && v.show_detail && v.status === "todo"
        ? cache.unindentButton
        : null}
      {v.parent && v.show_detail && v.status === "todo"
        ? cache.indentButton
        : null}
      {v.status === "todo" ? cache.percentiles.map(digits1).join(" ") : null}
      {v.parent && v.show_detail
        ? showLastRange(lastRange(v.ranges), cache.setLastRange)
        : null}
      {v.parent && v.show_detail
        ? v.status === "todo" &&
          v.todo.length === 0 &&
          v.done.length === 0 &&
          v.dont.length === 0
          ? cache.deleteButton
          : null
        : null}
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
  l: null | TRange,
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

const lastRange = (ranges: TRange[]): null | TRange => {
  return ranges.length
    ? last(ranges).end === null
      ? lastRange(butLast(ranges))
      : last(ranges)
    : null;
};

const butLast = <T extends {}>(xs: T[]): T[] => {
  return xs.length ? xs.slice(0, -1) : xs;
};

const XToYButton = (
  title: string,
  f: (k: string) => void,
  key: string,
  k: string,
) => {
  return (
    <button
      key={key + "-" + k}
      onClick={() => {
        f(k);
      }}
    >
      {title}
    </button>
  );
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

function* leafs(v: TEntry, kvs: TKvs): Iterable<TEntry> {
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

const pushHistory = (h: THistory, v: TState) => {
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
    ranges: [] as TRange[],
    show_detail: false,
    start_time,
    status: "todo" as TStatus,
    style: { width: "49ex", height: "3ex" },
    text: "",
    todo: [] as string[],
  };
};

const main = () => {
  fetch("api/" + API_VERSION + "/get")
    .then(r => r.json())
    .then((data: TData) => {
      ReactDOM.render(<App data={data} />, document.getElementById("root"));
    });
};

main();
