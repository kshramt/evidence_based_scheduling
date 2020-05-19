import React from "react";
import ReactDOM from "react-dom";
import { connect, Provider } from "react-redux";
import { Action, createStore, applyMiddleware } from "redux";
import thunk, { ThunkDispatch, ThunkMiddleware } from "redux-thunk";
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
  status: TStatus;
  parent: null | string;
  show_detail: boolean;
  ranges: IRange[];
  running: boolean;
  cache: ICache;
  noTodo: boolean;
  showDeleteButton: boolean;
}

interface IQueueNodeProps {
  k: string;
  status: TStatus;
  parent: null | string;
  show_detail: boolean;
  ranges: IRange[];
  running: boolean;
  cache: ICache;
  shouldHide: boolean;
  noTodo: boolean;
  showDeleteButton: boolean;
}

interface IState {
  data: IData;
  caches: ICaches;

  saveSuccess: boolean;
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
interface ISetStateAction extends Action {
  type: "setState";
  payload: IState;
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
interface ISetSaveSuccessAction extends Action {
  type: "setSaveSuccess";
  payload: boolean;
}
interface IFocusTextAreaAction extends Action {
  type: "focusTextArea";
  k: string;
}

type TActions =
  | IEvalAction
  | IDeleteActin
  | INewAction
  | ISetSaveSuccessAction
  | ISetStateAction
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

class History<T> {
  capacity: number;
  i: number;
  buf: T[];
  constructor() {
    this.capacity = 0;
    this.i = -1;
    this.buf = [];
  }

  value = () => this.buf[this.i];

  push = (v: T) => {
    this.i += 1;
    if (this.buf.length <= this.i) {
      this.buf.push(v);
      this.capacity = this.buf.length;
    } else {
      this.buf[this.i] = v;
      if (this.capacity < this.i) {
        this.capacity = this.i;
      }
    }
    return this;
  };

  undo = () => {
    this.i = Math.max(this.i - 1, 0);
    return this.value();
  };

