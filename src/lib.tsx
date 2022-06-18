import React, { useCallback, useState } from "react";
import ReactDOM from "react-dom/client";
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
} from "@reduxjs/toolkit";
import produce, { Draft, setAutoFreeze } from "immer";
import memoize from "proxy-memoize";
import "@fontsource/material-icons";

import * as checks from "./checks";
import * as consts from "./consts";
import * as toast from "./toast";
import "./lib.css";
import * as types from "./types";
import * as utils from "./utils";

setAutoFreeze(false);

const MENU_HEIGHT = "4em" as const;
const API_VERSION = "v1";
const NO_ESTIMATION = 0;
const START_MARK = <span className="material-icons">play_arrow</span>;
const ADD_MARK = <span className="material-icons">add</span>;
const STOP_MARK = <span className="material-icons">stop</span>;
const TOP_MARK = <span className="material-icons">arrow_upward</span>;
const MOVE_UP_MARK = <span className="material-icons">north</span>;
const MOVE_DOWN_MARK = <span className="material-icons">south</span>;
const UNINDENT_MARK = <span className="material-icons">north_west</span>;
const INDENT_MARK = <span className="material-icons">south_wast</span>;
const EVAL_MARK = <span className="material-icons">functions</span>;
const DONE_MARK = <span className="material-icons">done</span>; //"✓";
const DONT_MARK = <span className="material-icons">delete</span>;
const DETAIL_MARK = <span className="material-icons">more_vert</span>;
const COPY_MARK = <span className="material-icons">content_copy</span>;

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

const stop = (
  draft: Draft<types.IState>,
  node_id: types.TNodeId,
  t?: number,
) => {
  const last_range = last(draft.data.kvs[node_id].ranges);
  if (last_range && last_range.end === null) {
    last_range.end = t ?? Number(new Date()) / 1000;
    _set_total_time(node_id, draft.data.kvs, draft.caches, draft.data.edges);
  }
};

const stop_all = (draft: Draft<types.IState>) => {
  const t = Number(new Date()) / 1000;
  for (const node_id of draft.data.queue) {
    stop(draft, node_id, t);
  }
};

const new_node_id_of = (state: types.IState) =>
  new_id_of(state) as types.TNodeId;
const new_edge_id_of = (state: types.IState) =>
  new_id_of(state) as types.TEdgeId;
const new_id_of = (state: types.IState) =>
  id_string_of_number((state.data.id_seq += 1));
const id_string_of_number = (x: number) => x.toString(36);

const emptyStateOf = (): types.IState => {
  const id_seq = 0;
  const root = id_string_of_number(id_seq) as types.TNodeId;
  const kvs = {
    [root]: newEntryValueOf([]),
  };
  return {
    data: {
      edges: {},
      root,
      id_seq,
      kvs,
      queue: [],
      showTodoOnly: false,
      version: 12,
    },
    caches: {},
  };
};

const newEntryValueOf = (parents: types.TEdgeId[]) => {
  return {
    children: [] as types.TEdgeId[],
    end_time: null,
    estimate: NO_ESTIMATION,
    parents,
    ranges: [] as types.IRange[],
    show_children: false,
    start_time: new Date().toISOString(),
    status: "todo" as types.TStatus,
    style: { height: "3ex" },
    text: "",
  };
};

const doLoad = createAsyncThunk("doLoad", async () => {
  const resp = await fetch("api/" + API_VERSION + "/get");
  const data: any = await resp.json();
  const record_if_false = types.record_if_false_of();
  if (types.is_IData(data, record_if_false)) {
    return {
      data,
      caches: {},
    };
  } else {
    console.warn(record_if_false.path);
    return null;
  }
});
register_history_type(doLoad.fulfilled);

const eval_ = register_history_type(createAction<types.TNodeId>("eval_"));
const delete_action = register_save_type(
  register_history_type(createAction<types.TNodeId>("delete_action")),
);
const delete_edge_action = register_save_type(
  register_history_type(createAction<types.TEdgeId>("delete_edge_action")),
);
const new_ = register_save_type(
  register_history_type(createAction<types.TNodeId>("new_")),
);
const flipShowTodoOnly = register_save_type(
  register_history_type(createAction("flipShowTodoOnly")),
);
const flipShowDetail = createAction<types.TNodeId>("flipShowDetail");
const start_action = register_save_type(
  register_history_type(createAction<types.TNodeId>("start_action")),
);
const top = register_save_type(
  register_history_type(createAction<types.TNodeId>("top")),
);
const smallestToTop = register_save_type(
  register_history_type(createAction("smallestToTop")),
);
const closestToTop = register_save_type(
  register_history_type(createAction("closestToTop")),
);
const set_total_time = register_history_type(
  createAction<types.TNodeId>("set_total_time"),
);
const stop_action = register_save_type(
  register_history_type(createAction<types.TNodeId>("stop_action")),
);
const stop_all_action = register_save_type(
  register_history_type(createAction("stop_all_action")),
);
const moveUp_ = register_save_type(
  register_history_type(createAction<types.TNodeId>("moveUp_")),
);
const moveDown_ = register_save_type(
  register_history_type(createAction<types.TNodeId>("moveDown_")),
);
const unindent = register_save_type(
  register_history_type(createAction<types.TNodeId>("unindent")),
);
const indent = register_save_type(
  register_history_type(createAction<types.TNodeId>("indent")),
);
const setEstimate = register_save_type(
  register_history_type(
    createAction<{
      k: types.TNodeId;
      estimate: number;
    }>("setEstimate"),
  ),
);
const setLastRange_ = register_save_type(
  register_history_type(
    createAction<{
      k: types.TNodeId;
      t: number;
    }>("setLastRange_"),
  ),
);
const setTextAndResizeTextArea = register_save_type(
  register_history_type(
    createAction<{
      k: types.TNodeId;
      text: string;
      height: null | string;
    }>("setTextAndResizeTextArea"),
  ),
);
const todoToDone = register_save_type(
  register_history_type(createAction<types.TNodeId>("todoToDone")),
);
const todoToDont = register_save_type(
  register_history_type(createAction<types.TNodeId>("todoToDont")),
);
const doneToTodo = register_save_type(
  register_history_type(createAction<types.TNodeId>("doneToTodo")),
);
const dontToTodo = register_save_type(
  register_history_type(createAction<types.TNodeId>("dontToTodo")),
);
const swap_show_children = register_save_type(
  register_history_type(createAction<types.TNodeId>("swap_show_children")),
);
const show_path_to_selected_node = register_save_type(
  register_history_type(
    createAction<types.TNodeId>("show_path_to_selected_node"),
  ),
);
const set_edge_type_action = register_save_type(
  register_history_type(
    createAction<{ edge_id: types.TEdgeId; edge_type: types.TEdgeType }>(
      "set_edge_type_action",
    ),
  ),
);
const add_edges_action = register_save_type(
  register_history_type(createAction<types.IEdge[]>("add_edges_action")),
);

