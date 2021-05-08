import React, { useCallback, useState } from "react";
import ReactDOM from "react-dom";
import {
  Provider,
  TypedUseSelectorHook,
  useDispatch as _useDispatch,
  useSelector as _useSelector,
} from "react-redux";
import { Action, createStore, applyMiddleware } from "redux";
import thunk, { ThunkDispatch, ThunkMiddleware } from "redux-thunk";
import produce, { Draft } from "immer";

import "./lib.css";

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

interface IState {
  data: IData;
  caches: ICaches;

  saveSuccess: boolean;
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
interface IMoveDownAction extends Action {
  type: "moveDown";
  k: string;
}
interface IUnindentAction extends Action {
  type: "unindent";
  k: string;
}
interface IIndentAction extends Action {
  type: "indent";
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
  | ITopAction
  | ISmallestToTopAction
  | IClosestToTopAction
  | IStopAction
  | IMoveUpAction
  | IMoveDownAction
  | IUnindentAction
  | IIndentAction
  | ISetEstimateAction
  | ISetLastRangeAction
  | ISetTextAction
  | IResizeTextAreaAction
  | ITodoToDoneAction
  | ITodoToDontAction
  | IDoneToTodoAction
  | IDontToTodoAction;

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
    if (-1 < this.i && this.buf[this.i] === v) {
      return this;
    }
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

const _stop = (draft: Draft<IState>) => {
  if (draft.data.current_entry !== null) {
    const e = draft.data.kvs[draft.data.current_entry];
    const r = last(e.ranges);
    r.end = Number(new Date()) / 1000;
    const dt = r.end - r.start;
    _addDt(draft, draft.data.current_entry, dt);
    draft.data.current_entry = null;
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
  produce(state, (draft) => {
    _top(draft, k);
  });

const root_reducer = (state: undefined | IState, action: TActions) => {
  if (state === undefined) {
    const s = emptyStateOf();
    HISTORY.push(s);
    return s;
  } else {
    switch (action.type) {
      case "eval_": {
        const k = action.k;
        return produce(state, (draft) => {
          _eval_(draft, k);
        });
      }
      case "delete_": {
        const k = action.k;
        return produce(state, (draft) => {
          if (draft.data.kvs[k].todo.length === 0) {
            _rmTodoEntry(draft, k);
            deleteAtVal(draft.data.queue, k);
            delete draft.data.kvs[k];
            delete draft.caches[k];
            if (draft.data.current_entry === k) {
              draft.data.current_entry = null;
            }
          }
        });
      }
      case "new_": {
        const parent = action.parent;
        const k = new Date().toISOString();
        return produce(state, (draft) => {
          const v = newEntryValue(parent, k);
          draft.data.kvs[k] = v;
          draft.data.kvs[parent].todo.unshift(k);
          draft.data.queue.push(k);
          setCache(draft.caches as ICaches, k, draft.data.kvs);
        });
      }
      case "setSaveSuccess": {
        return produce(state, (draft) => {
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
        }
        return state;
      }
      case "redo": {
        const next = HISTORY.redo();
        if (next !== state) {
          state = next;
        }
        return state;
      }
      case "flipShowTodoOnly": {
        return produce(state, (draft) => {
          draft.data.showTodoOnly = !draft.data.showTodoOnly;
        });
      }
      case "flipShowDetail": {
        const k = action.k;
        return produce(state, (draft) => {
          draft.data.kvs[k].show_detail = !draft.data.kvs[k].show_detail;
        });
      }
      case "start": {
        const k = action.k;
        return produce(state, (draft) => {
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
          }
        });
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
        return k_min === null
          ? state
          : produce_top(
              state,
              leafs(state.data.kvs[k_min], state.data.kvs)
                [Symbol.iterator]()
                .next().value.start_time,
            );
      }
      case "stop": {
        return produce(state, _stop);
      }
      case "moveUp": {
        const k = action.k;
        return produce(state, (draft) => {
          const pk = draft.data.kvs[k].parent;
          if (pk) {
            moveUp(draft.data.kvs[pk].todo, k);
            moveUp(draft.data.queue, k);
          }
        });
      }
      case "moveDown": {
        const k = action.k;
        return produce(state, (draft) => {
          const pk = draft.data.kvs[k].parent;
          if (pk) {
            moveDown(draft.data.kvs[pk].todo, k);
            moveDown(draft.data.queue, k);
          }
        });
      }
      case "unindent": {
        const k = action.k;
        return produce(state, (draft) => {
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
            }
          }
        });
      }
      case "indent": {
        const k = action.k;
        return produce(state, (draft) => {
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
            }
          }
        });
      }
      case "setEstimate": {
        const k = action.k;
        const estimate = action.estimate;
        return produce(state, (draft) => {
          if (draft.data.kvs[k].estimate !== estimate) {
            draft.data.kvs[k].estimate = estimate;
          }
        });
      }
      case "setLastRange": {
        const k = action.k;
        const t = action.t;
        return produce(state, (draft) => {
          const l = lastRangeOf(draft.data.kvs[k].ranges);
          if (l !== null && l.end) {
            const t1 = l.end - l.start;
            const t2 = t * 3600;
            const dt = t2 - t1;
            if (dt !== 0) {
              l.end = l.start + t2;
              _addDt(draft, k, dt);
            }
          }
        });
      }
      case "setText": {
        const k = action.k;
        const text = action.text;
        return produce(state, (draft) => {
          draft.data.kvs[k].text = text;
        });
      }
      case "resizeTextArea": {
        const k = action.k;
        const width = action.width;
        const height = action.height;
        return width === null || height === null
          ? state
          : produce(state, (draft) => {
              const v = draft.data.kvs[k];
              // if (v.style.width !== width) {
              //   v.style.width = width;
              // }
              if (v.style.height !== height) {
                v.style.height = height;
              }
            });
      }
      case "todoToDone": {
        const k = action.k;
        return produce(state, (draft) => {
          _rmFromTodo(draft, k);
          _addToDone(draft, k);
          _topQueue(draft, k);
        });
      }
      case "todoToDont": {
        const k = action.k;
        return produce(state, (draft) => {
          _rmFromTodo(draft, k);
          _addToDont(draft, k);
          _topQueue(draft, k);
        });
      }
      case "doneToTodo": {
        const k = action.k;
        return produce(state, (draft) => {
          _doneToTodo(draft, k);
        });
      }
      case "dontToTodo": {
        const k = action.k;
        return produce(state, (draft) => {
          _dontToTodo(draft, k);
        });
      }
      default:
        const _: never = action; // 1 or state cannot be used here
        return state;
    }
  }
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
      version: 5,
    },
    caches: setCache({}, root, kvs),
    saveSuccess: true,
  };
};

