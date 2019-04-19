import React from "react";
import ReactDOM from "react-dom";
import produce from "immer";

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

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data,
      saveSuccess: true,
    };
    this.dirty = false;
    this.history = {
      prev: null,
      value: this.state,
      next: null,
    };
  }
  eval_ = k => {
    this.setState(state => produce(state, draft => this._eval_(draft, k)));
  };
  _eval_ = (draft, k) => {
    const candidates = Object.values(draft.data.kvs).filter(v => {
      return v.done_time && v.estimate !== NO_ESTIMATION;
    });
    const ratios = candidates.length
      ? candidates.map(v => {
          return v.cache.total_time_spent / 3600 / v.estimate;
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
    draft.data.kvs[k].cache.percentiles = [
      ts[0],
      ts[Math.round((n_mcmc - 1) / 10)],
      ts[Math.round((n_mcmc - 1) / 3)],
      ts[Math.round((n_mcmc - 1) / 2)],
      ts[Math.round(((n_mcmc - 1) * 2) / 3)],
      ts[Math.round(((n_mcmc - 1) * 9) / 10)],
      ts[n_mcmc - 1],
    ];
  };
  delete_ = k => {
    this.setState(
      state =>
        produce(state, draft => {
          if (draft.data.kvs[k].children.length === 0) {
            this._rmTodoEntry(draft, k);
            delete draft.data.kvs[k];
            if (draft.data.current_entry === k) {
              draft.data.current_entry = null;
            }
            this.dirty = true;
          }
        }),
      this.save,
    );
  };
  new_ = parent => {
    const k = new Date().toISOString();
    this.setState(
      state =>
        produce(state, draft => {
          const v = {
            children: [],
            done_time: null,
            dont_time: null,
            estimate: NO_ESTIMATION,
            height: "3ex",
            parent,
            ranges: [],
            text: "",
            width: "50ex",
          };
          draft.data.kvs[k] = v;
          if (parent === null) {
            draft.data.todo.unshift(k);
          } else {
            draft.data.kvs[parent].children.unshift(k);
          }
          setCache(k, draft.data.kvs);
          this.dirty = true;
        }),
      () => {
        this.save();
        this.state.data.kvs[k].cache.textareaRef.current.focus();
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
      body: JSON.stringify(
        produce(this.state.data, draft => {
          for (let v of Object.values(draft.kvs)) {
            delete v.cache;
          }
        }),
      ),
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
  flipShowDetail = k => {
    this.setState(state =>
      produce(state, draft => {
        draft.data.kvs[k].cache.show_detail = !draft.data.kvs[k].cache
          .show_detail;
      }),
    );
  };
  start = k => {
    this.setState(
      state =>
        produce(state, draft => {
          if (k !== draft.data.current_entry) {
            this._stop(draft);
            draft.data.kvs[k].ranges.push({
              start: Number(new Date()) / 1000,
              end: null,
            });
            if (draft.data.kvs[k].done_time) {
              draft.data.kvs[k].done_time = null;
            }
            if (draft.data.kvs[k].dont_time) {
              draft.data.kvs[k].dont_time = null;
            }
            // Move the started entry to the top.
            this._top(draft, k);
            this._eval_(draft, k);
            draft.data.current_entry = k;
            this.dirty = true;
          }
        }),
      () => {
        this.save();
        this.state.data.kvs[k].cache.stopButtonRef.current.focus();
      },
    );
  };
  top = k => {
    this.setState(
      state =>
        produce(state, draft => {
          this._top(draft, k);
          this.dirty = true;
        }),
      this.save,
    );
  };
  moveUp = k => {
    this.setState(
      state =>
        produce(state, draft => {
          const pk = draft.data.kvs[k].parent;
          const entries =
            pk === null ? draft.data.todo : draft.data.kvs[pk].children;
          moveUp(entries, k);
          this.dirty = true;
        }),
      () => {
        this.save();
        this.state.data.kvs[k].cache.moveUpButtonRef.current.focus();
      },
    );
  };
  moveDown = k => {
    this.setState(
      state =>
        produce(state, draft => {
          const pk = draft.data.kvs[k].parent;
          const entries =
            pk === null ? draft.data.todo : draft.data.kvs[pk].children;
          moveDown(entries, k);
          this.dirty = true;
        }),
      () => {
        this.save();
        this.state.data.kvs[k].cache.moveDownButtonRef.current.focus();
      },
    );
  };
  unindent = k => {
    this.setState(
      state =>
        produce(state, draft => {
          const pk = draft.data.kvs[k].parent;
          if (pk !== null) {
            const _total_time_spent_pk_orig =
              draft.data.kvs[pk].cache.total_time_spent;
            const ppk = draft.data.kvs[pk].parent;
            const _total_time_spent_ppk_orig =
              ppk === null ? null : draft.data.kvs[ppk].cache.total_time_spent;
            this._rmTodoEntry(draft, k);
            const entries =
              ppk === null ? draft.data.todo : draft.data.kvs[ppk].children;
            const i = entries.indexOf(pk);
            assert(i !== -1);
            this._addTodoEntry(draft, ppk, i + 1, k);
            assertIsApprox(
              _total_time_spent_pk_orig -
                draft.data.kvs[pk].cache.total_time_spent,
              draft.data.kvs[k].cache.total_time_spent,
            );
            if (_total_time_spent_ppk_orig !== null) {
              assertIsApprox(
                _total_time_spent_ppk_orig,
                draft.data.kvs[ppk].cache.total_time_spent,
              );
            }
            this.dirty = true;
          }
        }),
      () => {
        this.save();
        this.state.data.kvs[k].cache.unindentButtonRef.current.focus();
      },
    );
  };
  indent = k => {
    this.setState(
      state =>
        produce(state, draft => {
          const pk = draft.data.kvs[k].parent;
          const entries =
            pk === null ? draft.data.todo : draft.data.kvs[pk].children;
          const i = entries.indexOf(k);
          if (i > 0) {
            const new_pk = entries[i - 1];
            const total_time_spent_new_pk_orig =
              draft.data.kvs[new_pk].cache.total_time_spent;
            const total_time_spent_k = draft.data.kvs[k].cache.total_time_spent;
            this._rmTodoEntry(draft, k);
            this._addTodoEntry(draft, new_pk, 0, k);
            assertIsApprox(
              draft.data.kvs[new_pk].cache.total_time_spent,
              total_time_spent_new_pk_orig + total_time_spent_k,
            );
            this.dirty = true;
          }
        }),
      () => {
        this.save();
        this.state.data.kvs[k].cache.indentButtonRef.current.focus();
      },
    );
  };
  _rmTodoEntry = (draft, k) => {
    const pk = draft.data.kvs[k].parent;
    if (pk === null) {
      deleteAtVal(draft.data.todo, k);
    } else {
      deleteAtVal(draft.data.kvs[pk].children, k);
      this._addDt(draft, pk, -draft.data.kvs[k].cache.total_time_spent);
    }
  };
  _addTodoEntry = (draft, pk, i, k) => {
    draft.data.kvs[k].parent = pk;
    if (pk === null) {
      draft.data.todo.splice(i, 0, k);
    } else {
      draft.data.kvs[pk].children.splice(i, 0, k);
      this._addDt(draft, pk, draft.data.kvs[k].cache.total_time_spent);
    }
  };
  _top = (draft, k) => {
    let ck = k;
    let pk = draft.data.kvs[ck].parent;
    while (pk !== null) {
      toFront(draft.data.kvs[pk].children, ck);
      ck = pk;
      pk = draft.data.kvs[ck].parent;
    }
    toFront(draft.data.todo, ck);
  };
  stop = () => {
    this.setState(state => produce(this.state, this._stop), this.save);
  };
  _stop = draft => {
    if (draft.data.current_entry !== null) {
      const e = draft.data.kvs[draft.data.current_entry];
      last(e.ranges).end = Number(new Date()) / 1000;
      const r = last(e.ranges);
      const dt = r.end - r.start;
      this._addDt(draft, draft.data.current_entry, dt);
      this._eval_(draft, draft.data.current_entry);
      draft.data.current_entry = null;
      this.dirty = true;
    }
  };
  _addDt = (draft, k, dt) => {
    while (k) {
      const node = draft.data.kvs[k];
      node.cache.total_time_spent += dt;
      k = node.parent;
    }
  };
  setEstimate = (k, estimate) => {
    this.setState(
      state =>
        produce(state, draft => {
          draft.data.kvs[k].estimate = Number(estimate);
          this.dirty = true;
        }),
      this.save,
    );
  };
  setLastRange = (k, t) => {
    this.setState(
      state =>
        produce(state, draft => {
          const l = lastRange(draft.data.kvs[k].ranges);
          if (l !== null) {
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
  setText = (k, text) => {
    this.setState(state =>
      produce(state, draft => {
        draft.data.kvs[k].text = text;
        this.dirty = true;
      }),
    );
  };
  resizeTextArea = (k, width, height) => {
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
  };
  rmFromTodo = (draft, k) => {
    if (draft.data.current_entry === k) {
      this._stop(draft);
    }
    if (draft.data.kvs[k].parent === null) {
      deleteAtVal(draft.data.todo, k);
    }
  };
  rmFromDone = (draft, k) => {
    draft.data.kvs[k].done_time = null;
    if (draft.data.kvs[k].parent === null) {
      deleteAtVal(draft.data.done, k);
    }
  };
  rmFromDont = (draft, k) => {
    draft.data.kvs[k].dont_time = null;
    if (draft.data.kvs[k].parent === null) {
      deleteAtVal(draft.data.dont, k);
    }
  };
  addToTodo = (draft, k) => {
    const pk = draft.data.kvs[k].parent;
    if (pk === null) {
      draft.data.todo.unshift(k);
    } else {
      toFront(draft.data.kvs[pk].children, k);
    }
  };
  addToDone = (draft, k) => {
    draft.data.kvs[k].done_time = new Date().toISOString();
    const pk = draft.data.kvs[k].parent;
    if (pk === null) {
      draft.data.done.push(k);
    } else {
      toRear(draft.data.kvs[pk].children, k);
    }
  };
  addToDont = (draft, k) => {
    draft.data.kvs[k].dont_time = new Date().toISOString();
    const pk = draft.data.kvs[k].parent;
    if (pk === null) {
      draft.data.dont.push(k);
    } else {
      toRear(draft.data.kvs[pk].children, k);
    }
  };
  todoToDone = k => {
    this.xToY("rmFromTodo", "addToDone", k);
  };
  todoToDont = k => {
    this.xToY("rmFromTodo", "addToDont", k);
  };
  doneToTodo = k => {
    this.xToY("rmFromDone", "addToTodo", k);
  };
  dontToTodo = k => {
    this.xToY("rmFromDont", "addToTodo", k);
  };
  xToY = (x, y, k) => {
    this.setState(
      state =>
        produce(state, draft => {
          this[x](draft, k);
          this[y](draft, k);
          this.dirty = true;
        }),
      this.save,
    );
  };
  render = () => {
    const fn = {
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

    return (
      <div>
        <div className={"menu"}>
          {this.state.saveSuccess ? null : <p>Failed to save.</p>}
          <div>
            <button onClick={this.stop}>{STOP_MARK}</button>
            <button
              onClick={() => {
                this.new_(null);
              }}
            >
              {NEW_MARK}
            </button>
            <button onClick={this.undo}>{UNDO_MARK}</button>
            <button onClick={this.redo}>{REDO_MARK}</button>
          </div>
        </div>
        <Todo
          ks={this.state.data.todo}
          kvs={this.state.data.kvs}
          fn={fn}
          current_entry={this.state.data.current_entry}
        />
        <Done
          ks={this.state.data.done}
          kvs={this.state.data.kvs}
          fn={fn}
          current_entry={this.state.data.current_entry}
        />
        <Dont
          ks={this.state.data.dont}
          kvs={this.state.data.kvs}
          fn={fn}
          current_entry={this.state.data.current_entry}
        />
      </div>
    );
  };
}

const Todo = props => {
  return (
    <div>
      <h1>To do</h1>
      {Tree(props.ks, props)}
    </div>
  );
};

const Done = props => {
  return Panel("Done", props);
};

const Dont = props => {
  return Panel("Don't", props);
};

const Panel = (title, props) => {
  return (
    <div>
      <h1>{title}</h1>
      {Tree(props.ks, props)}
    </div>
  );
};

const Tree = (ks, props) => {
  if (ks) {
    const list = ks.map(k => {
      const v = props.kvs[k];
      return (
        <li key={"li-" + k} className={classOf(v)}>
          <div className={k === props.current_entry ? "running" : null}>
            {v.done_time ? (
              DONE_MARK
            ) : v.dont_time ? (
              DONT_MARK
            ) : (
              <button
                onClick={() => {
                  props.fn.new_(k);
                }}
              >
                {NEW_MARK}
              </button>
            )}
            <textarea
              value={v.text}
              onChange={e => {
                props.fn.setText(k, e.target.value);
              }}
              onBlur={props.fn.save}
              onMouseUp={e => {
                props.fn.resizeTextArea(
                  k,
                  e.target.style.width,
                  e.target.style.height,
                );
              }}
              className={classOf(v)}
              style={{
                width: v.width,
                height: v.height,
              }}
              ref={v.cache.textareaRef}
            />
            <input
              type="number"
              step="any"
              value={v.estimate}
              onChange={e => {
                props.fn.setEstimate(k, e.target.value);
              }}
              className={classOf(v)}
            />
            {digits1(props.kvs[k].cache.total_time_spent / 3600)}
            {k === props.current_entry ? (
              <button
                onClick={() => {
                  props.fn.stop();
                }}
                ref={v.cache.stopButtonRef}
              >
                {STOP_MARK}
              </button>
            ) : (
              <button
                onClick={() => {
                  props.fn.start(k);
                }}
              >
                {START_MARK}
              </button>
            )}
            {v.done_time === null && v.dont_time === null ? (
              <button
                onClick={() => {
                  props.fn.top(k);
                }}
              >
                {TOP_MARK}
              </button>
            ) : null}
            {v.done_time === null && v.dont_time === null ? (
              <button
                onClick={() => {
                  props.fn.moveUp(k);
                }}
                ref={v.cache.moveUpButtonRef}
              >
                {MOVE_UP_MARK}
              </button>
            ) : null}
            {v.done_time === null && v.dont_time === null ? (
              <button
                onClick={() => {
                  props.fn.moveDown(k);
                }}
                ref={v.cache.moveDownButtonRef}
              >
                {MOVE_DOWN_MARK}
              </button>
            ) : null}
            {v.done_time === null && v.dont_time === null ? (
              <button
                onClick={() => {
                  props.fn.unindent(k);
                }}
                ref={v.cache.unindentButtonRef}
              >
                {UNINDENT_MARK}
              </button>
            ) : null}
            {v.done_time === null && v.dont_time === null ? (
              <button
                onClick={() => {
                  props.fn.indent(k);
                }}
                ref={v.cache.indentButtonRef}
              >
                {INDENT_MARK}
              </button>
            ) : null}
            {v.done_time || v.dont_time ? null : (
              <button
                onClick={() => {
                  props.fn.eval_(k);
                }}
              >
                {EVAL_MARK}
              </button>
            )}
            {(v.done_time
              ? DoneToXButtonList
              : v.dont_time
              ? DontToXButtonList
              : TodoToXButtonList
            ).map(b => b(k, props))}

            {v.done_time === null && v.dont_time === null ? (
              <button
                onClick={() => {
                  props.fn.flipShowDetail(k);
                }}
              >
                {DETAIL_MARK}
              </button>
            ) : null}
            {v.cache.percentiles && v.done_time === null && v.dont_time === null
              ? v.cache.percentiles.map(digits1).join(" ")
              : null}
            {v.cache.show_detail ? (
              <div>
                {showLastRange(lastRange(v.ranges), e => {
                  props.fn.setLastRange(k, e.target.value);
                })}
                {v.children.length === 0 ? (
                  <button
                    onClick={() => {
                      props.fn.delete_(k);
                    }}
                  >
                    {DELETE_MARK}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          {Tree(props.kvs[k].children, props)}
        </li>
      );
    });
    return <ol>{list}</ol>;
  }
};

const showLastRange = (l, onChange) => {
  return l === null ? null : (
    <input
      type="number"
      step="any"
      value={(l.end - l.start) / 3600}
      onChange={onChange}
    />
  );
};

const lastRange = ranges => {
  return ranges.length
    ? last(ranges).end === null
      ? lastRange(butLast(ranges))
      : last(ranges)
    : null;
};

const butLast = xs => {
  return xs.length ? xs.slice(0, -1) : xs;
};

const TodoToDoneButton = (k, props) => {
  return XToYButton(DONE_MARK, "todoToDone", k, props);
};

const TodoToDontButton = (k, props) => {
  return XToYButton(DONT_MARK, "todoToDont", k, props);
};

const DoneToTodoButton = (k, props) => {
  return XToYButton(TODO_MARK, "doneToTodo", k, props);
};

const DontToTodoButton = (k, props) => {
  return XToYButton(TODO_MARK, "dontToTodo", k, props);
};

const XToYButton = (title, XToY, k, props) => {
  return (
    <button
      key={XToY + "-" + k}
      onClick={e => {
        props.fn[XToY](k);
      }}
    >
      {title}
    </button>
  );
};

const classOf = entry => {
  return entry.done_time ? "done" : entry.dont_time ? "dont" : "todo";
};

const TodoToXButtonList = [TodoToDoneButton, TodoToDontButton];
const DoneToXButtonList = [DoneToTodoButton];
const DontToXButtonList = [DontToTodoButton];

const last = a => {
  return a[a.length - 1];
};

const digits2 = x => {
  return Math.round(x * 100) / 100;
};

const digits1 = x => {
  return Math.round(x * 10) / 10;
};

const toFront = (a, x) => {
  const i = a.indexOf(x);
  if (i !== -1) {
    a.splice(i, 1);
    a.unshift(x);
  }
  return a;
};
const moveUp = (a, x) => {
  const i = a.indexOf(x);
  if (i > 0) {
    [a[i - 1], a[i]] = [a[i], a[i - 1]];
  }
  return a;
};

const moveDown = (a, x) => {
  const i = a.indexOf(x);
  if (-1 < i && i < a.length - 1) {
    [a[i], a[i + 1]] = [a[i + 1], a[i]];
  }
  return a;
};

const toRear = (a, x) => {
  const i = a.indexOf(x);
  if (i !== -1) {
    a.splice(i, 1);
    a.push(x);
  }
  return a;
};

const deleteAtVal = (a, x) => {
  const i = a.indexOf(x);
  if (i !== -1) {
    a.splice(i, 1);
  }
};

export const cumsum = xs => {
  const ret = [0];
  xs.reduce((total, current, i) => {
    const t = total + current;
    ret.push(t);
    return t;
  }, 0);
  return ret;
};

export const sum = xs => {
  return xs.reduce((total, current) => {
    return total + current;
  }, 0);
};

function* leafs(v, kvs) {
  if (v.done_time === null && v.dont_time === null) {
    if (v.children.length) {
      for (const c of v.children) {
        yield* leafs(kvs[c], kvs);
      }
    } else {
      yield v;
    }
  }
}

export function* multinomial(xs, ws) {
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

const pushHistory = (h, v) => {
  return (h.next = {
    prev: h,
    value: v,
    next: null,
  });
};

const setCache = (k, kvs) => {
  const v = kvs[k];
  if (v.cache === undefined) {
    v.cache = {};
  }
  if (v.cache.total_time_spent === undefined) {
    v.cache.total_time_spent = v.ranges.reduce(
      (total, current) => {
        return current.end === null
          ? total
          : total + (current.end - current.start);
      },
      kvs[k].children.reduce((total, current) => {
        setCache(current, kvs);
        return total + kvs[current].cache.total_time_spent;
      }, 0),
    );
  }
  if (v.cache.percentiles === undefined) {
    // 0, 10, 33, 50, 67, 90, 100
    v.cache.percentiles = null;
  }
  if (v.cache.stopButtonRef === undefined) {
    v.cache.stopButtonRef = React.createRef();
  }
  if (v.cache.moveUpButtonRef === undefined) {
    v.cache.moveUpButtonRef = React.createRef();
  }
  if (v.cache.moveDownButtonRef === undefined) {
    v.cache.moveDownButtonRef = React.createRef();
  }
  if (v.cache.unindentButtonRef === undefined) {
    v.cache.unindentButtonRef = React.createRef();
  }
  if (v.cache.indentButtonRef === undefined) {
    v.cache.indentButtonRef = React.createRef();
  }
  if (v.cache.textareaRef === undefined) {
    v.cache.textareaRef = React.createRef();
  }
  if (v.cache.show_detail === undefined) {
    v.cache.show_detail = false;
  }
};

const isApprox = (x, y) => {
  const atol = 1e-7;
  const rtol = 1e-4;
  return (
    Math.abs(y - x) <= Math.max(atol, rtol * Math.max(Math.abs(x), Math.abs(y)))
  );
};

const assertIsApprox = (actual, expected) => {
  assert(isApprox(actual, expected), actual + " ≉ " + expected);
};

const assert = (v, msg) => {
  if (!v) {
    throw new Error(msg);
  }
};

const main = () => {
  fetch("api/" + API_VERSION + "/get")
    .then(r => r.json())
    .then(data => {
      for (const k of Object.keys(data.kvs)) {
        setCache(k, data.kvs);
      }
      ReactDOM.render(<App data={data} />, document.getElementById("root"));
    });
};

main();