const rootReducer = createReducer(emptyStateOf(), (builder) => {
  const ac = builder.addCase;
  ac(eval_, (state, action) => {
    const k = action.payload;
    _eval_(state, k);
  });
  ac(delete_action, (state, action) => {
    const k = action.payload;
    if (
      state.data.kvs[k].children.filter((edge_id) => {
        const edge = state.data.edges[edge_id];
        if (edge.t !== "strong") {
          return false;
        }
        let n_strong_parents = 0;
        for (const p of state.data.kvs[edge.c].parents) {
          if (state.data.edges[p].t === "strong") {
            n_strong_parents += 1;
          }
        }
        return n_strong_parents <= 1;
      }).length === 0
    ) {
      _remove_child_edges_of_parents(state, k);
      deleteAtVal(state.data.queue, k);
      for (const p of state.data.kvs[k].parents) {
        delete state.data.edges[p];
      }
      delete state.data.kvs[k];
      delete state.caches[k];
    }
  });
  ac(delete_edge_action, (state, action) => {
    const edge_id = action.payload;
    if (checks.is_deletable_edge(edge_id, state)) {
      const edge = state.data.edges[edge_id];
      deleteAtVal(state.data.kvs[edge.p].children, edge_id);
      deleteAtVal(state.data.kvs[edge.c].parents, edge_id);
      delete state.data.edges[edge_id];
    } else {
      toast.add(
        "error",
        `Edge ${state.data.edges[edge_id]} cannot be deleted.`,
      );
    }
  });
  ac(new_, (state, action) => {
    const parent = action.payload;
    if (!state.data.kvs[parent].show_children) {
      state.data.kvs[parent].show_children = true;
    }
    const node_id = new_node_id_of(state);
    const edge_id = new_edge_id_of(state);
    const v = newEntryValueOf([edge_id]);
    const edge = { p: parent, c: node_id, t: "strong" as const };
    state.data.kvs[node_id] = v;
    state.data.edges[edge_id] = edge;
    state.data.kvs[parent].children.unshift(edge_id);
    state.data.queue.push(node_id);
  });
  // todo: Handle doLoad.rejected.
  ac(doLoad.fulfilled, (state, action) => {
    if (action.payload !== null) {
      state = action.payload;
    }
    return state;
  });
  ac(flipShowTodoOnly, (state) => {
    state.data.showTodoOnly = !state.data.showTodoOnly;
  });
  ac(flipShowDetail, (state, action) => {
    const k = action.payload;
    types.cache_of(state.caches, k).show_detail = !types.cache_of(
      state.caches,
      k,
    ).show_detail;
  });
  ac(start_action, (state, action) => {
    const node_id = action.payload;
    const last_range = last(state.data.kvs[node_id].ranges);
    if (!last_range || last_range.end !== null) {
      switch (state.data.kvs[node_id].status) {
        case "done":
          _doneToTodo(state, node_id);
          break;
        case "dont":
          _dontToTodo(state, node_id);
          break;
      }
      _top(state, node_id);
      assert(() => [
        state.data.kvs[node_id].status === "todo",
        "Must not happen",
      ]);
      stop_all(state);
      state.data.kvs[node_id].ranges.push({
        start: Number(new Date()) / 1000,
        end: null,
      });
      _show_path_to_selected_node(state, node_id);
    }
  });
  ac(top, (state, action) => {
    _top(state, action.payload);
  });
  ac(smallestToTop, (state) => {
    let k_min = null;
    let estimate_min = Infinity;
    for (const k of Object.keys(state.data.kvs) as types.TNodeId[]) {
      const v = state.data.kvs[k];
      if (
        v.status === "todo" &&
        v.children.filter(
          (edge_id) =>
            state.data.kvs[state.data.edges[edge_id].c].status === "todo",
        ).length <= 0 &&
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
  ac(closestToTop, (state) => {
    let k_min = null;
    let due_min = ":due: 9999-12-31T23:59:59";
    for (let k of Object.keys(state.data.kvs) as types.TNodeId[]) {
      let v = state.data.kvs[k];
      if (
        v.status === "todo" &&
        v.children.filter(
          (edge_id) =>
            state.data.kvs[state.data.edges[edge_id].c].status === "todo",
        ).length <= 0
      ) {
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
          k = state.data.edges[v.parents[0]].p;
          v = state.data.kvs[k];
        }
      }
    }
    if (k_min !== null) {
      _top(
        state,
        leafs(k_min, state.data.kvs, state.data.edges)[Symbol.iterator]().next()
          .value[0],
      );
    }
  });
  ac(set_total_time, (state, action) => {
    _set_total_time(
      action.payload,
      state.data.kvs,
      state.caches,
      state.data.edges,
    );
  });
  ac(stop_action, (state, action) => {
    stop(state, action.payload);
  });
  ac(stop_all_action, (state) => {
    stop_all(state);
  });
  ac(moveUp_, (state, action) => {
    const k = action.payload;
    for (const edge_id of state.data.kvs[k].parents) {
      moveUp(state.data.kvs[state.data.edges[edge_id].p].children, edge_id);
    }
    moveUp(state.data.queue, k);
  });
  ac(moveDown_, (state, action) => {
    const k = action.payload;
    for (const edge_id of state.data.kvs[k].parents) {
      moveDown(state.data.kvs[state.data.edges[edge_id].p].children, edge_id);
    }
    moveDown(state.data.queue, k);
  });
  ac(unindent, (state, action) => {
    const k = action.payload;
    if (state.data.kvs[k].parents.length) {
      const edge_id = state.data.kvs[k].parents[0];
      const pk = state.data.edges[edge_id].p;
      if (state.data.kvs[pk].parents.length) {
        const ppk = state.data.edges[state.data.kvs[pk].parents[0]].p;
        _remove_child_edges_of_parents(state, k);
        const i = state.data.kvs[ppk].children.indexOf(edge_id);
        assert(() => [i !== -1, "Must not happen."]);
        _addTodoEntry(state, ppk, i, state.data.kvs[k].parents[0]);
      }
    }
  });
  ac(indent, (state, action) => {
    const k = action.payload;
    if (state.data.kvs[k].parents.length) {
      const pk = state.data.edges[state.data.kvs[k].parents[0]].p;
      const edge_id = last(state.data.kvs[pk].children);
      if (state.data.edges[edge_id].c !== k) {
        const i = state.data.kvs[pk].children.indexOf(edge_id);
        const new_pk = state.data.edges[state.data.kvs[pk].children[i + 1]].c;
        _remove_child_edges_of_parents(state, k);
        _addTodoEntry(state, new_pk, 0, state.data.kvs[k].parents[0]);
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
      }
    }
  });
  ac(setTextAndResizeTextArea, (state, action) => {
    const k = action.payload.k;
    const text = action.payload.text;
    const height = action.payload.height;
    const v = state.data.kvs[k];
    v.text = text;
    if (height !== null) {
      if (v.style.height !== height) {
        v.style.height = height;
      }
    }
  });
  ac(todoToDone, (state, action) => {
    const k = action.payload;
    stop(state, k);
    _addToDone(state, k);
    _topQueue(state, k);
  });
  ac(todoToDont, (state, action) => {
    const k = action.payload;
    stop(state, k);
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
  ac(set_edge_type_action, (state, action) => {
    if (!checks.is_deletable_edge(action.payload.edge_id, state)) {
      toast.add(
        "error",
        `${action} is not applicable to Edge${
          state.data.edges[action.payload.edge_id]
        }.`,
      );
    }
    state.data.edges[action.payload.edge_id].t = action.payload.edge_type;
  });
  ac(add_edges_action, (state, action) => {
    for (const edge of action.payload) {
      if (edge.p in state.data.kvs && edge.c in state.data.kvs) {
        if (checks.has_edge(edge.p, edge.c, state)) {
          toast.add(
            "error",
            `${JSON.stringify(action)}: Edges for ${JSON.stringify(
              edge,
            )} already exist.`,
          );
        } else {
          const edge_id = new_edge_id_of(state);
          state.data.edges[edge_id] = edge;
          state.data.kvs[edge.c].parents.unshift(edge_id);
          state.data.kvs[edge.p].children.unshift(edge_id);
          if (checks.has_cycle(edge_id, state)) {
            delete state.data.edges[edge_id];
            state.data.kvs[edge.c].parents.splice(0, 1);
            state.data.kvs[edge.p].children.splice(0, 1);
            toast.add(
              "error",
              `${JSON.stringify(action)}: Detected a cycle for ${JSON.stringify(
                edge,
              )}.`,
            );
          } else {
            toast.add("info", `Added a edge ${edge.p} -> ${edge.c}.`);
          }
        }
      } else {
        toast.add(
          "error",
          `${JSON.stringify(action)}: Nodes for ${JSON.stringify(
            edge,
          )} does not exist.`,
        );
      }
    }
  });
});

const App = () => {
  const [node_filter_query_fast, set_node_filter_query_fast] =
    React.useState("");
  const [node_filter_query_slow, set_node_filter_query_slow] =
    React.useState("");
  const [node_ids, set_node_ids] = React.useState("");
  const el = React.useMemo(
    () => (
      <>
        <Menu />
        <Body />
      </>
    ),
    [],
  );
  return (
    <set_node_filter_query_slow_context.Provider
      value={set_node_filter_query_slow}
    >
      <set_node_filter_query_fast_context.Provider
        value={set_node_filter_query_fast}
      >
        <set_node_ids_context.Provider value={set_node_ids}>
          <node_ids_context.Provider value={node_ids}>
            <node_filter_query_slow_context.Provider
              value={node_filter_query_slow}
            >
              <node_filter_query_fast_context.Provider
                value={node_filter_query_fast}
              >
                {el}
                {toast.component}
              </node_filter_query_fast_context.Provider>
            </node_filter_query_slow_context.Provider>
          </node_ids_context.Provider>
        </set_node_ids_context.Provider>
      </set_node_filter_query_fast_context.Provider>
    </set_node_filter_query_slow_context.Provider>
  );
};

const Menu = () => {
  const root = useSelector((state) => state.data.root);
  const dispatch = useDispatch();
  const stop_all = useCallback(() => dispatch(stop_all_action()), [dispatch]);
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
    <div
      className={`flex items-center fixed z-[999999] pl-[1em] gap-x-[0.25em] w-full top-0  bg-gray-200 dark:bg-gray-900`}
      style={{ height: MENU_HEIGHT }}
    >
      <button className="btn-icon" onClick={stop_all}>
        <span className="material-icons">{STOP_MARK}</span>
      </button>
      {newButtonOf(dispatch, root)}
      <button className="btn-icon" arial-label="Undo." onClick={_undo}>
        <span className="material-icons">undo</span>
      </button>
      <button className="btn-icon" arial-label="Redo." onClick={_redo}>
        <span className="material-icons">redo</span>
      </button>
      <button
        className="btn-icon"
        arial-label="Toggle the TODO-only flag."
        onClick={_flipShowTodoOnly}
      >
        <span className="material-icons">visibility</span>
      </button>
      <button className="btn-icon" onClick={_smallestToTop}>
        Small
      </button>
      <button className="btn-icon" onClick={_closestToTop}>
        Due
      </button>
      <button className="btn-icon" arial-label="Sync." onClick={_load}>
        <span className="material-icons">refresh</span>
      </button>
      <NodeFilterQueryInput />
      <NodeIdsInput />
    </div>
  );
};

const NodeFilterQueryInput = () => {
  const set_node_filter_query_fast = React.useContext(
    set_node_filter_query_fast_context,
  );
  const set_node_filter_query_slow = React.useContext(
    set_node_filter_query_slow_context,
  );
  const node_filter_query = React.useContext(node_filter_query_fast_context);
  const handle_change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      set_node_filter_query_fast(v);
      React.startTransition(() => {
        set_node_filter_query_slow(v);
      });
    },
    [set_node_filter_query_fast, set_node_filter_query_slow],
  );
  const clear_input = useCallback(() => {
    const v = "";
    set_node_filter_query_fast(v);
    React.startTransition(() => {
      set_node_filter_query_slow(v);
    });
  }, [set_node_filter_query_fast, set_node_filter_query_slow]);
  return (
    <div className="flex items-center border border-solid border-gray-400">
      <input
        value={node_filter_query}
        onChange={handle_change}
        className="h-[2em] border-none"
      />
      <button className="btn-icon" onClick={clear_input}>
        {consts.DELETE_MARK}
      </button>
    </div>
  );
};

const NodeIdsInput = () => {
  const set_node_ids = React.useContext(set_node_ids_context);
  const node_ids = React.useContext(node_ids_context);
  const handle_change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      set_node_ids(v);
    },
    [set_node_ids],
  );
  const clear_input = useCallback(() => {
    const v = "";
    set_node_ids(v);
  }, [set_node_ids]);
  return (
    <div className="flex items-center border border-solid border-gray-400">
      <input
        value={node_ids}
        onChange={handle_change}
        className="h-[2em] border-none"
      />
      <button className="btn-icon" onClick={clear_input}>
        {consts.DELETE_MARK}
      </button>
    </div>
  );
};