  redo = () => {
    this.i = Math.min(this.i + 1, this.capacity - 1);
    return this.value();
  };
}

const HISTORY = new History<IState>();
const DIRTY_BITS = {
  dirtyHistory: false,
  dirtyDump: false,
};

const setCache = (caches: ICaches, k: string, kvs: IKvs) => {
  if (caches[k] === undefined) {
    const sumChildren = (xs: string[]) => {
      return xs.reduce((total, current) => {
        setCache(caches, current, kvs);
        return total + caches[current].total_time_spent;
      }, 0);
    };
    caches[k] = {
      total_time_spent: kvs[k].ranges.reduce((total, current) => {
        return current.end === null
          ? total
          : total + (current.end - current.start);
      }, sumChildren(kvs[k].todo) + sumChildren(kvs[k].done) + sumChildren(kvs[k].dont)),
      percentiles: [] as number[], // 0, 10, 33, 50, 67, 90, 100
    };
  }
  return caches;
};

const root_reducer_of = () => {
  const _stop = (draft: Draft<IState>) => {
    if (draft.data.current_entry !== null) {
      const e = draft.data.kvs[draft.data.current_entry];
      const r = last(e.ranges);
      r.end = Number(new Date()) / 1000;
      const dt = r.end - r.start;
      _addDt(draft, draft.data.current_entry, dt);
      draft.data.current_entry = null;
      DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
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
      DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
    });

  return (state: undefined | IState, action: TActions) => {
    if (state === undefined) {
      return emptyStateOf();
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
              DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
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
            setCache(draft.caches as ICaches, k, draft.data.kvs);
            DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
          });
        }
        case "setSaveSuccess": {
          return produce(state, draft => {
            draft.saveSuccess = action.payload;
          });
        }
        case "setState": {
          HISTORY.push(action.payload);
          return action.payload;
        }
        case "undo": {
          const prev = HISTORY.undo();
          if (prev !== state) {
            state = prev;
            DIRTY_BITS.dirtyDump = true;
          }
          return state;
        }
        case "redo": {
          const next = HISTORY.redo();
          if (next !== state) {
            state = next;
            DIRTY_BITS.dirtyDump = true;
          }
          return state;
        }
        case "flipShowTodoOnly": {
          return produce(state, draft => {
            draft.data.showTodoOnly = !draft.data.showTodoOnly;
            DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
          });
        }
        case "flipShowDetail": {
          const k = action.k;
          return produce(state, draft => {
            draft.data.kvs[k].show_detail = !draft.data.kvs[k].show_detail;
            DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
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
              DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
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
              DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
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
              DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
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
                DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
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
                DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
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
              DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
            }
          });
        }
        case "setLastRange": {
          const k = action.k;
          const t = action.t;
          return produce(state, draft => {
            const l = lastRangeOf(draft.data.kvs[k].ranges);
            if (l !== null && l.end) {
              const t1 = l.end - l.start;
              const t2 = t * 3600;
              const dt = t2 - t1;
              if (dt !== 0) {
                l.end = l.start + t2;
                _addDt(draft, k, dt);
                DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
              }
            }
          });
        }
        case "setText": {
          const k = action.k;
          const text = action.text;
          return produce(state, draft => {
            draft.data.kvs[k].text = text;
            DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
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
                //   DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
                // }
                if (v.style.height !== height) {
                  v.style.height = height;
                  DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
                }
              });
        }
        case "todoToDone": {
          const k = action.k;
          return produce(state, draft => {
            _rmFromTodo(draft, k);
            _addToDone(draft, k);
            _topQueue(draft, k);
            DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
          });
        }
        case "todoToDont": {
          const k = action.k;
          return produce(state, draft => {
            _rmFromTodo(draft, k);
            _addToDont(draft, k);
            _topQueue(draft, k);
            DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
          });
        }
        case "doneToTodo": {
          const k = action.k;
          return produce(state, draft => {
            _doneToTodo(draft, k);
            DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
          });
        }
        case "dontToTodo": {
          const k = action.k;
          return produce(state, draft => {
            _dontToTodo(draft, k);
            DIRTY_BITS.dirtyHistory = DIRTY_BITS.dirtyDump = true;
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

const newEntryValue = (parent: string, start_time: string) =>
  _newEntryValue(parent, start_time);

const _newEntryValue = (parent: null | string, start_time: string) => {
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

const emptyStateOf = () => {
  const root = "root";
  const kvs = {
    root: _newEntryValue(null, root),
  };
  return {
    data: {
      current_entry: null,
      root,
      kvs,
      queue: [],
      showTodoOnly: false,
    },
    caches: setCache({}, root, kvs),
    saveSuccess: true,
  };
};
const STORE = createStore(
  root_reducer_of(),
  applyMiddleware(thunk as ThunkMiddleware<IState, TActions>),
);

const App = connect((state: IState) => ({
  root: state.data.root,
}))((props: { root: string }) => {
  return (
    <div id="columns">
      <Menu />
      <QueueColumn />
      <div id="tree">
        <Node k={props.root} />
      </div>
    </div>
  );
});

const Menu = connect((state: IState) => {
  return { saveSuccess: state.saveSuccess, root: state.data.root };
})((props: { saveSuccess: boolean; root: string }) => {
  return (
    <div className={"menu"}>
      {props.saveSuccess ? null : <p>Failed to save.</p>}
      <div>
        {stopButtonOf(props.root)}
        {newButtonOf(props.root)}
        <button
          onClick={() => {
            STORE.dispatch(doSave());
            STORE.dispatch({ type: "undo" });
            STORE.dispatch(doSave());
          }}
        >
          {UNDO_MARK}
        </button>
        <button
          onClick={() => {
            STORE.dispatch(doSave());
            STORE.dispatch({ type: "redo" });
            STORE.dispatch(doSave());
          }}
        >
          {REDO_MARK}
        </button>
        <button
          onClick={() => {
            STORE.dispatch({ type: "flipShowTodoOnly" });
            STORE.dispatch(doSave());
          }}
        >
          👀
        </button>
        <button
          onClick={() => {
            STORE.dispatch({ type: "smallestToTop" });
            STORE.dispatch(doSave());
          }}
        >
          Small
        </button>
        <button
          onClick={() => {
            STORE.dispatch({ type: "closestToTop" });
            STORE.dispatch(doSave());
          }}
        >
          Due
        </button>
      </div>
    </div>
  );
});

const doSave = () => (
  dispatch: ThunkDispatch<IState, void, TActions>,
  getState: () => IState,
) => {
  const state = getState();
  if (DIRTY_BITS.dirtyHistory) {
    HISTORY.push(state);
    DIRTY_BITS.dirtyHistory = false;
  }
  if (DIRTY_BITS.dirtyDump) {
    fetch("api/" + API_VERSION + "/post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(state.data),
    }).then(r => {
      dispatch({
        type: "setSaveSuccess",
        payload: r.ok,
      });
    });
    DIRTY_BITS.dirtyDump = false;
  }
};

const doLoad = () => (dispatch: ThunkDispatch<IState, void, TActions>) => {
  fetch("api/" + API_VERSION + "/get")
    .then(r => r.json())
    .then((data: IData) => {
      const caches: ICaches = {};
      for (const k of Object.keys(data.kvs)) {
        setCache(caches, k, data.kvs);
      }
      dispatch({
        type: "setState",
        payload: {
          data,
          caches,
          saveSuccess: true,
        },
      });
    });
};

const setText = (k: string, text: string) => {
  STORE.dispatch({ type: "setText", k, text });
};

const setLastRange = (k: string, t: number) => {
  STORE.dispatch({ type: "setLastRange", k, t });
  STORE.dispatch(doSave());
};

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

const Node = connect(
  (
    state: IState,
    ownProps: {
      k: string;
    },
  ) => {
    const k = ownProps.k;
    const v = state.data.kvs[k];
    return {
      k,
      todo: v.todo,
      done: v.done,
      dont: v.dont,
      showTodoOnly: state.data.showTodoOnly,
    };
  },
)((props: INodeProps) => {
  return (
    <>
      <Entry k={props.k} />
      <List ks={props.todo} />
      {props.showTodoOnly ? null : <List ks={props.done} />}
      {props.showTodoOnly ? null : <List ks={props.dont} />}
    </>
  );
});

const QueueNode = connect(
  (
    state: IState,
    ownProps: {
      k: string;
    },
  ) => {
    const k = ownProps.k;
    const v = state.data.kvs[k];
    return {
      k,
      status: v.status,
      parent: v.parent,
      show_detail: v.show_detail,
      ranges: v.ranges,
      cache: state.caches[k],
      running: k === state.data.current_entry,
      shouldHide: state.data.showTodoOnly && v.status !== "todo",
      noTodo: v.todo.length === 0,
      showDeleteButton:
        v.todo.length === 0 && v.done.length === 0 && v.dont.length === 0,
    };
  },
)((props: IQueueNodeProps) => {
  const cache = props.cache;
  return props.shouldHide ? null : (
    <li key={props.k}>
      <div
        id={`queue${props.k}`}
        className={props.running ? `${props.status} running` : props.status}
      >
        {props.parent ? (
          <>
            {toTreeButtonOf(props.k)}
            {props.status === "todo"
              ? newButtonOf(props.k)
              : props.status === "done"
              ? doneToTodoButtonOf(props.k)
              : dontToTodoButtonOf(props.k)}
            {TextAreaOf(props.k)}
            {props.running ? stopButtonOf(props.k) : startButtonOf(props.k)}
            {EstimationInputOf(props.k)}
          </>
        ) : null}
        {digits1(cache.total_time_spent / 3600)}
        {props.parent && props.status === "todo" ? topButtonOf(props.k) : null}
        {props.status === "todo" ? evalButtonOf(props.k) : null}
        {props.parent ? (
          <>
            {props.noTodo && props.status === "todo" ? (
              <>
                {todoToDoneButtonOf(props.k)}
                {todoToDontButtonOf(props.k)}
              </>
            ) : null}
            {showDetailButtonOf(props.k)}
            {props.show_detail && props.status === "todo" ? (
              <>
                {moveUpButtonOf(props.k)}
                {moveDownButtonOf(props.k)}
                {LastRangeOf(props.k)}
                {props.showDeleteButton ? deleteButtonOf(props.k) : null}
              </>
            ) : null}
          </>
        ) : null}
        {props.status === "todo"
          ? cache.percentiles.map(digits1).join(" ")
          : null}
      </div>
    </li>
  );
});

const Entry = connect(
  (
    state: IState,
    ownProps: {
      k: string;
    },
  ) => {
    const k = ownProps.k;
    const v = state.data.kvs[k];
    return {
      k,
      status: v.status,
      parent: v.parent,
      show_detail: v.show_detail,
      ranges: v.ranges,
      cache: state.caches[k],
      running: k === state.data.current_entry,
      noTodo: v.todo.length === 0,
      showDeleteButton:
        v.todo.length === 0 && v.done.length === 0 && v.dont.length === 0,
    };
  },
)((props: IEntryProps) => {
  const cache = props.cache;
  return (
    <div
      id={`tree${props.k}`}
      className={props.running ? `${props.status} running` : props.status}
    >
      {props.parent ? (
        <>
          {props.status === "todo"
            ? newButtonOf(props.k)
            : props.status === "done"
            ? doneToTodoButtonOf(props.k)
            : dontToTodoButtonOf(props.k)}
          {TextAreaOf(props.k)}
          {props.running ? stopButtonOf(props.k) : startButtonOf(props.k)}
          {EstimationInputOf(props.k)}
        </>
      ) : null}
      {digits1(cache.total_time_spent / 3600)}
      {props.parent && props.status === "todo" ? topButtonOf(props.k) : null}
      {props.status === "todo" ? evalButtonOf(props.k) : null}
      {props.parent ? (
        <>
          {props.noTodo && props.status === "todo" ? (
            <>
              {todoToDoneButtonOf(props.k)}
              {todoToDontButtonOf(props.k)}
            </>
          ) : null}
          {showDetailButtonOf(props.k)}
          {props.show_detail && props.status === "todo" ? (
            <>
              {moveUpButtonOf(props.k)}
              {moveDownButtonOf(props.k)}
              {unindentButtonOf(props.k)}
              {indentButtonOf(props.k)}
              {LastRangeOf(props.k)}
              {props.showDeleteButton ? deleteButtonOf(props.k) : null}
            </>
          ) : null}
        </>
      ) : null}
      {props.status === "todo"
        ? cache.percentiles.map(digits1).join(" ")
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

const lastRangeOf = (ranges: IRange[]): null | IRange => {
  return ranges.length
    ? last(ranges).end === null
      ? lastRangeOf(butLast(ranges))
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

const doneToTodoButtonOf = memoize1((k: string) => (
  <button
    className="done"
    onClick={() => {
      STORE.dispatch({ type: "doneToTodo", k });
      STORE.dispatch(doSave());
    }}
  >
    {DONE_MARK}
  </button>
));

const dontToTodoButtonOf = memoize1((k: string) => (
  <button
    className="dont"
    onClick={() => {
      STORE.dispatch({ type: "dontToTodo", k });
      STORE.dispatch(doSave());
    }}
  >
    {DONT_MARK}
  </button>
));

const newButtonOf = memoize1((k: string) => (
  <button
    onClick={() => {
      STORE.dispatch({ type: "new_", parent: k });
      STORE.dispatch(doSave());
      STORE.dispatch({
        type: "focusTextArea",
        k: STORE.getState().data.kvs[k].todo[0],
      });
    }}
  >
    {NEW_MARK}
  </button>
));

const stopButtonOf = memoize1((k: string) => (
  <button
    onClick={() => {
      STORE.dispatch({ type: "stop" });
      STORE.dispatch(doSave());
    }}
    ref={stopButtonRefOf(k)}
  >
    {STOP_MARK}
  </button>
));

const startButtonOf = memoize1((k: string) => (
  <button
    onClick={() => {
      STORE.dispatch({ type: "start", k });
      STORE.dispatch(doSave());
      STORE.dispatch({ type: "focusStopButton", k });
    }}
  >
    {START_MARK}
  </button>
));

const topButtonOf = memoize1((k: string) => (
  <button
    onClick={() => {
      STORE.dispatch({ type: "top", k });
      STORE.dispatch(doSave());
    }}
  >
    {TOP_MARK}
  </button>
));

const moveUpButtonOf = memoize1((k: string) => (
  <button
    onClick={() => {
      STORE.dispatch({ type: "moveUp", k });
      STORE.dispatch(doSave());
      STORE.dispatch({ type: "focusMoveUpButton", k });
    }}
    ref={moveUpButtonRefOf(k)}
  >
    {MOVE_UP_MARK}
  </button>
));

const moveDownButtonOf = memoize1((k: string) => (
  <button
    onClick={() => {
      STORE.dispatch({ type: "moveDown", k });
      STORE.dispatch(doSave());
      STORE.dispatch({ type: "focusMoveDownButton", k });
    }}
    ref={moveDownButtonRefOf(k)}
  >
    {MOVE_DOWN_MARK}
  </button>
));

const todoToDoneButtonOf = memoize1((k: string) => (
  <button
    onClick={() => {
      STORE.dispatch({ type: "todoToDone", k });
      STORE.dispatch(doSave());
    }}
  >
    {DONE_MARK}
  </button>
));

const todoToDontButtonOf = memoize1((k: string) => (
  <button
    onClick={() => {
      STORE.dispatch({ type: "todoToDont", k });
      STORE.dispatch(doSave());
    }}
  >
    {DONT_MARK}
  </button>
));

const unindentButtonOf = memoize1((k: string) => (
  <button
    onClick={() => {
      STORE.dispatch({ type: "unindent", k });
      STORE.dispatch(doSave());
      STORE.dispatch({ type: "focusUnindentButton", k });
    }}
    ref={unindentButtonRefOf(k)}
  >
    {UNINDENT_MARK}
  </button>
));

const indentButtonOf = memoize1((k: string) => (
  <button
    onClick={() => {
      STORE.dispatch({ type: "indent", k });
      STORE.dispatch(doSave());
      STORE.dispatch({ type: "focusIndentButton", k });
    }}
    ref={indentButtonRefOf(k)}
  >
    {INDENT_MARK}
  </button>
));

const showDetailButtonOf = memoize1((k: string) => (
  <button
    onClick={() => {
      STORE.dispatch({ type: "flipShowDetail", k });
      STORE.dispatch(doSave());
    }}
  >
    {DETAIL_MARK}
  </button>
));

const deleteButtonOf = memoize1((k: string) => (
  <button
    onClick={() => {
      STORE.dispatch({ type: "delete_", k });
      STORE.dispatch(doSave());
    }}
  >
    {DELETE_MARK}
  </button>
));

const evalButtonOf = memoize1((k: string) => (
  <button
    onClick={() => {
      STORE.dispatch({ type: "eval_", k });
    }}
  >
    {EVAL_MARK}
  </button>
));

const setEstimateOf = memoize1(
  (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    STORE.dispatch({
      type: "setEstimate",
      k,
      estimate: Number(e.currentTarget.value),
    });
    STORE.dispatch(doSave());
  },
);

const EstimationInputOf = memoize1((k: string) => <EstimationInput k={k} />);

const EstimationInput = connect(
  (
    state: IState,
    ownProps: {
      k: string;
    },
  ) => {
    const v = state.data.kvs[ownProps.k];
    return {
      estimate: v.estimate,
      className: v.status,
      k: ownProps.k,
    };
  },
)((props: { estimate: number; className: string; k: string }) => (
  <input
    type="number"
    step="any"
    value={props.estimate}
    onChange={setEstimateOf(props.k)}
    className={props.className}
  />
));

const setLastRangeOf = memoize1(
  (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setLastRange(k, Number(e.currentTarget.value));
  },
);

const setTextOf = memoize1(
  (k: string) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(k, e.currentTarget.value);
  },
);

const dispatchResizeAndDoSaveOf = memoize1((k: string) => () => {
  const el = textAreaRefOf(k).current;
  if (el) {
    el.style.height = "1ex";
    const h = String(el.scrollHeight) + "px";
    STORE.dispatch({
      type: "resizeTextArea",
      k,
      width: el.style.width,
      height: h,
    });
    el.style.height = h;
  }
  STORE.dispatch(doSave());
});

const TextAreaOf = memoize1((k: string) => <TextArea k={k} />);

const TextArea = connect(
  (
    state: IState,
    ownProps: {
      k: string;
    },
  ) => {
    const v = state.data.kvs[ownProps.k];
    return {
      text: v.text,
      k: ownProps.k,
      status: v.status,
      style: v.style,
    };
  },
)((props: { text: string; k: string; status: TStatus; style: IStyle }) => {
  return (
    <textarea
      value={props.text}
      onChange={setTextOf(props.k)}
      onBlur={dispatchResizeAndDoSaveOf(props.k)}
      className={props.status}
      style={props.style}
      ref={textAreaRefOf(props.k)}
    />
  );
});

const LastRangeOf = memoize1((k: string) => <LastRange k={k} />);

const LastRange = connect(
  (
    state: IState,
    ownProps: {
      k: string;
    },
  ) => {
    const v = state.data.kvs[ownProps.k];
    const lastRange = lastRangeOf(v.ranges);
    return {
      lastRangeValue:
        lastRange !== null && lastRange.end !== null && v.parent !== null
          ? (lastRange.end - lastRange.start) / 3600
          : null,
      k: ownProps.k,
    };
  },
)((props: { lastRangeValue: null | number; k: string }) =>
  props.lastRangeValue === null ? null : (
    <input
      type="number"
      step="any"
      value={props.lastRangeValue}
      onChange={setLastRangeOf(props.k)}
    />
  ),
);

const main = () => {
  ReactDOM.render(
    <Provider store={STORE}>
      <App />
    </Provider>,
    document.getElementById("root"),
  );
  STORE.dispatch(doLoad());
};

main();
