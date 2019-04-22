import React from "react";
import ReactDOM from "react-dom";
import produce, { Draft } from "immer";

import "./index.css";

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
const UNINDENT_MARK = "↙";
const INDENT_MARK = "↗︎";
const EVAL_MARK = "⏳";
const DELETE_MARK = "×";
const DONE_MARK = "✓";
const DONT_MARK = "🗑";
const TODO_MARK = "🔁";
const DETAIL_MARK = "⋮";

const DONE_MARK_BUTTON = <button key="done">{DONE_MARK}</button>;
const DONT_MARK_BUTTON = <button key="dont">{DONT_MARK}</button>;

type TStatus = "done" | "dont" | "todo";
type TKVoid = (k: string) => void;

interface IListProps {
  ks: string[];
  kvs: IKvs;
  current_entry: null | string;
  fn: IFn;
  caches: ICaches;
}

interface INodeProps {
  k: string;
  kvs: IKvs;
  current_entry: null | string;
  fn: IFn;
  caches: ICaches;
}

interface IFn {
  new_: TKVoid;
  setText: (k: string, text: string) => void;
  save: () => void;
  resizeTextArea: (
    k: string,
    width: null | string,
    height: null | string,
  ) => void;
  setEstimate: (k: string, estimate: number) => void;
  stop: () => void;
  start: TKVoid;
  top: TKVoid;
  moveUp: TKVoid;
  moveDown: TKVoid;
  unindent: TKVoid;
  indent: TKVoid;
  eval_: TKVoid;
  flipShowDetail: TKVoid;
  delete_: TKVoid;
  todoToDone: TKVoid;
  todoToDont: TKVoid;
  doneToTodo: TKVoid;
  dontToTodo: TKVoid;
  setLastRange: (k: string, t: number) => void;
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

interface IData {
  current_entry: null | string;
  root: string;
  kvs: IKvs;
  queue: string[];
}

interface IKvs {
  [k: string]: IEntry;
}

interface IEntry {
  done: string[];
  dont: string[];
  end_time: null | string;
  estimate: number;
  height: string;
  parent: null | string;
  ranges: IRange[];
  start_time: string;
  status: TStatus;
  text: string;
  todo: string[];
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
  stopButtonRef: React.RefObject<HTMLButtonElement>;
  moveUpButtonRef: React.RefObject<HTMLButtonElement>;
  moveDownButtonRef: React.RefObject<HTMLButtonElement>;
  unindentButtonRef: React.RefObject<HTMLButtonElement>;
  indentButtonRef: React.RefObject<HTMLButtonElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  show_detail: boolean;
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
}

class App extends React.Component<IAppProps, IState> {
  state: IState;
  dirty: boolean;
  history: IHistory;
  fn: IFn;