const Body = () => {
  const root = useSelector((state) => {
    return state.data.root;
  });
  return React.useMemo(
    () => (
      <>
        <div className="flex w-full gap-x-8" style={{ marginTop: MENU_HEIGHT }}>
          <div
            className={`overflow-y-auto pl-[1em] shrink-0 pt-[1em]`}
            style={{ height: `calc(100vh - ${MENU_HEIGHT})` }}
          >
            <QueueColumn />
          </div>
          <div
            className={`overflow-y-auto pl-[1em] shrink-0 pt-[1em]`}
            style={{ height: `calc(100vh - ${MENU_HEIGHT})` }}
          >
            <TreeNode node_id={root} />
          </div>
        </div>
      </>
    ),
    [root],
  );
};

const doFocusStopButton = (k: types.TNodeId) => () => {
  setTimeout(() => focus(stopButtonRefOf(k).current), 50);
};

const doFocusMoveUpButton = (k: types.TNodeId) => () => {
  setTimeout(() => focus(moveUpButtonRefOf(k).current), 50);
};

const doFocusMoveDownButton = (k: types.TNodeId) => () => {
  setTimeout(() => focus(moveDownButtonRefOf(k).current), 50);
};

const doFocusUnindentButton = (k: types.TNodeId) => () => {
  setTimeout(() => focus(unindentButtonRefOf(k).current), 50);
};