const App = () => {
  const root = useSelector((state) => state.data.root);
  return (
    <div id="columns">
      <Menu />
      <QueueColumn />
      <div id="tree">
        <Node k={root} />
      </div>
    </div>
  );
};

const Menu = () => {
  const saveSuccess = useSelector((state) => state.saveSuccess);
  const root = useSelector((state) => state.data.root);
  const dispatch = useDispatch();
  const undo = useCallback(() => {
    dispatch({ type: "undo" });
    dispatch(doSave());
  }, [dispatch]);
  const redo = useCallback(() => {
    dispatch({ type: "redo" });
    dispatch(doSave());
  }, [dispatch]);
  const flipShowTodoOnly = useCallback(() => {
    dispatch({ type: "flipShowTodoOnly" });
    dispatch(doPushHistory());
    dispatch(doSave());
  }, [dispatch]);
  const smallestToTop = useCallback(() => {
    dispatch({ type: "smallestToTop" });
    dispatch(doPushHistory());
    dispatch(doSave());
  }, [dispatch]);
  const closestToTop = useCallback(() => {
    dispatch({ type: "closestToTop" });
    dispatch(doPushHistory());
    dispatch(doSave());
  }, [dispatch]);
  const load = useCallback(() => {
    dispatch(doLoad());
    dispatch(doPushHistory());
    dispatch(doSave());
  }, [dispatch]);

  return (
    <div className="menu">
      {saveSuccess ? null : <p>Failed to save.</p>}
      <div>
        {stopButtonOf(dispatch, root)}
        {newButtonOf(dispatch, root)}
        <button onClick={undo}>{UNDO_MARK}</button>
        <button onClick={redo}>{REDO_MARK}</button>
        <button onClick={flipShowTodoOnly}>👀</button>
        <button onClick={smallestToTop}>Small</button>
        <button onClick={closestToTop}>Due</button>
        <button onClick={load}>⟳</button>
      </div>
    </div>
  );
};