  constructor(props: IAppProps) {
    super(props);
    this.fn = {
      eval_: this.eval_,
      delete_: this.delete_,
      start: this.start,
      stop: this.stop,
      top: this.top,
      moveUp: this.moveUp,
      moveDown: this.moveDown,
      unindent: this.unindent,
      indent: this.indent,
      new_: this.new_,
      save: this.save,
      setEstimate: this.setEstimate,
      setLastRange: this.setLastRange,
      setText: this.setText,
      resizeTextArea: this.resizeTextArea,
      flipShowDetail: this.flipShowDetail,
      todoToDone: this.todoToDone,
      todoToDont: this.todoToDont,
      doneToTodo: this.doneToTodo,
      dontToTodo: this.dontToTodo,
    };
    const caches = {} as ICaches;
    for (const k of Object.keys(props.data.kvs)) {
      setCache(caches, k, props.data.kvs, this.fn);
    }
    this.state = {
      data: props.data,
      caches,
      saveSuccess: true,
    };
    this.dirty = false;
    this.history = {
      prev: null,
      value: this.state,
      next: null,
    };
  }
  eval_ = (k: string) => {
    this.setState(state => produce(state, draft => this._eval_(draft, k)));
  };
  _eval_ = (draft: Draft<IState>, k: string) => {
    const candidates = Object.values(draft.data.kvs).filter(v => {
      return v.status === "done" && v.estimate !== NO_ESTIMATION;
    });
    const ratios = candidates.length
      ? candidates.map(v => {
          return (
            draft.caches[v.start_time].total_time_spent / 3600 / v.estimate
          );
        })
      : [1];
    const weights = candidates.map(v => {
      return 1;
    });
    const rng = multinomial(ratios, weights);
    const leaf_estimates = Array.from(leafs(draft.data.kvs[k], draft.data.kvs))
      .filter(v => {
        return v.estimate !== NO_ESTIMATION;
      })
      .map(v => {
        return v.estimate;
      });
    const n_mcmc = 1001;
    const ts = [];
    for (let i = 0; i < n_mcmc; i++) {
      ts.push(
        sum(
          leaf_estimates.map(x => {
            return rng.next().value * x;
          }),
        ),
      );
    }
    ts.sort((a, b) => a - b);
    draft.caches[k].percentiles = [
      ts[0],
      ts[Math.round((n_mcmc - 1) / 10)],
      ts[Math.round((n_mcmc - 1) / 3)],
      ts[Math.round((n_mcmc - 1) / 2)],
      ts[Math.round(((n_mcmc - 1) * 2) / 3)],
      ts[Math.round(((n_mcmc - 1) * 9) / 10)],
      ts[n_mcmc - 1],
    ];
  };
  delete_ = (k: string) => {
    this.setState(
      state =>
        produce(state, draft => {
          if (draft.data.kvs[k].todo.length === 0) {
            this._rmTodoEntry(draft, k);
            deleteAtVal(draft.data.queue, k);
            delete draft.data.kvs[k];
            delete draft.caches[k];
            if (draft.data.current_entry === k) {
              draft.data.current_entry = null;
            }
            this.dirty = true;
          }
        }),
      this.save,
    );
  };
  new_ = (parent: string) => {
    const k = new Date().toISOString();
    this.setState(
      state =>
        produce(state, draft => {
          const v = newEntryValue(parent, k);
          draft.data.kvs[k] = v;
          draft.data.kvs[parent].todo.unshift(k);
          draft.data.queue.unshift(k);
          setCache(draft.caches as ICaches, k, draft.data.kvs, this.fn);
          this.dirty = true;
        }),
      () => {
        this.save();
        focus(this.state.caches[k].textareaRef.current);
      },
    );
  };
  save = () => {
    if (this.dirty) {
      this.history = pushHistory(this.history, this.state);
      this._save();
    }
  };
  _save = () => {
    fetch("api/" + API_VERSION + "/post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(this.state.data),
    }).then(r => {
      this.setState(state =>
        produce(state, draft => {
          draft.saveSuccess = r.ok;
        }),
      );
    });
    this.dirty = false;
  };
  undo = () => {
    this.save();
    if (this.history.prev !== null) {
      this.history = this.history.prev;
      this.setState(state => this.history.value, this._save);
    }
  };
  redo = () => {
    if (this.history.next !== null) {
      this.history = this.history.next;
      this.setState(state => this.history.value, this._save);
    }
  };
  flipShowDetail = (k: string) => {
    this.setState(state =>
      produce(state, draft => {
        draft.caches[k].show_detail = !draft.caches[k].show_detail;
      }),
    );
  };
  start = (k: string) => {
    this.setState(
      state =>
        produce(state, draft => {
          if (k !== draft.data.current_entry) {
            if (draft.data.kvs[k].status === "done") {
              this._rmFromDone(draft, k);
              this._addToTodo(draft, k);
            } else if (draft.data.kvs[k].status === "dont") {
              this._rmFromDont(draft, k);
              this._addToTodo(draft, k);
            }
            this._top(draft, k);
            assert(draft.data.kvs[k].status === "todo", "Must not happen");
            this._stop(draft);
            draft.data.current_entry = k;
            draft.data.kvs[k].ranges.push({
              start: Number(new Date()) / 1000,
              end: null,
            });
            this._eval_(draft, k);
            this.dirty = true;
          }
        }),
      () => {
        this.save();
        focus(this.state.caches[k].stopButtonRef.current);
      },
    );
  };
  top = (k: string) => {
    this.setState(
      state =>
        produce(state, draft => {
          this._top(draft, k);
          this.dirty = true;
        }),
      this.save,
    );
  };
  moveUp = (k: string) => {
    this.setState(
      state =>
        produce(state, draft => {
          const pk = draft.data.kvs[k].parent;
          if (pk) {
            moveUp(draft.data.kvs[pk].todo, k);
            this.dirty = true;
          }
        }),
      () => {
        this.save();
        focus(this.state.caches[k].moveUpButtonRef.current);
      },
    );
  };
  moveDown = (k: string) => {
    this.setState(
      state =>
        produce(state, draft => {
          const pk = draft.data.kvs[k].parent;
          if (pk) {
            moveDown(draft.data.kvs[pk].todo, k);
            this.dirty = true;
          }
        }),
      () => {
        this.save();
        focus(this.state.caches[k].moveDownButtonRef.current);
      },
    );
  };
  unindent = (k: string) => {
    this.setState(
      state =>
        produce(state, draft => {
          const pk = draft.data.kvs[k].parent;
          if (pk !== null) {
            const _total_time_spent_pk_orig = draft.caches[pk].total_time_spent;
            const ppk = draft.data.kvs[pk].parent;
            const _total_time_spent_ppk_orig =
              ppk === null ? null : draft.caches[ppk].total_time_spent;
            this._rmTodoEntry(draft, k);
            if (ppk) {
              const entries = draft.data.kvs[ppk].todo;
              const i = entries.indexOf(pk);
              assert(i !== -1, "Must not happen.");
              this._addTodoEntry(draft, ppk, i + 1, k);
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
              this.dirty = true;
            }
          }
        }),
      () => {
        this.save();
        focus(this.state.caches[k].unindentButtonRef.current);
      },
    );
  };
  indent = (k: string) => {
    this.setState(
      state =>
        produce(state, draft => {
          const pk = draft.data.kvs[k].parent;
          if (pk) {
            const entries = draft.data.kvs[pk].todo;
            const i = entries.indexOf(k);
            if (i > 0) {
              const new_pk = entries[i - 1];
              const total_time_spent_new_pk_orig =
                draft.caches[new_pk].total_time_spent;
              const total_time_spent_k = draft.caches[k].total_time_spent;
              this._rmTodoEntry(draft, k);
              this._addTodoEntry(draft, new_pk, 0, k);
              assertIsApprox(
                draft.caches[new_pk].total_time_spent,
                total_time_spent_new_pk_orig + total_time_spent_k,
              );
              this.dirty = true;
            }
          }
        }),
      () => {
        this.save();
        focus(this.state.caches[k].indentButtonRef.current);
      },
    );
  };
  _rmTodoEntry = (draft: Draft<IState>, k: string) => {
    const pk = draft.data.kvs[k].parent;
    if (pk) {
      deleteAtVal(draft.data.kvs[pk].todo, k);
      this._addDt(draft, pk, -draft.caches[k].total_time_spent);
    }
  };
  _addTodoEntry = (draft: Draft<IState>, pk: string, i: number, k: string) => {
    if (pk) {
      draft.data.kvs[k].parent = pk;
      draft.data.kvs[pk].todo.splice(i, 0, k);
      this._addDt(draft, pk, draft.caches[k].total_time_spent);
    }
  };
  _top = (draft: Draft<IState>, k: string) => {
    let ck = k;
    let pk = draft.data.kvs[ck].parent;
    while (pk !== null) {
      toFront(draft.data.kvs[pk].todo, ck);
      ck = pk;
      pk = draft.data.kvs[ck].parent;
    }
    toFront(draft.data.queue, k);
  };
  stop = () => {
    this.setState(state => produce(this.state, this._stop), this.save);
  };
  _stop = (draft: Draft<IState>) => {
    if (draft.data.current_entry !== null) {
      const e = draft.data.kvs[draft.data.current_entry];
      const r = last(e.ranges);
      r.end = Number(new Date()) / 1000;
      const dt = r.end - r.start;
      this._addDt(draft, draft.data.current_entry, dt);
      this._eval_(draft, draft.data.current_entry);
      draft.data.current_entry = null;
      this.dirty = true;
    }
  };
  _addDt = (draft: Draft<IState>, k: null | string, dt: number) => {
    while (k) {
      draft.caches[k].total_time_spent += dt;
      k = draft.data.kvs[k].parent;
    }
  };
  setEstimate = (k: string, estimate: number) => {
    this.setState(
      state =>
        produce(state, draft => {
          draft.data.kvs[k].estimate = estimate;
          this.dirty = true;
        }),
      this.save,
    );
  };
  setLastRange = (k: string, t: number) => {
    this.setState(
      state =>
        produce(state, draft => {
          const l = lastRange(draft.data.kvs[k].ranges);
          if (l !== null && l.end) {
            const t1 = l.end - l.start;
            const t2 = t * 3600;
            const dt = t2 - t1;
            if (dt !== 0) {
              l.end = l.start + t2;
              this._addDt(draft, k, dt);
              this.dirty = true;
            }
          }
        }),
      this.save,
    );
  };
  setText = (k: string, text: string) => {
    this.setState(state =>
      produce(state, draft => {
        draft.data.kvs[k].text = text;
        this.dirty = true;
      }),
    );
  };
  resizeTextArea = (k: string, width: null | string, height: null | string) => {
    if (width && height) {
      this.setState(
        state =>
          produce(state, draft => {
            const v = draft.data.kvs[k];
            if (v.width !== width) {
              v.width = width;
              this.dirty = true;
            }
            if (v.height !== height) {
              v.height = height;
              this.dirty = true;
            }
          }),
        this.save,
      );
    }
  };
  _rmFromTodo = (draft: Draft<IState>, k: string) => {
    if (draft.data.current_entry === k) {
      this._stop(draft);
    }
    const pk = draft.data.kvs[k].parent;
    if (pk) {
      deleteAtVal(draft.data.kvs[pk].todo, k);
    }
  };
  _rmFromDone = (draft: Draft<IState>, k: string) => {
    const pk = draft.data.kvs[k].parent;
    if (pk) {
      deleteAtVal(draft.data.kvs[pk].done, k);
    }
  };
  _rmFromDont = (draft: Draft<IState>, k: string) => {
    const pk = draft.data.kvs[k].parent;
    if (pk) {
      deleteAtVal(draft.data.kvs[pk].dont, k);
    }
  };
  _addToTodo = (draft: Draft<IState>, k: string) => {
    draft.data.kvs[k].status = "todo";
    const pk = draft.data.kvs[k].parent;
    if (pk) {
      draft.data.kvs[pk].todo.unshift(k);
    }
  };
  _addToDone = (draft: Draft<IState>, k: string) => {
    draft.data.kvs[k].status = "done";
    draft.data.kvs[k].end_time = new Date().toISOString();
    const pk = draft.data.kvs[k].parent;
    if (pk) {
      draft.data.kvs[pk].done.unshift(k);
    }
  };
  _addToDont = (draft: Draft<IState>, k: string) => {
    draft.data.kvs[k].status = "dont";
    draft.data.kvs[k].end_time = new Date().toISOString();
    const pk = draft.data.kvs[k].parent;
    if (pk) {
      draft.data.kvs[pk].dont.unshift(k);
    }
  };
  todoToDone = (k: string) => {
    this.setState(state =>
      produce(state, draft => {
        this._rmFromTodo(draft, k);
        this._addToDone(draft, k);
        this.dirty = true;
      }),
    );
  };
  todoToDont = (k: string) => {
    this.setState(state =>
      produce(state, draft => {
        this._rmFromTodo(draft, k);
        this._addToDont(draft, k);
        this.dirty = true;
      }),
    );
  };
  doneToTodo = (k: string) => {
    this.setState(state =>
      produce(state, draft => {
        this._rmFromDone(draft, k);
        this._addToTodo(draft, k);
        this.dirty = true;
      }),
    );
  };
  dontToTodo = (k: string) => {
    this.setState(state =>
      produce(state, draft => {
        this._rmFromDont(draft, k);
        this._addToTodo(draft, k);
        this.dirty = true;
      }),
    );
  };
  render = () => {
    return (
      <div id="columns">
        <div className={"menu"}>
          {this.state.saveSuccess ? null : <p>Failed to save.</p>}
          <div>
            {this.state.caches[this.state.data.root].stopButton}
            {this.state.caches[this.state.data.root].treeNewButton}
            <button onClick={this.undo}>{UNDO_MARK}</button>
            <button onClick={this.redo}>{REDO_MARK}</button>
          </div>
        </div>
        <div id="tree">
          <Node
            k={this.state.data.root}
            kvs={this.state.data.kvs}
            current_entry={this.state.data.current_entry}
            fn={this.fn}
            caches={this.state.caches}
          />
        </div>
        <div id="queue">
          <Queue
            ks={this.state.data.queue}
            kvs={this.state.data.kvs}
            current_entry={this.state.data.current_entry}
            fn={this.fn}
            caches={this.state.caches}
          />
        </div>
      </div>
    );
  };
}