const doFocusIndentButton = (k: types.TNodeId) => () => {
  setTimeout(() => focus(indentButtonRefOf(k).current), 50);
};

const doFocusTextArea = (k: types.TNodeId) => () => {
  setTimeout(() => focus(textAreaRefOf(k).current), 50);
};

const setLastRange = (dispatch: AppDispatch, k: types.TNodeId, t: number) => {
  dispatch(
    setLastRange_({
      k,
      t,
    }),
  );
};

const _eval_ = (draft: Draft<types.IState>, k: types.TNodeId) => {
  _set_total_time(k, draft.data.kvs, draft.caches, draft.data.edges);
  const candidates = (Object.keys(draft.data.kvs) as types.TNodeId[]).filter(
    (k) => {
      const v = draft.data.kvs[k];
      return (
        (v.status === "done" || v.status === "dont") &&
        v.estimate !== NO_ESTIMATION
      );
    },
  );
  const ratios = candidates.length
    ? candidates.map((node_id) => {
        const node = draft.data.kvs[node_id];
        return (
          _set_total_time(
            node_id,
            draft.data.kvs,
            draft.caches,
            draft.data.edges,
          ) /
          3600 /
          node.estimate
        );
        // return draft.caches[v.start_time].total_time / 3600 / v.estimate;
      })
    : [1];
  const now = Number(new Date()) / 1000;
  // todo: Use distance to tweak weights.
  // todo: The sampling weight should be a function of both the leaves and the candidates.
  const weights = candidates.length
    ? candidates.map((node_id) => {
        const node = draft.data.kvs[node_id];
        // 1/e per year
        const w_t = Math.exp(
          -(now - Date.parse(node.end_time as string) / 1000) /
            (86400 * 365.25),
        );
        return w_t;
      })
    : [1];
  const leaf_estimates = Array.from(leafs(k, draft.data.kvs, draft.data.edges))
    .map(([_, v]) => v)
    .filter((v) => {
      return v.estimate !== NO_ESTIMATION;
    })
    .map((v) => {
      return v.estimate;
    });
  const n_mc = 2000;
  const ts = _estimate(leaf_estimates, ratios, weights, n_mc);
  types.cache_of(draft.caches, k).percentiles = [
    ts[0],
    ts[Math.round(n_mc / 10)],
    ts[Math.round(n_mc / 3)],
    ts[Math.round(n_mc / 2)],
    ts[Math.round((n_mc * 2) / 3)],
    ts[Math.round((n_mc * 9) / 10)],
    ts[n_mc - 1],
  ];
};

const _set_total_time = (
  k: types.TNodeId,
  kvs: types.IKvs,
  caches: types.ICaches,
  edges: types.IEdges,
) => {
  return (types.cache_of(caches, k).total_time = _total_time_of(
    k,
    kvs,
    caches,
    edges,
    utils.visit_counter_of(),
  ));
};