const doPushHistory = () => doPushHistoryRet;

const doPushHistoryRet = (
  dispatch: ThunkDispatch<IState, void, TActions>,
  getState: () => IState,
) => {
  HISTORY.push(getState());
};

const doSave = () => doSaveRet;

const doSaveRet = (
  dispatch: ThunkDispatch<IState, void, TActions>,
  getState: () => IState,
) => {
  fetch("api/" + API_VERSION + "/post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(getState().data),
  }).then((r) => {
    dispatch({
      type: "setSaveSuccess",
      payload: r.ok,
    });
  });
};

const doLoad = () => (dispatch: ThunkDispatch<IState, void, TActions>) => {
  fetch("api/" + API_VERSION + "/get")
    .then((r) => r.json())
    .then((data: null | IData) => {
      if (data === null) {
        return;
      }
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

const doFocusStopButton = (k: string) => () => {
  setTimeout(() => focus(stopButtonRefOf(k).current), 50);
};

const doFocusMoveUpButton = (k: string) => () => {
  setTimeout(() => focus(moveUpButtonRefOf(k).current), 50);
};

const doFocusMoveDownButton = (k: string) => () => {
  setTimeout(() => focus(moveDownButtonRefOf(k).current), 50);
};

const doFocusUnindentButton = (k: string) => () => {
  setTimeout(() => focus(unindentButtonRefOf(k).current), 50);
};

const doFocusIndentButton = (k: string) => () => {
  setTimeout(() => focus(indentButtonRefOf(k).current), 50);
};

const doFocusTextArea = (k: string) => () => {
  setTimeout(() => focus(textAreaRefOf(k).current), 50);
};

const setLastRange = (
  dispatch: ThunkDispatch<IState, void, TActions>,
  k: string,
  t: number,
) => {
  dispatch({ type: "setLastRange", k, t });
  dispatch(doPushHistory());
  dispatch(doSave());
};

const _eval_ = (draft: Draft<IState>, k: string) => {
  const candidates = Object.values(draft.data.kvs).filter((v) => {
    return (
      (v.status === "done" || v.status === "dont") &&
      v.estimate !== NO_ESTIMATION
    );
  });
  const ratios = candidates.length
    ? candidates.map((v) => {
        return draft.caches[v.start_time].total_time_spent / 3600 / v.estimate;
      })
    : [1];
  const now = Number(new Date()) / 1000;
  const ks = _parentsOf(k, draft.data.kvs);
  // todo: The sampling weight should be a function of both the leaves and the candidates.
  const weights = candidates.length
    ? candidates.map((v) => {
        // 1/e per year
        const w_t = Math.exp(
          -(now - Date.parse(v.end_time as string) / 1000) / (86400 * 365.25),
        );
        const parents = new Set(_parentsOf(v.start_time, draft.data.kvs));
        let w_p = 1;
        for (const k of ks) {
          if (parents.has(k)) {
            break;
          }
          w_p *= 0.1;
        }
        return w_t * w_p;
      })
    : [1];
  const leaf_estimates = Array.from(leafs(draft.data.kvs[k], draft.data.kvs))
    .filter((v) => {
      return v.estimate !== NO_ESTIMATION;
    })
    .map((v) => {
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

const _parentsOf = (k: string, kvs: IKvs) => {
  let ret = [];
  let v = kvs[k];
  while (v.parent) {
    ret.push(v.start_time);
    v = kvs[v.parent];
  }
  return ret;
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

const QueueColumn = () => {
  const queue = useSelector((state) => state.data.queue);
  return (
    <div id="queue">
      {queue.length ? (
        <ol>
          {queue.map((k) => {
            return <QueueNode k={k} key={k} />;
          })}
        </ol>
      ) : null}
    </div>
  );
};

const List = React.memo((props: IListProps) => {
  return props.ks.length ? (
    <ol>
      {props.ks.map((k) => {
        return (
          <li key={k}>
            <Node k={k} />
          </li>
        );
      })}
    </ol>
  ) : null;
});

const Node = (props: { k: string }) => {
  const todo = useSelector((state) => state.data.kvs[props.k].todo);
  const done = useSelector((state) => state.data.kvs[props.k].done);
  const dont = useSelector((state) => state.data.kvs[props.k].dont);
  const showTodoOnly = useSelector((state) => state.data.showTodoOnly);

  return (
    <>
      <Entry k={props.k} />
      <List ks={todo} />
      {showTodoOnly ? null : <List ks={done} />}
      {showTodoOnly ? null : <List ks={dont} />}
    </>
  );
};

const QueueNode = (props: { k: string }) => {
  const status = useSelector((state) => state.data.kvs[props.k].status);
  const parent = useSelector((state) => state.data.kvs[props.k].parent);
  const show_detail = useSelector(
    (state) => state.data.kvs[props.k].show_detail,
  );
  const cache = useSelector((state) => state.caches[props.k]);
  const running = useSelector((state) => props.k === state.data.current_entry);
  const shouldHide = useSelector(
    (state) =>
      state.data.showTodoOnly && state.data.kvs[props.k].status !== "todo",
  );
  const noTodo = useSelector(
    (state) => state.data.kvs[props.k].todo.length === 0,
  );
  const showDeleteButton = useSelector((state) => {
    const v = state.data.kvs[props.k];
    return v.todo.length === 0 && v.done.length === 0 && v.dont.length === 0;
  });
  const dispatch = useDispatch();
  return shouldHide ? null : (
    <li key={props.k}>
      <div
        id={`queue${props.k}`}
        className={running ? `${status} running` : status}
      >
        {parent ? (
          <>
            {toTreeButtonOf(props.k)}
            {status === "todo"
              ? newButtonOf(dispatch, props.k)
              : status === "done"
              ? doneToTodoButtonOf(dispatch, props.k)
              : dontToTodoButtonOf(dispatch, props.k)}
            <TextArea k={props.k} />
            {EstimationInputOf(props.k)}
            {running
              ? stopButtonOf(dispatch, props.k)
              : startButtonOf(dispatch, props.k)}
          </>
        ) : null}
        {digits1(cache.total_time_spent / 3600)}
        {parent && status === "todo" ? topButtonOf(dispatch, props.k) : null}
        {status === "todo" ? evalButtonOf(dispatch, props.k) : null}
        {parent ? (
          <>
            {noTodo && status === "todo" ? (
              <>
                {todoToDoneButtonOf(dispatch, props.k)}
                {todoToDontButtonOf(dispatch, props.k)}
              </>
            ) : null}
            {LastRangeOf(props.k)}
            {showDetailButtonOf(dispatch, props.k)}
            {show_detail ? (
              status === "todo" ? (
                <>
                  {moveUpButtonOf(dispatch, props.k)}
                  {moveDownButtonOf(dispatch, props.k)}
                  {showDeleteButton ? deleteButtonOf(dispatch, props.k) : null}
                </>
              ) : null
            ) : null}
          </>
        ) : null}
        {status === "todo" ? cache.percentiles.map(digits1).join(" ") : null}
      </div>
    </li>
  );
};

const Entry = (props: { k: string }) => {
  const status = useSelector((state) => state.data.kvs[props.k].status);
  const parent = useSelector((state) => state.data.kvs[props.k].parent);
  const show_detail = useSelector(
    (state) => state.data.kvs[props.k].show_detail,
  );
  const cache = useSelector((state) => state.caches[props.k]);
  const running = useSelector((state) => props.k === state.data.current_entry);
  const noTodo = useSelector(
    (state) => state.data.kvs[props.k].todo.length === 0,
  );
  const showDeleteButton = useSelector((state) => {
    const v = state.data.kvs[props.k];
    return v.todo.length === 0 && v.done.length === 0 && v.dont.length === 0;
  });
  const dispatch = useDispatch();
  return (
    <div
      id={`tree${props.k}`}
      className={running ? `${status} running` : status}
    >
      {parent ? (
        <>
          {status === "todo"
            ? newButtonOf(dispatch, props.k)
            : status === "done"
            ? doneToTodoButtonOf(dispatch, props.k)
            : dontToTodoButtonOf(dispatch, props.k)}
          <TextArea k={props.k} />
          {EstimationInputOf(props.k)}
          {running
            ? stopButtonOf(dispatch, props.k)
            : startButtonOf(dispatch, props.k)}
        </>
      ) : null}
      {digits1(cache.total_time_spent / 3600)}
      {parent && status === "todo" ? topButtonOf(dispatch, props.k) : null}
      {status === "todo" ? evalButtonOf(dispatch, props.k) : null}
      {parent ? (
        <>
          {noTodo && status === "todo" ? (
            <>
              {todoToDoneButtonOf(dispatch, props.k)}
              {todoToDontButtonOf(dispatch, props.k)}
            </>
          ) : null}
          {LastRangeOf(props.k)}
          {showDetailButtonOf(dispatch, props.k)}
          {show_detail ? (
            status === "todo" ? (
              <>
                {moveUpButtonOf(dispatch, props.k)}
                {moveDownButtonOf(dispatch, props.k)}
                {unindentButtonOf(dispatch, props.k)}
                {indentButtonOf(dispatch, props.k)}
                {showDeleteButton ? deleteButtonOf(dispatch, props.k) : null}
              </>
            ) : null
          ) : null}
        </>
      ) : null}
      {status === "todo" ? cache.percentiles.map(digits1).join(" ") : null}
    </div>
  );
};

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
        estimates.map((x) => {
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
  const partitions = cumsum(ws.map((w) => w / total)).map((v) => {
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

const memoize2 = <A, B, R>(fn: (a: A, b: B) => R) => {
  const cache = new Map<A, Map<B, R>>();
  return (a: A, b: B) => {
    if (!cache.has(a)) {
      cache.set(a, new Map<B, R>());
    }
    const c = cache.get(a) as Map<B, R>;
    if (!c.has(b)) {
      c.set(b, fn(a, b));
    }
    return c.get(b) as R;
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

const doneToTodoButtonOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    <button
      className="done"
      onClick={() => {
        dispatch({ type: "doneToTodo", k });
        dispatch(doPushHistory());
        dispatch(doSave());
      }}
    >
      {DONE_MARK}
    </button>
  ),
);

const dontToTodoButtonOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    <button
      className="dont"
      onClick={() => {
        dispatch({ type: "dontToTodo", k });
        dispatch(doPushHistory());
        dispatch(doSave());
      }}
    >
      {DONT_MARK}
    </button>
  ),
);

const newButtonOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => {
    const _focusTextAreaOfTheFirsttodo = (
      dispatch: ThunkDispatch<IState, void, TActions>,
      getState: () => IState,
    ) => {
      dispatch(doFocusTextArea(getState().data.kvs[k].todo[0]));
    };
    return (
      <button
        onClick={() => {
          dispatch({ type: "new_", parent: k });
          dispatch(doPushHistory());
          dispatch(doSave());
          dispatch(_focusTextAreaOfTheFirsttodo);
        }}
      >
        {NEW_MARK}
      </button>
    );
  },
);

const stopButtonOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    <button
      onClick={() => {
        dispatch({ type: "stop" });
        dispatch(doPushHistory());
        dispatch(doSave());
      }}
      ref={stopButtonRefOf(k)}
    >
      {STOP_MARK}
    </button>
  ),
);

const startButtonOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    <button
      onClick={() => {
        dispatch({ type: "start", k });
        dispatch(doPushHistory());
        dispatch(doSave());
        dispatch(doFocusStopButton(k));
      }}
    >
      {START_MARK}
    </button>
  ),
);

const topButtonOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    <button
      onClick={() => {
        dispatch({ type: "top", k });
        dispatch(doPushHistory());
        dispatch(doSave());
      }}
    >
      {TOP_MARK}
    </button>
  ),
);

const moveUpButtonOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    <button
      onClick={() => {
        dispatch({ type: "moveUp", k });
        dispatch(doPushHistory());
        dispatch(doSave());
        dispatch(doFocusMoveUpButton(k));
      }}
      ref={moveUpButtonRefOf(k)}
    >
      {MOVE_UP_MARK}
    </button>
  ),
);

const moveDownButtonOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    <button
      onClick={() => {
        dispatch({ type: "moveDown", k });
        dispatch(doPushHistory());
        dispatch(doSave());
        dispatch(doFocusMoveDownButton(k));
      }}
      ref={moveDownButtonRefOf(k)}
    >
      {MOVE_DOWN_MARK}
    </button>
  ),
);

const todoToDoneButtonOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    <button
      onClick={() => {
        dispatch({ type: "todoToDone", k });
        dispatch(doPushHistory());
        dispatch(doSave());
      }}
    >
      {DONE_MARK}
    </button>
  ),
);

const todoToDontButtonOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    <button
      onClick={() => {
        dispatch({ type: "todoToDont", k });
        dispatch(doPushHistory());
        dispatch(doSave());
      }}
    >
      {DONT_MARK}
    </button>
  ),
);

const unindentButtonOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    <button
      onClick={() => {
        dispatch({ type: "unindent", k });
        dispatch(doPushHistory());
        dispatch(doSave());
        dispatch(doFocusUnindentButton(k));
      }}
      ref={unindentButtonRefOf(k)}
    >
      {UNINDENT_MARK}
    </button>
  ),
);

const indentButtonOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    <button
      onClick={() => {
        dispatch({ type: "indent", k });
        dispatch(doPushHistory());
        dispatch(doSave());
        dispatch(doFocusIndentButton(k));
      }}
      ref={indentButtonRefOf(k)}
    >
      {INDENT_MARK}
    </button>
  ),
);

const showDetailButtonOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    <button
      onClick={() => {
        dispatch({ type: "flipShowDetail", k });
        dispatch(doPushHistory());
        dispatch(doSave());
      }}
    >
      {DETAIL_MARK}
    </button>
  ),
);

const deleteButtonOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    <button
      onClick={() => {
        dispatch({ type: "delete_", k });
        dispatch(doPushHistory());
        dispatch(doSave());
      }}
    >
      {DELETE_MARK}
    </button>
  ),
);

const evalButtonOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    <button
      onClick={() => {
        dispatch({ type: "eval_", k });
      }}
    >
      {EVAL_MARK}
    </button>
  ),
);

const setEstimateOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    dispatch({
      type: "setEstimate",
      k,
      estimate: Number(e.target.value),
    });
    dispatch(doPushHistory());
    dispatch(doSave());
  },
);

const EstimationInputOf = memoize1((k: string) => <EstimationInput k={k} />);

const EstimationInput = (props: { k: string }) => {
  const estimate = useSelector((state) => state.data.kvs[props.k].estimate);
  const status = useSelector((state) => state.data.kvs[props.k].status);
  const dispatch = useDispatch();
  return (
    <input
      type="number"
      step="any"
      value={estimate}
      onChange={setEstimateOf(dispatch, props.k)}
      className={status}
    />
  );
};