const Node = (props: INodeProps) => {
  const v = props.kvs[props.k];
  const cache = props.caches[props.k];
  return (
    <div>
      <div className={props.k === props.current_entry ? "running" : undefined}>
        {v.parent === null
          ? null
          : v.status === "done"
          ? cache.treeDoneToTodoButton
          : v.status === "dont"
          ? cache.treeDontToTodoButton
          : cache.treeNewButton}
        {v.parent === null ? null : (
          <textarea
            value={v.text}
            onChange={cache.setText}
            onBlur={props.fn.save}
            onMouseUp={cache.resizeTextArea}
            className={v.status}
            style={{
              width: v.width,
              height: v.height,
            }}
            ref={cache.textareaRef}
          />
        )}
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
          : props.k === props.current_entry
          ? cache.stopButton
          : cache.startButton}
        {v.parent && v.status === "todo" ? cache.topButton : null}
        {v.parent && v.status === "todo" ? cache.moveUpButton : null}
        {v.parent && v.status === "todo" ? cache.moveDownButton : null}
        {v.parent && v.status === "todo" ? cache.unindentButton : null}
        {v.parent && v.status === "todo" ? cache.indentButton : null}
        {v.status === "todo" ? cache.evalButton : null}
        {v.parent && v.status === "todo"
          ? [cache.todoToDoneButton, cache.todoToDontButton]
          : null}
        {v.parent && v.status === "todo" ? cache.showDetailButton : null}
        {v.status === "todo" ? cache.percentiles.map(digits1).join(" ") : null}
        {v.parent && v.status === "todo" && cache.show_detail ? (
          <div>
            {showLastRange(lastRange(v.ranges), cache.setLastRange)}
            {v.todo.length === 0 && v.done.length === 0 && v.dont.length === 0
              ? cache.deleteButton
              : null}
          </div>
        ) : null}
      </div>
      <List
        ks={v.todo}
        kvs={props.kvs}
        current_entry={props.current_entry}
        fn={props.fn}
        caches={props.caches}
      />
      <List
        ks={v.done}
        kvs={props.kvs}
        current_entry={props.current_entry}
        fn={props.fn}
        caches={props.caches}
      />
      <List
        ks={v.dont}
        kvs={props.kvs}
        current_entry={props.current_entry}
        fn={props.fn}
        caches={props.caches}
      />
    </div>
  );
};