const _total_time_of = (
  k: types.TNodeId,
  kvs: types.IKvs,
  caches: types.ICaches,
  edges: types.IEdges,
  vid: number,
): number => {
  if (types.cache_of(caches, k).visited === vid) {
    return 0;
  }
  types.cache_of(caches, k).visited = vid;
  const v = kvs[k];
  const r = (total: number, current: types.TEdgeId) => {
    return total + _total_time_of(edges[current].c, kvs, caches, edges, vid);
  };
  return node_time_of(k, kvs) + v.children.reduce(r, 0);
};

const node_time_of = (k: types.TNodeId, kvs: types.IKvs) => {
  return kvs[k].ranges.reduce((total, current) => {
    return current.end === null ? total : total + (current.end - current.start);
  }, 0);
};

const _remove_child_edges_of_parents = (
  draft: Draft<types.IState>,
  node_id: types.TNodeId,
) => {
  for (const edge_id of draft.data.kvs[node_id].parents) {
    deleteAtVal(draft.data.kvs[draft.data.edges[edge_id].p].children, edge_id);
  }
};

const _addTodoEntry = (
  draft: Draft<types.IState>,
  parent_node_id: types.TNodeId,
  i: number,
  edge_id: types.TEdgeId,
) => {
  draft.data.edges[edge_id].p = parent_node_id;
  draft.data.kvs[parent_node_id].children.splice(i, 0, edge_id);
};

const _top = (draft: Draft<types.IState>, k: types.TNodeId) => {
  _topTree(draft, k, utils.visit_counter_of());
  _topQueue(draft, k);
};

const _topTree = (
  draft: Draft<types.IState>,
  node_id: types.TNodeId,
  vid: number,
) => {
  if (types.cache_of(draft.caches, node_id).visited === vid) {
    return;
  }
  types.cache_of(draft.caches, node_id).visited = vid;
  for (const edge_id of draft.data.kvs[node_id].parents) {
    const parent_node_id = draft.data.edges[edge_id].p;
    toFront(draft.data.kvs[parent_node_id].children, edge_id);
    _topTree(draft, parent_node_id, vid);
  }
};

const _topQueue = (draft: Draft<types.IState>, k: types.TNodeId) => {
  toFront(draft.data.queue, k);
};