const setLastRangeOf = memoize2(
  (dispatch: ThunkDispatch<IState, void, TActions>, k: string) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setLastRange(dispatch, k, Number(e.target.value));
  },
);

const TextArea = (props: { k: string }) => {
  const state_text = useSelector((state) => state.data.kvs[props.k].text);
  const state_style = useSelector((state) => state.data.kvs[props.k].style);
  const status = useSelector((state) => state.data.kvs[props.k].status);
  const dispatch = useDispatch();
  const [text, setText] = useState(state_text);
  const [style, setStyle] = useState(state_style);
  const [text_prev, setText_prev] = useState(state_text);
  const [style_prev, setStyle_prev] = useState(state_style);

  const resizeAndSetText = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const el = e.target;
      const h = getAndSetHeight(el);
      const t = el.value;
      if (text !== t) {
        setText(t);
      }
      if (h !== style.height) {
        setStyle(
          produce(style, (draft) => {
            draft.height = h;
          }),
        );
      }
    },
    [text, setText, style, setStyle],
  );

  const dispatchResizeAndDoSave = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const el = e.target;
      const h = getAndSetHeight(el);
      dispatch({
        type: "resizeTextArea",
        k: props.k,
        width: el.style.width,
        height: h,
      });
      dispatch({ type: "setText", k: props.k, text: el.value });
      dispatch(doPushHistory());
      dispatch(doSave());
    },
    [dispatch, props.k],
  );

  if (state_text !== text_prev) {
    setText(state_text);
    setText_prev(state_text);
  }
  if (state_style !== style_prev) {
    setStyle(state_style);
    setStyle_prev(state_style);
  }

  return (
    <textarea
      value={text}
      onChange={resizeAndSetText}
      onBlur={dispatchResizeAndDoSave}
      className={status}
      style={style}
      ref={textAreaRefOf(props.k)}
    />
  );
};