const List = (props: IListProps) => {
  return props.ks.length ? (
    <ol>
      {props.ks.map(k => {
        const v = props.kvs[k];
        return (
          <li key={k} className={v.status}>
            <Node
              k={k}
              kvs={props.kvs}
              current_entry={props.current_entry}
              fn={props.fn}
              caches={props.caches}
            />
          </li>
        );
      })}
    </ol>
  ) : null;
};

const QueueNode = (props: INodeProps) => {
  const v = props.kvs[props.k];
  const cache = props.caches[props.k];
  return (
    <div className={props.k === props.current_entry ? "running" : undefined}>
      {v.parent ? cache.toTreeButton : null}
      {v.parent === null
        ? null
        : v.status === "done"
        ? cache.queueDoneToTodoButton
        : v.status === "dont"
        ? cache.queueDontToTodoButton
        : cache.queueNewButton}
      {v.parent === null ? null : (
        <textarea
          value={v.text}
          onChange={cache.setText}
          onBlur={props.fn.save}
          onMouseUp={cache.resizeTextArea}
          className={v.status}
          style={{
            width: v.width,
            height: v.height,
          }}
          ref={cache.textareaRef}
        />
      )}
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
        : props.k === props.current_entry
        ? cache.stopButton
        : cache.startButton}
      {v.parent && v.status === "todo" ? cache.topButton : null}
      {v.status === "todo" ? cache.evalButton : null}
      {v.parent && v.status === "todo"
        ? [cache.todoToDoneButton, cache.todoToDontButton]
        : null}
      {v.parent && v.status === "todo" ? cache.showDetailButton : null}
      {v.status === "todo" ? cache.percentiles.map(digits1).join(" ") : null}
      {v.parent && v.status === "todo" && cache.show_detail ? (
        <div>
          {showLastRange(lastRange(v.ranges), cache.setLastRange)}
          {v.todo.length === 0 && v.done.length === 0 && v.dont.length === 0
            ? cache.deleteButton
            : null}
        </div>
      ) : null}
    </div>
  );
};