const _doneToTodo = (draft: Draft<types.IState>, k: types.TNodeId) => {
  _addToTodo(draft, k);
  if (draft.data.kvs[k].parents.length) {
    const pk = draft.data.edges[draft.data.kvs[k].parents[0]].p;
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

const _dontToTodo = (draft: Draft<types.IState>, k: types.TNodeId) => {
  _addToTodo(draft, k);
  if (draft.data.kvs[k].parents.length) {
    const pk = draft.data.edges[draft.data.kvs[k].parents[0]].p;
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

const _addToTodo = (draft: Draft<types.IState>, k: types.TNodeId) => {
  draft.data.kvs[k].status = "todo";
};

const _addToDone = (draft: Draft<types.IState>, k: types.TNodeId) => {
  draft.data.kvs[k].status = "done";
  draft.data.kvs[k].end_time = new Date().toISOString();
};

const _addToDont = (draft: Draft<types.IState>, k: types.TNodeId) => {
  draft.data.kvs[k].status = "dont";
  draft.data.kvs[k].end_time = new Date().toISOString();
};

const _show_path_to_selected_node = (
  draft: Draft<types.IState>,
  node_id: types.TNodeId,
) => {
  while (draft.data.kvs[node_id].parents.length) {
    node_id = draft.data.edges[draft.data.kvs[node_id].parents[0]].p;
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
  const fn = React.useCallback(
    (node_id: types.TNodeId) => <QueueNode node_id={node_id} key={node_id} />,
    [],
  );
  return queue.length ? <ol>{queue.map(fn)}</ol> : null;
};

const TreeNodeList = (props: types.IListProps) => {
  // spacing="0.5rem" paddingLeft="1rem"
  return props.node_id_list.length ? (
    <ol>
      {props.node_id_list.map((node_id) => {
        return (
          <li key={node_id}>
            <TreeNode node_id={node_id} />
          </li>
        );
      })}
    </ol>
  ) : null;
};

const TreeNode = (props: { node_id: types.TNodeId }) => {
  const entry = EntryOf(props.node_id);
  const show_children = useSelector(
    (state) => state.data.kvs[props.node_id].show_children,
  );
  const children = useSelector(
    (state) => state.data.kvs[props.node_id].children,
  );
  const edges = useSelector((state) => state.data.edges);
  const child_node_ids_of = React.useMemo(
    () =>
      memoize((x: { children: typeof children; edges: typeof edges }) =>
        x.children.map((edge_id) => x.edges[edge_id].c),
      ),
    [],
  );
  const child_node_ids = React.useMemo(
    () => child_node_ids_of({ children, edges }),
    [children, edges, child_node_ids_of],
  );
  return React.useMemo(
    () => (
      <>
        {entry}
        {show_children ? (
          <>
            <TreeNodeList node_id_list={child_node_ids} />
          </>
        ) : null}
      </>
    ),
    [entry, show_children, child_node_ids],
  );
};

const QueueNode = (props: { node_id: types.TNodeId }) => {
  const showTodoOnly = useSelector((state) => state.data.showTodoOnly);
  const is_not_todo = useSelector(
    (state) => state.data.kvs[props.node_id].status !== "todo",
  );
  const node_filter_query = React.useContext(node_filter_query_slow_context);
  const text = useSelector((state) => state.data.kvs[props.node_id].text);
  const should_hide = React.useMemo(() => {
    if (showTodoOnly && is_not_todo) {
      return true;
    }
    const node_filter_query_lower = node_filter_query.toLowerCase();
    const text_lower = text.toLowerCase();
    let is_match_filter_node_query = true;
    for (const q of node_filter_query_lower.split(" ")) {
      if (props.node_id !== q && !text_lower.includes(q)) {
        is_match_filter_node_query = false;
        break;
      }
    }
    return !is_match_filter_node_query;
  }, [showTodoOnly, is_not_todo, node_filter_query, text, props.node_id]);
  const entry = EntryOf(props.node_id);
  // className="hidden" is slower.
  return should_hide ? null : (
    <li id={`q-${props.node_id}`} className="mb-[1em] last:mb-0">
      {toTreeButtonOf(props.node_id)}
      {entry}
    </li>
  );
};

const Details = (props: { node_id: types.TNodeId }) => {
  const [new_edge_type, set_new_edge_type] =
    React.useState<types.TEdgeType>("strong");
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
  const show_detail = useSelector(
    (state) => types.cache_of(state.caches, props.node_id).show_detail,
  );
  const dispatch = useDispatch();
  const node_ids = React.useContext(node_ids_context);
  const handle_add_parents = React.useCallback(() => {
    dispatch(
      add_edges_action(
        node_ids_list_of_node_ids_string(node_ids).map((p) => ({
          p,
          c: props.node_id,
          t: new_edge_type,
        })),
      ),
    );
  }, [dispatch, node_ids, new_edge_type, props.node_id]);
  const handle_add_children = React.useCallback(() => {
    dispatch(
      add_edges_action(
        node_ids_list_of_node_ids_string(node_ids).map((c) => ({
          p: props.node_id,
          c,
          t: new_edge_type,
        })),
      ),
    );
  }, [dispatch, node_ids, new_edge_type, props.node_id]);
  return show_detail ? (
    <div className="mt-[0.5em]">
      <div className="flex gap-x-[0.25em] items-baseline">
        Add:
        <select value={new_edge_type} onChange={handle_new_edge_type_change}>
          {types.edge_type_values.map((t, i) => (
            <option value={t} key={i}>
              {t}
            </option>
          ))}
        </select>
        <button className="btn-icon" onClick={handle_add_parents}>
          Parents
        </button>
        <button className="btn-icon" onClick={handle_add_children}>
          Children
        </button>
      </div>
      <hr className="my-[0.25em]" />
      <ChildEdgeTable node_id={props.node_id} />
    </div>
  ) : null;
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

const ChildEdgeTable = (props: { node_id: types.TNodeId }) => {
  const children = useSelector(
    (state) => state.data.kvs[props.node_id].children,
  );
  return (
    <table className="table-auto">
      <tbody className="block max-h-[10em] overflow-y-scroll">
        {children.map(EdgeRowOf)}
      </tbody>
    </table>
  );
};
const EdgeRow = (props: { edge_id: types.TEdgeId }) => {
  const selected = useSelector(
    React.useMemo(
      () =>
        memoize((state) => {
          return {
            is_deletable: checks.is_deletable_edge(props.edge_id, state),
            edge_type: state.data.edges[props.edge_id].t,
          };
        }),
      [props.edge_id],
    ),
  );
  const dispatch = useDispatch();
  const delete_edge = React.useCallback(
    () => dispatch(delete_edge_action(props.edge_id)),
    [props.edge_id, dispatch],
  );
  const set_edge_type = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const edge_type = e.target.value;
      if (types.is_TEdgeType(edge_type)) {
        dispatch(
          set_edge_type_action({
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
  // set edge type
  return React.useMemo(
    () => (
      <tr>
        <td className="p-[0.25em]">{props.edge_id}</td>
        <td className="p-[0.25em]">
          <select
            disabled={!selected.is_deletable}
            value={selected.edge_type}
            onChange={set_edge_type}
          >
            {types.edge_type_values.map((t, i) => (
              <option value={t} key={i}>
                {t}
              </option>
            ))}
          </select>
        </td>
        <td className="p-[0.25em]">
          <button
            className="btn-icon"
            onClick={delete_edge}
            disabled={!selected.is_deletable}
          >
            {consts.DELETE_MARK}
          </button>
        </td>
      </tr>
    ),
    [props.edge_id, selected, delete_edge, set_edge_type],
  );
};
const EdgeRowOf = memoize1((edge_id: types.TEdgeId) => (
  <EdgeRow edge_id={edge_id} key={edge_id} />
));

const Entry = (props: { node_id: types.TNodeId }) => {
  const status = useSelector((state) => state.data.kvs[props.node_id].status);
  const has_parent = useSelector((state) =>
    Boolean(state.data.kvs[props.node_id].parents.length),
  );
  const cache = useSelector((state) =>
    types.cache_of(state.caches, props.node_id),
  );
  const ranges = useSelector((state) => state.data.kvs[props.node_id].ranges);
  const running = React.useMemo(() => {
    const last_range = last(ranges);
    return last_range && last_range.end === null;
  }, [ranges]);
  const noTodo = false;
  // const noTodo = useSelector(
  //   (state) =>
  //     _children_of(props.node_id, "todo", state.data.kvs, state.data.edges)
  //       .length === 0,
  // );
  const has_children = useSelector((state) =>
    Boolean(state.data.kvs[props.node_id].children.length),
  );
  const show_children = useSelector((state) => {
    return state.data.kvs[props.node_id].show_children;
  });
  const dispatch = useDispatch();
  const on_click_total_time = useCallback(() => {
    dispatch(set_total_time(props.node_id));
  }, [dispatch, props.node_id]);

  return (
    <div
      className={utils.join(
        running
          ? "running"
          : has_children && !show_children
          ? "hidden-leafs"
          : undefined,
      )}
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) {
          dispatch(swap_show_children(props.node_id));
        }
      }}
    >
      <TextArea k={props.node_id} />
      <div
        className={utils.join(
          "flex gap-x-[0.25em] items-baseline mt-[0.25em]",
          !cache.show_detail && "opacity-40 hover:opacity-100",
        )}
      >
        <span onClick={on_click_total_time}>
          {cache.total_time < 0 ? "-" : digits1(cache.total_time / 3600)}
        </span>
        {EstimationInputOf(props.node_id)}
        {running
          ? stopButtonOf(dispatch, props.node_id)
          : startButtonOf(dispatch, props.node_id)}
        {todoToDoneButtonOf(dispatch, props.node_id)}
        {todoToDontButtonOf(dispatch, props.node_id)}
        {evalButtonOf(dispatch, props.node_id)}
        {topButtonOf(dispatch, props.node_id)}
        {moveUpButtonOf(dispatch, props.node_id)}
        {moveDownButtonOf(dispatch, props.node_id)}
        {CopyNodeIdButton_of(props.node_id)}
        {showDetailButtonOf(dispatch, props.node_id)}
      </div>
      <Details node_id={props.node_id} />
    </div>
  );
  return (
    <div
      className={utils.join(
        running
          ? ".running"
          : has_children && !show_children
          ? ".hidden-leafs"
          : undefined,
      )}
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) {
          dispatch(swap_show_children(props.node_id));
        }
      }}
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
      <span onClick={on_click_total_time}>
        {cache.total_time < 0 ? "-" : digits1(cache.total_time / 3600)}
      </span>
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
          {cache.show_detail ? (
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
const EntryOf = memoize1((node_id: types.TNodeId) => (
  <Entry node_id={node_id} />
));

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

const lastRangeOf = (ranges: types.IRange[]): null | types.IRange => {
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

function* leafs(
  node_id: types.TNodeId,
  kvs: types.IKvs,
  edges: types.IEdges,
): Iterable<[types.TNodeId, types.IEntry]> {
  const node = kvs[node_id];
  if (node.status === "todo") {
    const todos = _children_of(node_id, "todo", kvs, edges);
    if (todos.length) {
      for (const c of todos) {
        yield* leafs(edges[c].c, kvs, edges);
      }
    } else {
      yield [node_id, node];
    }
  }
}

const _children_of = (
  node_id: types.TNodeId,
  status: types.TStatus,
  kvs: types.IKvs,
  edges: types.IEdges,
) => {
  return kvs[node_id].children.filter(
    (edge_id) => kvs[edges[edge_id].c].status === status,
  );
};

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
      let lo = 0;
      let hi = partitions.length - 1;
      while (lo + 1 < hi) {
        const mi = (hi + lo) >> 1;
        if (partitions[mi] < r) {
          lo = mi;
        } else {
          hi = mi;
        }
      }
      yield xs[lo];
    }
  }
  // todo: For the stricter generators introduced in TypeScript version 3.6.
  assert(() => [false, "Must not happen."]);
  return 0;
}

const assert = (fn: () => [boolean, string]) => {
  if ("production" !== process.env.NODE_ENV) {
    const [v, msg] = fn();
    if (!v) {
      throw new Error(msg);
    }
  }
};

const stopButtonRefOf = memoize1((_: types.TNodeId) =>
  React.createRef<HTMLButtonElement>(),
);

const moveUpButtonRefOf = memoize1((_: types.TNodeId) =>
  React.createRef<HTMLButtonElement>(),
);

const moveDownButtonRefOf = memoize1((_: types.TNodeId) =>
  React.createRef<HTMLButtonElement>(),
);

const unindentButtonRefOf = memoize1((_: types.TNodeId) =>
  React.createRef<HTMLButtonElement>(),
);

const indentButtonRefOf = memoize1((_: types.TNodeId) =>
  React.createRef<HTMLButtonElement>(),
);

const textAreaRefOf = memoize1((_: types.TNodeId) =>
  React.createRef<HTMLTextAreaElement>(),
);

const toTreeButtonOf = memoize1((node_id: types.TNodeId) => {
  const dispatch = useDispatch();
  return (
    <a
      href={`#t-${node_id}`}
      onClick={() => {
        dispatch(show_path_to_selected_node(node_id));
      }}
    >
      <button>→</button>
    </a>
  );
});

const doneToTodoButtonOf = memoize2(
  (dispatch: AppDispatch, k: types.TNodeId) => (
    <button
      className="btn-icon"
      onClick={() => {
        dispatch(doneToTodo(k));
      }}
    >
      {DONE_MARK}
    </button>
  ),
);

const dontToTodoButtonOf = memoize2(
  (dispatch: AppDispatch, k: types.TNodeId) => (
    <button
      className="btn-icon"
      onClick={() => {
        dispatch(dontToTodo(k));
      }}
    >
      {DONT_MARK}
    </button>
  ),
);

const newButtonOf = memoize2((dispatch: AppDispatch, k: types.TNodeId) => {
  const _focusTextAreaOfTheNewTodo = (
    dispatch: AppDispatch,
    getState: () => types.IState,
  ) => {
    const state = getState();
    dispatch(
      doFocusTextArea(state.data.edges[last(state.data.kvs[k].children)].c),
    );
  };
  return (
    <button
      className="btn-icon"
      arial-label="Add a new entry."
      onClick={() => {
        dispatch(new_(k));
        dispatch(_focusTextAreaOfTheNewTodo);
      }}
    >
      {ADD_MARK}
    </button>
  );
});

const stopButtonOf = memoize2(
  (dispatch: AppDispatch, node_id: types.TNodeId) => (
    <button
      className="btn-icon"
      arial-label="Stop."
      onClick={() => {
        dispatch(stop_action(node_id));
      }}
      ref={stopButtonRefOf(node_id)}
    >
      {STOP_MARK}
    </button>
  ),
);

const startButtonOf = memoize2((dispatch: AppDispatch, k: types.TNodeId) => (
  <button
    className="btn-icon"
    onClick={() => {
      dispatch(start_action(k));
      dispatch(doFocusStopButton(k));
    }}
  >
    {START_MARK}
  </button>
));

const topButtonOf = memoize2((dispatch: AppDispatch, k: types.TNodeId) => (
  <button
    className="btn-icon"
    onClick={() => {
      dispatch(top(k));
    }}
  >
    {TOP_MARK}
  </button>
));

const moveUpButtonOf = memoize2((dispatch: AppDispatch, k: types.TNodeId) => (
  <button
    className="btn-icon"
    onClick={() => {
      dispatch(moveUp_(k));
      dispatch(doFocusMoveUpButton(k));
    }}
    ref={moveUpButtonRefOf(k)}
  >
    {MOVE_UP_MARK}
  </button>
));

const moveDownButtonOf = memoize2((dispatch: AppDispatch, k: types.TNodeId) => (
  <button
    className="btn-icon"
    onClick={() => {
      dispatch(moveDown_(k));
      dispatch(doFocusMoveDownButton(k));
    }}
    ref={moveDownButtonRefOf(k)}
  >
    {MOVE_DOWN_MARK}
  </button>
));

const todoToDoneButtonOf = memoize2(
  (dispatch: AppDispatch, k: types.TNodeId) => (
    <button
      className="btn-icon"
      onClick={() => {
        dispatch(todoToDone(k));
      }}
    >
      {DONE_MARK}
    </button>
  ),
);

const todoToDontButtonOf = memoize2(
  (dispatch: AppDispatch, k: types.TNodeId) => (
    <button
      className="btn-icon"
      onClick={() => {
        dispatch(todoToDont(k));
      }}
    >
      {DONT_MARK}
    </button>
  ),
);

const unindentButtonOf = memoize2((dispatch: AppDispatch, k: types.TNodeId) => (
  <button
    className="btn-icon"
    onClick={() => {
      dispatch(unindent(k));
      dispatch(doFocusUnindentButton(k));
    }}
    ref={unindentButtonRefOf(k)}
  >
    {UNINDENT_MARK}
  </button>
));

const indentButtonOf = memoize2((dispatch: AppDispatch, k: types.TNodeId) => (
  <button
    className="btn-icon"
    onClick={() => {
      dispatch(indent(k));
      dispatch(doFocusIndentButton(k));
    }}
    ref={indentButtonRefOf(k)}
  >
    {INDENT_MARK}
  </button>
));

const showDetailButtonOf = memoize2(
  (dispatch: AppDispatch, k: types.TNodeId) => (
    <button
      className="btn-icon"
      onClick={() => {
        dispatch(flipShowDetail(k));
      }}
    >
      {DETAIL_MARK}
    </button>
  ),
);

const deleteButtonOf = memoize2((dispatch: AppDispatch, k: types.TNodeId) => (
  <button
    className="btn-icon"
    onClick={() => {
      dispatch(delete_action(k));
    }}
  >
    {consts.DELETE_MARK}
  </button>
));

const evalButtonOf = memoize2((dispatch: AppDispatch, k: types.TNodeId) => (
  <button
    className="btn-icon"
    onClick={() => {
      dispatch(eval_(k));
    }}
  >
    {EVAL_MARK}
  </button>
));

const CopyNodeIdButton = (props: { node_id: types.TNodeId }) => {
  const clipboard = utils.useClipboard(props.node_id);
  const set_node_ids = React.useContext(set_node_ids_context);
  const handle_click = React.useCallback(() => {
    clipboard.copy();
    set_node_ids((node_ids: string) => props.node_id + " " + node_ids);
  }, [props.node_id, set_node_ids, clipboard]);
  return (
    <button className="btn-icon" onClick={handle_click}>
      {clipboard.is_copied ? DONE_MARK : COPY_MARK}
    </button>
  );
};

const CopyNodeIdButton_of = memoize1((node_id: types.TNodeId) => (
  <CopyNodeIdButton node_id={node_id} />
));

const setEstimateOf = memoize2(
  (dispatch: AppDispatch, k: types.TNodeId) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        setEstimate({
          k,
          estimate: Number(e.target.value),
        }),
      );
    },
);

const EstimationInputOf = memoize1((k: types.TNodeId) => (
  <EstimationInput k={k} />
));

const EstimationInput = (props: { k: types.TNodeId }) => {
  const estimate = useSelector((state) => state.data.kvs[props.k].estimate);
  const dispatch = useDispatch();
  return (
    <input
      type="number"
      step="any"
      value={estimate}
      onChange={setEstimateOf(dispatch, props.k)}
      className="w-[3em] h-[2em]"
    />
  );
};

const setLastRangeOf = memoize2(
  (dispatch: AppDispatch, k: types.TNodeId) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLastRange(dispatch, k, Number(e.target.value));
    },
);

const TextArea = (props: { k: types.TNodeId }) => {
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
      className={utils.join(
        "resize-y w-[30em] overflow-hidden",
        status === "done"
          ? "text-red-300"
          : status === "dont"
          ? "text-gray-500"
          : undefined,
      )}
      style={{
        ...style,
      }}
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

const LastRangeOf = memoize1((k: types.TNodeId) => <LastRange k={k} />);

const LastRange = (props: { k: types.TNodeId }) => {
  const last_range = useSelector((state) => {
    return lastRangeOf(state.data.kvs[props.k].ranges);
  });
  const dispatch = useDispatch();
  return React.useMemo(() => {
    const last_range_value =
      last_range !== null && last_range.end !== null
        ? (last_range.end - last_range.start) / 3600
        : null;
    return last_range_value === null ? null : (
      <input
        type="number"
        step="any"
        value={last_range_value}
        onChange={setLastRangeOf(dispatch, props.k)}
      />
    );
  }, [last_range, dispatch, props.k]);
};

const undoable = (
  reducer: (
    state: undefined | types.IState,
    action: types.AnyPayloadAction,
  ) => types.IState,
  noop: types.AnyPayloadAction,
  pred: (type_: string) => boolean,
) => {
  const init = reducer(undefined, noop);
  const history = new History<types.IState>(init);
  return (state: undefined | types.IState, action: types.AnyPayloadAction) => {
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
  const saveStateMiddleware: Middleware<{}, types.IState> =
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
          if (!r.ok) {
            toast.add("error", "Failed to save changes.", 10000);
          }
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

type TSetStateArg<T> = T | ((prev: T) => T);

const set_node_filter_query_fast_context = React.createContext(
  (_: TSetStateArg<string>) => {},
);
const set_node_filter_query_slow_context = React.createContext(
  (_: TSetStateArg<string>) => {},
);
const node_filter_query_fast_context = React.createContext("");
const node_filter_query_slow_context = React.createContext("");

const set_node_ids_context = React.createContext(
  (_: TSetStateArg<string>) => {},
);
const node_ids_context = React.createContext("");

export const main = () => {
  const container = document.getElementById("root");
  const root = ReactDOM.createRoot(container!);
  root.render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  store.dispatch(doLoad());
};