const getAndSetHeight = (el: HTMLTextAreaElement) => {
  el.style.height = "1px";
  const h = String(el.scrollHeight) + "px";
  el.style.height = h;
  return h;
};

const LastRangeOf = memoize1((k: string) => <LastRange k={k} />);

const LastRange = (props: { k: string }) => {
  const status = useSelector((state) => state.data.kvs[props.k].status);
  const lastRangeValue = useSelector((state) => {
    const v = state.data.kvs[props.k];
    const lastRange = lastRangeOf(v.ranges);
    return lastRange !== null && lastRange.end !== null && v.parent !== null
      ? (lastRange.end - lastRange.start) / 3600
      : null;
  });
  const dispatch = useDispatch();
  return lastRangeValue === null ? null : (
    <input
      type="number"
      step="any"
      value={lastRangeValue}
      onChange={setLastRangeOf(dispatch, props.k)}
      className={status}
    />
  );
};

const store = createStore(
  root_reducer,
  applyMiddleware(thunk as ThunkMiddleware<IState, TActions>),
);

const useDispatch = () => _useDispatch<typeof store.dispatch>();
const useSelector: TypedUseSelectorHook<ReturnType<
  typeof store.getState
>> = _useSelector;

export const main = () => {
  ReactDOM.render(
    <Provider store={store}>
      <App />
    </Provider>,
    document.getElementById("root"),
  );
  store.dispatch(doLoad());
};
