import React, { useCallback, useState } from "react";
import ReactDOM from "react-dom";
import {
  Provider,
  TypedUseSelectorHook,
  useDispatch as _useDispatch,
  useSelector as _useSelector,
} from "react-redux";
import { Middleware } from "redux";
import {
  configureStore,
  createAction,
  createAsyncThunk,
  createReducer,
  createSelector,
} from "@reduxjs/toolkit";
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

type AnyPayloadAction =
  | {
      readonly type: string;
    }
  | {
      readonly type: string;
      readonly payload: any;
    };

type TStatus = "done" | "dont" | "todo";

interface IListProps {
  readonly node_id_list: string[];
}

interface IState {
  readonly data: IData;
  readonly caches: ICaches;

  readonly saveSuccess: boolean;
}

interface IData {
  readonly current_entry: null | string;
  readonly root: string;
  readonly kvs: IKvs;
  readonly queue: string[];
  readonly showTodoOnly: boolean;
  readonly version: number;
}

interface IKvs {
  readonly [k: string]: IEntry;
}

interface IEntry {
  readonly done: string[];
  readonly dont: string[];
  readonly end_time: null | string;
  readonly estimate: number;
  readonly parents: string[];
  readonly ranges: IRange[];
  readonly show_children: boolean;
  readonly show_detail: boolean;
  readonly start_time: string;
  readonly status: TStatus;
  readonly style: IStyle;
  readonly text: string;
  readonly todo: string[];
}

interface IStyle {
  readonly height: string;
  readonly width: string;
}

interface IRange {
  readonly start: number;
  end: null | number;
}

interface ICaches {
  [k: string]: ICache;
}

interface ICache {
  readonly total_time_spent: number;
  readonly percentiles: number[];
}

const history_type_set = new Set<string>();
const register_history_type = <T extends {}>(x: T) => {
  history_type_set.add(x.toString());
  return x;
};

const save_type_set = new Set<string>();
const register_save_type = <T extends {}>(x: T) => {
  save_type_set.add(x.toString());
  return x;
};

class History<T> {
  capacity: number;
  i: number;
  buf: T[];
  constructor(init: T) {
    this.capacity = 1;
    this.i = 0;
    this.buf = [init];
  }

  value = () => this.buf[this.i];