const Queue = (props: IListProps) => {
  return props.ks.length ? (
    <ol>
      {props.ks.map(k => {
        const v = props.kvs[k];
        return (
          <li key={k} className={v.status}>
            <QueueNode
              k={k}
              kvs={props.kvs}
              current_entry={props.current_entry}
              fn={props.fn}
              caches={props.caches}
            />
          </li>
        );
      })}
    </ol>
  ) : null;
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
}

const pushHistory = (h: IHistory, v: IState) => {
  return (h.next = {
    prev: h,
    value: v,
    next: null,
  });
};

// I need `Draft<ICaches>` here since refs contain readonly properties.
const setCache = (caches: ICaches, k: string, kvs: IKvs, fn: IFn) => {
  if (caches[k] === undefined) {
    const sumChildren = (xs: string[]) => {
      return xs.reduce((total, current) => {
        setCache(caches, current, kvs, fn);
        return total + caches[current].total_time_spent;
      }, 0);
    };
    const stopButtonRef = React.createRef<HTMLButtonElement>();
    const moveUpButtonRef = React.createRef<HTMLButtonElement>();
    const moveDownButtonRef = React.createRef<HTMLButtonElement>();
    const unindentButtonRef = React.createRef<HTMLButtonElement>();
    const indentButtonRef = React.createRef<HTMLButtonElement>();
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
      textareaRef: React.createRef<HTMLTextAreaElement>(),
      show_detail: false,
      treeDoneToTodoButton: (
        <button
          id={`id${k}`}
          className="done"
          onClick={() => {
            fn.doneToTodo(k);
          }}
        >
          {DONE_MARK}
        </button>
      ),
      treeDontToTodoButton: (
        <button
          id={`id${k}`}
          className="dont"
          onClick={() => {
            fn.dontToTodo(k);
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
            fn.doneToTodo(k);
          }}
        >
          {DONE_MARK}
        </button>
      ),
      queueDontToTodoButton: (
        <button
          className="dont"
          onClick={() => {
            fn.dontToTodo(k);
          }}
        >
          {DONT_MARK}
        </button>
      ),
      treeNewButton: (
        <button
          id={`id${k}`}
          onClick={() => {
            fn.new_(k);
          }}
        >
          {NEW_MARK}
        </button>
      ),
      queueNewButton: (
        <button
          onClick={() => {
            fn.new_(k);
          }}
        >
          {NEW_MARK}
        </button>
      ),
      stopButton: (
        <button onClick={fn.stop} ref={stopButtonRef}>
          {STOP_MARK}
        </button>
      ),
      startButton: (
        <button
          onClick={() => {
            fn.start(k);
          }}
        >
          {START_MARK}
        </button>
      ),
      topButton: (
        <button
          onClick={() => {
            fn.top(k);
          }}
        >
          {TOP_MARK}
        </button>
      ),
      moveUpButton: (
        <button
          onClick={() => {
            fn.moveUp(k);
          }}
          ref={moveUpButtonRef}
        >
          {MOVE_UP_MARK}
        </button>
      ),
      moveDownButton: (
        <button
          onClick={() => {
            fn.moveDown(k);
          }}
          ref={moveDownButtonRef}
        >
          {MOVE_DOWN_MARK}
        </button>
      ),
      unindentButton: (
        <button
          onClick={() => {
            fn.unindent(k);
          }}
          ref={unindentButtonRef}
        >
          {UNINDENT_MARK}
        </button>
      ),
      indentButton: (
        <button
          onClick={() => {
            fn.indent(k);
          }}
          ref={indentButtonRef}
        >
          {INDENT_MARK}
        </button>
      ),
      evalButton: (
        <button
          onClick={() => {
            fn.eval_(k);
          }}
        >
          {EVAL_MARK}
        </button>
      ),
      showDetailButton: (
        <button
          onClick={() => {
            fn.flipShowDetail(k);
          }}
        >
          {DETAIL_MARK}
        </button>
      ),
      deleteButton: (
        <button
          onClick={() => {
            fn.delete_(k);
          }}
        >
          {DELETE_MARK}
        </button>
      ),
      toTreeButton: (
        <a href={`#id${k}`}>
          <button>←</button>
        </a>
      ),
      todoToDoneButton: XToYButton(DONE_MARK, fn.todoToDone, "todoToDone", k),
      todoToDontButton: XToYButton(DONT_MARK, fn.todoToDont, "todoToDont", k),
      setLastRange: (e: React.ChangeEvent<HTMLInputElement>) => {
        fn.setLastRange(k, Number(e.currentTarget.value));
      },
      setEstimate: (e: React.ChangeEvent<HTMLInputElement>) => {
        fn.setEstimate(k, Number(e.currentTarget.value));
      },
      setText: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        fn.setText(k, e.currentTarget.value);
      },
      resizeTextArea: (e: React.MouseEvent<HTMLTextAreaElement>) => {
        fn.resizeTextArea(
          k,
          e.currentTarget.style.width,
          e.currentTarget.style.height,
        );
      },
    };
  }
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
    height: "3ex",
    parent,
    ranges: [] as IRange[],
    start_time,
    status: "todo" as TStatus,
    text: "",
    todo: [] as string[],
    width: "49ex",
  };
};

const main = () => {
  fetch("api/" + API_VERSION + "/get")
    .then(r => r.json())
    .then((data: IData) => {
      ReactDOM.render(<App data={data} />, document.getElementById("root"));
    });
};

main();