  push = (v: T) => {
    if (this.buf[this.i] === v) {
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

const _rmFromTodo = (draft: Draft<IState>, node_id: string) => {
  if (draft.data.current_entry === node_id) {
    _stop(draft);
  }
  for (const parent of draft.data.kvs[node_id].parents) {
    deleteAtVal(draft.data.kvs[parent].todo, node_id);
  }
};

const emptyStateOf = (): IState => {
  const root = "root";
  const kvs = {
    root: newEntryValueOf([], root),
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

const newEntryValueOf = (parents: string[], start_time: string) => {
  return {
    done: [] as string[],
    dont: [] as string[],
    end_time: null,
    estimate: NO_ESTIMATION,
    parents,
    ranges: [] as IRange[],
    show_children: false,
    show_detail: false,
    start_time,
    status: "todo" as TStatus,
    style: { width: "49ex", height: "3ex" },
    text: "",
    todo: [] as string[],
  };
};

const doLoad = createAsyncThunk("doLoad", async () => {
  const resp = await fetch("api/" + API_VERSION + "/get");
  const data: null | IData = await resp.json();
  if (data === null) {
    return null;
  }
  const caches: ICaches = {};
  for (const k of Object.keys(data.kvs)) {
    setCache(caches, k, data.kvs);
  }
  return {
    data,
    caches,
    saveSuccess: true,
  };
});

const eval_ = register_history_type(createAction<string>("eval_"));
const delete_ = register_save_type(
  register_history_type(createAction<string>("delete_")),
);
const new_ = register_save_type(
  register_history_type(createAction<string>("new_")),
);
const setSaveSuccess = createAction<boolean>("setSaveSuccess");
const flipShowTodoOnly = register_save_type(
  register_history_type(createAction("flipShowTodoOnly")),
);
const flipShowDetail = register_save_type(
  register_history_type(createAction<string>("flipShowDetail")),
);
const start = register_save_type(
  register_history_type(createAction<string>("start")),
);
const top = register_save_type(
  register_history_type(createAction<string>("top")),
);
const smallestToTop = register_save_type(
  register_history_type(createAction("smallestToTop")),
);
const closestToTop = register_save_type(
  register_history_type(createAction("closestToTop")),
);
const stop = register_save_type(register_history_type(createAction("stop")));
const moveUp_ = register_save_type(
  register_history_type(createAction<string>("moveUp_")),
);
const moveDown_ = register_save_type(
  register_history_type(createAction<string>("moveDown_")),
);
const unindent = register_save_type(
  register_history_type(createAction<string>("unindent")),
);
const indent = register_save_type(
  register_history_type(createAction<string>("indent")),
);
const setEstimate = register_save_type(
  register_history_type(
    createAction<{
      k: string;
      estimate: number;
    }>("setEstimate"),
  ),
);
const setLastRange_ = register_save_type(
  register_history_type(
    createAction<{
      k: string;
      t: number;
    }>("setLastRange_"),
  ),
);
const setTextAndResizeTextArea = register_save_type(
  register_history_type(
    createAction<{
      k: string;
      text: string;
      width: null | string;
      height: null | string;
    }>("setTextAndResizeTextArea"),
  ),
);
const todoToDone = register_save_type(
  register_history_type(createAction<string>("todoToDone")),
);
const todoToDont = register_save_type(
  register_history_type(createAction<string>("todoToDont")),
);
const doneToTodo = register_save_type(
  register_history_type(createAction<string>("doneToTodo")),
);
const dontToTodo = register_save_type(
  register_history_type(createAction<string>("dontToTodo")),
);
const swap_show_children = register_save_type(
  register_history_type(createAction<string>("swap_show_children")),
);
const show_path_to_selected_node = register_save_type(
  register_history_type(createAction<string>("show_path_to_selected_node")),
);

const rootReducer = createReducer(emptyStateOf(), (builder) => {
  const ac = builder.addCase;
  ac(eval_, (state, action) => {
    const k = action.payload;
    _eval_(state, k);
  });
  ac(delete_, (state, action) => {
    const k = action.payload;
    if (state.data.kvs[k].todo.length === 0) {
      _rmTodoEntry(state, k);
      deleteAtVal(state.data.queue, k);
      delete state.data.kvs[k];
      delete state.caches[k];
      if (state.data.current_entry === k) {
        state.data.current_entry = null;
      }
    }
  });
  ac(new_, (state, action) => {
    const parent = action.payload;
    if (!state.data.kvs[parent].show_children) {
      state.data.kvs[parent].show_children = true;
    }
    const knode_id = new Date().toISOString();
    const v = newEntryValueOf([parent], knode_id);
    state.data.kvs[knode_id] = v;
    state.data.kvs[parent].todo.unshift(knode_id);
    state.data.queue.push(knode_id);
    setCache(state.caches, knode_id, state.data.kvs);
  });
  ac(setSaveSuccess, (state, action) => {
    state.saveSuccess = action.payload;
  });
  // todo: Handle doLoad.rejected.
  ac(doLoad.fulfilled, (state, action) => {
    if (action.payload !== null) {
      state = action.payload;
    }
    return state;
  });
  ac(flipShowTodoOnly, (state, action) => {
    state.data.showTodoOnly = !state.data.showTodoOnly;
  });
  ac(flipShowDetail, (state, action) => {
    const k = action.payload;
    state.data.kvs[k].show_detail = !state.data.kvs[k].show_detail;
  });
  ac(start, (state, action) => {
    const k = action.payload;
    if (k !== state.data.current_entry) {
      switch (state.data.kvs[k].status) {
        case "done":
          _doneToTodo(state, k);
          break;
        case "dont":
          _dontToTodo(state, k);
          break;
      }
      _top(state, k);
      assert(() => [state.data.kvs[k].status === "todo", "Must not happen"]);
      _stop(state);
      state.data.current_entry = k;
      state.data.kvs[k].ranges.push({
        start: Number(new Date()) / 1000,
        end: null,
      });
      _show_path_to_selected_node(state, k);
    }
  });
  ac(top, (state, action) => {
    _top(state, action.payload);
  });
  ac(smallestToTop, (state, action) => {
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
    if (k_min !== null) {
      _top(state, k_min);
    }
  });
  ac(closestToTop, (state, action) => {
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
          if (!v.parents.length) {
            break;
          }
          k = v.parents[0];
          v = state.data.kvs[k];
        }
      }
    }
    if (k_min !== null) {
      _top(
        state,
        leafs(state.data.kvs[k_min], state.data.kvs)[Symbol.iterator]().next()
          .value.start_time,
      );
    }
  });
  ac(stop, (state, action) => {
    _stop(state);
  });
  ac(moveUp_, (state, action) => {
    const k = action.payload;
    for (const parent of state.data.kvs[k].parents) {
      moveUp(state.data.kvs[parent].todo, k);
    }
    moveUp(state.data.queue, k);
  });
  ac(moveDown_, (state, action) => {
    const k = action.payload;
    for (const parent of state.data.kvs[k].parents) {
      moveDown(state.data.kvs[parent].todo, k);
    }
    moveDown(state.data.queue, k);
  });
  ac(unindent, (state, action) => {
    const k = action.payload;
    if (state.data.kvs[k].parents.length) {
      const pk = state.data.kvs[k].parents[0];
      if (state.data.kvs[pk].parents.length) {
        const ppk = state.data.kvs[pk].parents[0];
        const _total_time_spent_pk_orig = state.caches[pk].total_time_spent;
        const _total_time_spent_ppk_orig = state.caches[ppk].total_time_spent;
        _rmTodoEntry(state, k);
        const entries = state.data.kvs[ppk].todo;
        const i = entries.indexOf(pk);
        assert(() => [i !== -1, "Must not happen."]);
        _addTodoEntry(state, ppk, i, k);
        assertIsApprox(() => [
          _total_time_spent_pk_orig - state.caches[pk].total_time_spent,
          state.caches[k].total_time_spent,
        ]);
        if (_total_time_spent_ppk_orig !== null) {
          assertIsApprox(() => [
            _total_time_spent_ppk_orig,
            state.caches[ppk].total_time_spent,
          ]);
        }
      }
    }
  });
  ac(indent, (state, action) => {
    const k = action.payload;
    if (state.data.kvs[k].parents.length) {
      const pk = state.data.kvs[k].parents[0];
      const entries = state.data.kvs[pk].todo;
      if (last(entries) !== k) {
        const i = entries.indexOf(k);
        const new_pk = entries[i + 1];
        const total_time_spent_new_pk_orig =
          state.caches[new_pk].total_time_spent;
        const total_time_spent_k = state.caches[k].total_time_spent;
        _rmTodoEntry(state, k);
        _addTodoEntry(state, new_pk, 0, k);
        assertIsApprox(() => [
          state.caches[new_pk].total_time_spent,
          total_time_spent_new_pk_orig + total_time_spent_k,
        ]);
      }
    }
  });
  ac(setEstimate, (state, action) => {
    const k = action.payload.k;
    const estimate = action.payload.estimate;
    if (state.data.kvs[k].estimate !== estimate) {
      state.data.kvs[k].estimate = estimate;
    }
  });
  ac(setLastRange_, (state, action) => {
    const k = action.payload.k;
    const t = action.payload.t;
    const l = lastRangeOf(state.data.kvs[k].ranges);
    if (l !== null && l.end) {
      const t1 = l.end - l.start;
      const t2 = t * 3600;
      const dt = t2 - t1;
      if (dt !== 0) {
        l.end = l.start + t2;
        _addDt(state, k, dt);
      }
    }
  });
  ac(setTextAndResizeTextArea, (state, action) => {
    const k = action.payload.k;
    const text = action.payload.text;
    const width = action.payload.width;
    const height = action.payload.height;
    const v = state.data.kvs[k];
    v.text = text;
    if (width !== null && height !== null) {
      // if (v.style.width !== width) {
      //   v.style.width = width;
      // }
      if (v.style.height !== height) {
        v.style.height = height;
      }
    }
  });
  ac(todoToDone, (state, action) => {
    const k = action.payload;
    _rmFromTodo(state, k);
    _addToDone(state, k);
    _topQueue(state, k);
  });
  ac(todoToDont, (state, action) => {
    const k = action.payload;
    _rmFromTodo(state, k);
    _addToDont(state, k);
    _topQueue(state, k);
  });
  ac(doneToTodo, (state, action) => {
    const k = action.payload;
    _doneToTodo(state, k);
  });
  ac(dontToTodo, (state, action) => {
    const k = action.payload;
    _dontToTodo(state, k);
  });
  ac(swap_show_children, (state, action) => {
    state.data.kvs[action.payload].show_children =
      !state.data.kvs[action.payload].show_children;
  });
  ac(show_path_to_selected_node, (state, action) => {
    _show_path_to_selected_node(state, action.payload);
  });
});

const App = () => {
  const root = useSelector((state) => state.data.root);
  return (
    <div id="columns">
      <Menu />
      <QueueColumn />
      <div id="tree">{TreeNodeOf(root)}</div>
    </div>
  );
};

const Menu = () => {
  const saveSuccess = useSelector((state) => state.saveSuccess);
  const root = useSelector((state) => state.data.root);
  const dispatch = useDispatch();
  const _undo = useCallback(() => {
    dispatch({ type: "undo" });
  }, [dispatch]);
  const _redo = useCallback(() => {
    dispatch({ type: "redo" });
  }, [dispatch]);
  const _flipShowTodoOnly = useCallback(() => {
    dispatch(flipShowTodoOnly());
  }, [dispatch]);
  const _smallestToTop = useCallback(() => {
    dispatch(smallestToTop());
  }, [dispatch]);
  const _closestToTop = useCallback(() => {
    dispatch(closestToTop());
  }, [dispatch]);
  const _load = useCallback(() => {
    dispatch(doLoad());
  }, [dispatch]);

  return (
    <div className="menu">
      {saveSuccess ? null : <p>Failed to save.</p>}
      <div>
        {stopButtonOf(dispatch, root)}
        {newButtonOf(dispatch, root)}
        <button onClick={_undo}>{UNDO_MARK}</button>
        <button onClick={_redo}>{REDO_MARK}</button>
        <button onClick={_flipShowTodoOnly}>👀</button>
        <button onClick={_smallestToTop}>Small</button>
        <button onClick={_closestToTop}>Due</button>
        <button onClick={_load}>⟳</button>
      </div>
    </div>
  );
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

const setLastRange = (dispatch: AppDispatch, k: string, t: number) => {
  dispatch(
    setLastRange_({
      k,
      t,
    }),
  );
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
  while (v.parents.length) {
    ret.push(v.start_time);
    v = kvs[v.parents[0]];
  }
  return ret;
};

const _rmTodoEntry = (draft: Draft<IState>, k: string) => {
  if (draft.data.kvs[k].parents.length) {
    const pk = draft.data.kvs[k].parents[0];
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
    draft.data.kvs[k].parents[0] = pk;
    draft.data.kvs[pk].todo.splice(i, 0, k);
    _addDt(draft, pk, draft.caches[k].total_time_spent);
  }
};

const _top = (draft: Draft<IState>, k: string) => {
  _topTree(draft, k);
  _topQueue(draft, k);
};

const _topTree = (draft: Draft<IState>, node_id: string) => {
  for (const parent of draft.data.kvs[node_id].parents) {
    toFront(draft.data.kvs[parent].todo, node_id);
    _topTree(draft, parent);
  }
};

const _addDt = (draft: Draft<IState>, k: null | string, dt: number) => {
  while (k) {
    draft.caches[k].total_time_spent += dt;
    k = draft.data.kvs[k].parents.length ? draft.data.kvs[k].parents[0] : null;
  }
};

const _topQueue = (draft: Draft<IState>, k: string) => {
  toFront(draft.data.queue, k);
};

const _doneToTodo = (draft: Draft<IState>, k: string) => {
  _rmFromDone(draft, k);
  _addToTodo(draft, k);
  if (draft.data.kvs[k].parents.length) {
    const pk = draft.data.kvs[k].parents[0];
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
  if (draft.data.kvs[k].parents.length) {
    const pk = draft.data.kvs[k].parents[0];
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
  for (const parent of draft.data.kvs[k].parents) {
    deleteAtVal(draft.data.kvs[parent].done, k);
  }
};

const _rmFromDont = (draft: Draft<IState>, k: string) => {
  for (const parent of draft.data.kvs[k].parents) {
    deleteAtVal(draft.data.kvs[parent].dont, k);
  }
};

const _addToTodo = (draft: Draft<IState>, k: string) => {
  draft.data.kvs[k].status = "todo";
  for (const parent of draft.data.kvs[k].parents) {
    draft.data.kvs[parent].todo.unshift(k);
  }
};

const _addToDone = (draft: Draft<IState>, k: string) => {
  draft.data.kvs[k].status = "done";
  draft.data.kvs[k].end_time = new Date().toISOString();
  for (const parent of draft.data.kvs[k].parents) {
    draft.data.kvs[parent].done.unshift(k);
  }
};

const _addToDont = (draft: Draft<IState>, k: string) => {
  draft.data.kvs[k].status = "dont";
  draft.data.kvs[k].end_time = new Date().toISOString();
  for (const parent of draft.data.kvs[k].parents) {
    draft.data.kvs[parent].dont.unshift(k);
  }
};

const _show_path_to_selected_node = (draft: Draft<IState>, node_id: string) => {
  while (draft.data.kvs[node_id].parents.length) {
    node_id = draft.data.kvs[node_id].parents[0];
    if (!draft.data.kvs[node_id].show_children) {
      draft.data.kvs[node_id].show_children = true;
    }
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

const QueueColumn = () => {
  const queue = useSelector((state) => state.data.queue);
  return (
    <div id="queue">
      {queue.length ? <ol>{queue.map(QueueNodeOf)}</ol> : null}
    </div>
  );
};

const TreeNodeList = React.memo((props: IListProps) => {
  return props.node_id_list.length ? (
    <ol>
      {props.node_id_list.map((node_id) => {
        return <li key={node_id}>{TreeNodeOf(node_id)}</li>;
      })}
    </ol>
  ) : null;
});

const TreeNode = (props: { node_id: string }) => {
  const todo = useSelector((state) => state.data.kvs[props.node_id].todo);
  const done = useSelector((state) => state.data.kvs[props.node_id].done);
  const dont = useSelector((state) => state.data.kvs[props.node_id].dont);
  const show_children = useSelector(
    (state) => state.data.kvs[props.node_id].show_children,
  );
  const showTodoOnly = useSelector((state) => state.data.showTodoOnly);

  return (
    <>
      <div id={`tree${props.node_id}`}>{EntryOf(props.node_id)}</div>
      {show_children ? (
        <>
          <TreeNodeList node_id_list={todo} />
          {showTodoOnly ? null : (
            <>
              <TreeNodeList node_id_list={done} />
              <TreeNodeList node_id_list={dont} />
            </>
          )}
        </>
      ) : null}
    </>
  );
};
const TreeNodeOf = (node_id: string) => {
  return <TreeNode node_id={node_id} />;
};

const QueueNode = (props: { node_id: string }) => {
  const shouldHide = useSelector(
    (state) =>
      state.data.showTodoOnly &&
      state.data.kvs[props.node_id].status !== "todo",
  );
  return shouldHide ? null : (
    <li id={`queue${props.node_id}`}>
      {toTreeButtonOf(props.node_id)}
      {EntryOf(props.node_id)}
    </li>
  );
};
const QueueNodeOf = memoize1((node_id: string) => {
  return <QueueNode node_id={node_id} key={node_id} />;
});

const Entry = (props: { node_id: string }) => {
  const status = useSelector((state) => state.data.kvs[props.node_id].status);
  const has_parent = useSelector(
    (state) => !!state.data.kvs[props.node_id].parents.length,
  );
  const show_detail = useSelector(
    (state) => state.data.kvs[props.node_id].show_detail,
  );
  const cache = useSelector((state) => state.caches[props.node_id]);
  const running = useSelector(
    (state) => props.node_id === state.data.current_entry,
  );
  const noTodo = useSelector(
    (state) => state.data.kvs[props.node_id].todo.length === 0,
  );
  const has_children = useSelector((state) => {
    const v = state.data.kvs[props.node_id];
    return 0 < v.todo.length || 0 < v.done.length || 0 < v.dont.length;
  });
  const show_children = useSelector((state) => {
    return state.data.kvs[props.node_id].show_children;
  });

  const dispatch = useDispatch();
  return (
    <div
      className={
        status +
        (running
          ? " running"
          : has_children && !show_children
          ? " non-leaf"
          : "")
      }
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) {
          dispatch(swap_show_children(props.node_id));
        }
      }}
      style={{ display: "inline-block" }}
    >
      {has_parent ? (
        <>
          {status === "todo"
            ? newButtonOf(dispatch, props.node_id)
            : status === "done"
            ? doneToTodoButtonOf(dispatch, props.node_id)
            : dontToTodoButtonOf(dispatch, props.node_id)}
          <TextArea k={props.node_id} />
          {EstimationInputOf(props.node_id)}
          {running
            ? stopButtonOf(dispatch, props.node_id)
            : startButtonOf(dispatch, props.node_id)}
        </>
      ) : null}
      {digits1(cache.total_time_spent / 3600)}
      {has_parent && status === "todo"
        ? topButtonOf(dispatch, props.node_id)
        : null}
      {status === "todo" ? evalButtonOf(dispatch, props.node_id) : null}
      {has_parent ? (
        <>
          {noTodo && status === "todo" ? (
            <>
              {todoToDoneButtonOf(dispatch, props.node_id)}
              {todoToDontButtonOf(dispatch, props.node_id)}
            </>
          ) : null}
          {LastRangeOf(props.node_id)}
          {showDetailButtonOf(dispatch, props.node_id)}
          {show_detail ? (
            status === "todo" ? (
              <>
                {moveUpButtonOf(dispatch, props.node_id)}
                {moveDownButtonOf(dispatch, props.node_id)}
                {unindentButtonOf(dispatch, props.node_id)}
                {indentButtonOf(dispatch, props.node_id)}
                {has_children ? null : deleteButtonOf(dispatch, props.node_id)}
              </>
            ) : null
          ) : null}
        </>
      ) : null}
      {status === "todo" ? cache.percentiles.map(digits1).join(" ") : null}
    </div>
  );
};
const EntryOf = memoize1((node_id: string) => {
  return <Entry node_id={node_id} key={node_id} />;
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
  assert(() => [false, "Must not happen."]);
  return 0;
}

const isApprox = (x: number, y: number) => {
  const atol = 1e-7;
  const rtol = 1e-4;
  return (
    Math.abs(y - x) <= Math.max(atol, rtol * Math.max(Math.abs(x), Math.abs(y)))
  );
};

const assertIsApprox = (fn: () => [number, number]) => {
  assert(() => {
    const [actual, expected] = fn();
    return [isApprox(actual, expected), actual + " ≉ " + expected];
  });
};

const assert = (fn: () => [boolean, string]) => {
  if ("production" !== process.env.NODE_ENV) {
    const [v, msg] = fn();
    if (!v) {
      throw new Error(msg);
    }
  }
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

const toTreeButtonOf = memoize1((node_id: string) => {
  const dispatch = useDispatch();
  return (
    <a
      href={`#tree${node_id}`}
      onClick={() => {
        dispatch(show_path_to_selected_node(node_id));
      }}
    >
      <button>→</button>
    </a>
  );
});

const doneToTodoButtonOf = memoize2((dispatch: AppDispatch, k: string) => (
  <button
    className="done"
    onClick={() => {
      dispatch(doneToTodo(k));
    }}
  >
    {DONE_MARK}
  </button>
));

const dontToTodoButtonOf = memoize2((dispatch: AppDispatch, k: string) => (
  <button
    className="dont"
    onClick={() => {
      dispatch(dontToTodo(k));
    }}
  >
    {DONT_MARK}
  </button>
));

const newButtonOf = memoize2((dispatch: AppDispatch, k: string) => {
  const _focusTextAreaOfTheFirsttodo = (
    dispatch: AppDispatch,
    getState: () => IState,
  ) => {
    dispatch(doFocusTextArea(getState().data.kvs[k].todo[0]));
  };
  return (
    <button
      onClick={() => {
        dispatch(new_(k));
        dispatch(_focusTextAreaOfTheFirsttodo);
      }}
    >
      {NEW_MARK}
    </button>
  );
});

const stopButtonOf = memoize2((dispatch: AppDispatch, k: string) => (
  <button
    onClick={() => {
      dispatch(stop());
    }}
    ref={stopButtonRefOf(k)}
  >
    {STOP_MARK}
  </button>
));

const startButtonOf = memoize2((dispatch: AppDispatch, k: string) => (
  <button
    onClick={() => {
      dispatch(start(k));
      dispatch(doFocusStopButton(k));
    }}
  >
    {START_MARK}
  </button>
));

const topButtonOf = memoize2((dispatch: AppDispatch, k: string) => (
  <button
    onClick={() => {
      dispatch(top(k));
    }}
  >
    {TOP_MARK}
  </button>
));

const moveUpButtonOf = memoize2((dispatch: AppDispatch, k: string) => (
  <button
    onClick={() => {
      dispatch(moveUp_(k));
      dispatch(doFocusMoveUpButton(k));
    }}
    ref={moveUpButtonRefOf(k)}
  >
    {MOVE_UP_MARK}
  </button>
));

const moveDownButtonOf = memoize2((dispatch: AppDispatch, k: string) => (
  <button
    onClick={() => {
      dispatch(moveDown_(k));
      dispatch(doFocusMoveDownButton(k));
    }}
    ref={moveDownButtonRefOf(k)}
  >
    {MOVE_DOWN_MARK}
  </button>
));

const todoToDoneButtonOf = memoize2((dispatch: AppDispatch, k: string) => (
  <button
    onClick={() => {
      dispatch(todoToDone(k));
    }}
  >
    {DONE_MARK}
  </button>
));

const todoToDontButtonOf = memoize2((dispatch: AppDispatch, k: string) => (
  <button
    onClick={() => {
      dispatch(todoToDont(k));
    }}
  >
    {DONT_MARK}
  </button>
));

const unindentButtonOf = memoize2((dispatch: AppDispatch, k: string) => (
  <button
    onClick={() => {
      dispatch(unindent(k));
      dispatch(doFocusUnindentButton(k));
    }}
    ref={unindentButtonRefOf(k)}
  >
    {UNINDENT_MARK}
  </button>
));

const indentButtonOf = memoize2((dispatch: AppDispatch, k: string) => (
  <button
    onClick={() => {
      dispatch(indent(k));
      dispatch(doFocusIndentButton(k));
    }}
    ref={indentButtonRefOf(k)}
  >
    {INDENT_MARK}
  </button>
));

const showDetailButtonOf = memoize2((dispatch: AppDispatch, k: string) => (
  <button
    onClick={() => {
      dispatch(flipShowDetail(k));
    }}
  >
    {DETAIL_MARK}
  </button>
));

const deleteButtonOf = memoize2((dispatch: AppDispatch, k: string) => (
  <button
    onClick={() => {
      dispatch(delete_(k));
    }}
  >
    {DELETE_MARK}
  </button>
));

const evalButtonOf = memoize2((dispatch: AppDispatch, k: string) => (
  <button
    onClick={() => {
      dispatch(eval_(k));
    }}
  >
    {EVAL_MARK}
  </button>
));

const setEstimateOf = memoize2(
  (dispatch: AppDispatch, k: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        setEstimate({
          k,
          estimate: Number(e.target.value),
        }),
      );
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
  (dispatch: AppDispatch, k: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const dispatchResizeAndSetText = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const el = e.target;
      const h = getAndSetHeight(el);
      dispatch(
        setTextAndResizeTextArea({
          k: props.k,
          text: el.value,
          width: el.style.width,
          height: h,
        }),
      );
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
      onBlur={dispatchResizeAndSetText}
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
    return lastRange !== null && lastRange.end !== null && v.parents.length
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

const undoable = (
  reducer: (state: undefined | IState, action: AnyPayloadAction) => IState,
  noop: AnyPayloadAction,
  pred: (type_: string) => boolean,
) => {
  const init = reducer(undefined, noop);
  const history = new History<IState>(init);
  return (state: undefined | IState, action: AnyPayloadAction) => {
    if (state === undefined) {
      return init;
    }
    switch (action.type) {
      case "undo": {
        const prev = history.undo();
        if (prev !== state) {
          state = prev;
        }
        return state;
      }
      case "redo": {
        const next = history.redo();
        if (next !== state) {
          state = next;
        }
        return state;
      }
      default: {
        const next = reducer(state, action);
        if (pred(action.type)) {
          history.push(next);
        }
        return next;
      }
    }
  };
};
register_save_type("undo");
register_save_type("redo");

const saveStateMiddlewareOf = (pred: (type_: string) => boolean) => {
  const saveStateMiddleware: Middleware<{}, IState> =
    (store) => (next_dispatch) => (action) => {
      const ret = next_dispatch(action);
      if (pred(action.type)) {
        fetch("api/" + API_VERSION + "/post", {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify(store.getState().data),
        }).then((r) => {
          store.dispatch(setSaveSuccess(r.ok));
        });
      }
      return ret;
    };
  return saveStateMiddleware;
};
const saveStateMiddleware = saveStateMiddlewareOf((type_: string) =>
  save_type_set.has(type_),
);

const store = configureStore({
  reducer: undoable(
    rootReducer,
    {
      type: "flipShowTodoOnly",
    },
    (type_: string) => history_type_set.has(type_),
  ),
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }).concat(saveStateMiddleware);
  },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;
const useDispatch = () => _useDispatch<AppDispatch>();
const useSelector: TypedUseSelectorHook<RootState> = _useSelector;

export const main = () => {
  ReactDOM.render(
    <Provider store={store}>
      <App />
    </Provider>,
    document.getElementById("root"),
  );
  store.dispatch(doLoad());
};
