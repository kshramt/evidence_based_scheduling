import React from "react";
import ReactDOM from "react-dom";
import produce from "immer";

import "./index.css";

// todo: 3) create new child, 4) change-order button
const API_VERSION = "v1";
const CHILDREN_ONLY_FLAG = 0;

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data,
    };
  }
  eval_ = k => {
    this.setState(
      produce(this.state, draft => {
        const candidates = Object.values(draft.data.kvs).filter(v => {
          return v.done_time && v.estimate !== CHILDREN_ONLY_FLAG;
        });
        const ratios = candidates.map(v => {
          return v.cache.total_time_spent / 3600 / v.estimate;
        });
        const weights = candidates.map(v => {
          return 1;
        });
        const rng = multinomial(ratios, weights);
        const leaf_estimates = Array.from(
          leafs(draft.data.kvs[k], draft.data.kvs),
        ).map(v => {
          return v.estimate;
        });
        const ts = [];
        for (let i = 0; i < 101; i++) {
          ts.push(
            sum(
              leaf_estimates.map(x => {
                const r = rng.next().value * x;
                return r;
              }),
            ),
          );
        }
        ts.sort((a, b) => a - b);
        draft.data.kvs[k].cache.percentiles = [
          ts[0],
          ts[10],
          ts[33],
          ts[50],
          ts[67],
          ts[90],
          ts[100],
        ];
      }),
    );
  };
  delete_ = k => {
    this.setState(
      produce(this.state, draft => {
        draft.data.todo = draft.data.todo.filter(x => x !== k);
        const parent = draft.data.kvs[k].parent;
        if (parent !== null) {
          const children = draft.data.kvs[parent].children;
          const i = children.indexOf(k);
          children.splice(i, 1);
        }
        delete draft.data.kvs[k];
      }),
      this.save,
    );
  };
  new_ = parent => {
    this.setState(
      produce(this.state, draft => {
        const k = new Date().toISOString();
        const v = {
          children: [],
          done_time: null,
          dont_time: null,
          estimate: CHILDREN_ONLY_FLAG,
          parent,
          ranges: [],
          text: "",
        };
        draft.data.kvs[k] = v;
        if (parent === null) {
          draft.data.todo.unshift(k);
        } else {
          draft.data.kvs[parent].children.unshift(k);
        }
        setCache(k, draft.data.kvs);
      }),
      this.save,
    );
  };
  save = () => {
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
    });
  };
  start = k => {
    this.setState(
      produce(this.state, draft => {
        if (k !== draft.data.current_entry) {
          this._stop(draft);
          draft.data.kvs[k].ranges.push({
            start: Number(new Date()) / 1000,
            end: null,
          });
          // Move the started entry to the top.
          {
            let ck = k;
            let pk = draft.data.kvs[ck].parent;
            while (pk !== null) {
              toFront(draft.data.kvs[pk].children, ck);
              ck = pk;
              pk = draft.data.kvs[ck].parent;
            }
            toFront(draft.data.todo, ck);
          }
          draft.data.current_entry = k;
        }
      }),
      this.save,
    );
  };
  stop = () => {
    this.setState(produce(this.state, this._stop), this.save);
  };
  _stop = draft => {
    if (draft.data.current_entry !== null) {
      const e = draft.data.kvs[draft.data.current_entry];
      last(e.ranges).end = Number(new Date()) / 1000;
      const r = last(e.ranges);
      const dt = r.end - r.start;
      let node = e;
      while (node) {
        node.cache.total_time_spent += dt;
        node = draft.data.kvs[node.parent];
      }
      draft.data.current_entry = null;
    }
  };
  setEstimate = (k, estimate) => {
    this.setState(
      produce(this.state, draft => {
        draft.data.kvs[k].estimate = Number(estimate);
      }),
      this.save,
    );
  };
  setText = (k, text) => {
    this.setState(
      produce(this.state, draft => {
        draft.data.kvs[k].text = text;
      }),
      this.save,
    );
  };
  rmFromTodo = (state, k) => {
    return produce(state, draft => {
      if (draft.data.current_entry === k) {
        this._stop(draft);
      }
      const pk = draft.data.kvs[k].parent;
      if (pk === null) {
        draft.data.todo = draft.data.todo.filter(x => x !== k);
      } else {
        toRear(draft.data.kvs[pk].children, k);
      }
    });
  };
  rmFromDone = (state, k) => {
    return produce(state, draft => {
      draft.data.kvs[k].done_time = null;
      if (draft.data.kvs[k].parent === null) {
        draft.data.done = draft.data.done.filter(x => x !== k);
      }
    });
  };
  rmFromDont = (state, k) => {
    return produce(state, draft => {
      draft.data.kvs[k].dont_time = null;
      if (draft.data.kvs[k].parent === null) {
        draft.data.dont = draft.data.dont.filter(x => x !== k);
      }
    });
  };
  addToTodo = (state, k) => {
    return produce(state, draft => {
      if (draft.data.kvs[k].parent === null) {
        draft.data.dont.unshift(k);
      }
    });
  };
  addToDone = (state, k) => {
    return produce(state, draft => {
      draft.data.kvs[k].done_time = new Date().toISOString();
      if (draft.data.kvs[k].parent === null) {
        draft.data.dont.unshift(k);
      }
    });
  };
  addToDont = (state, k) => {
    return produce(state, draft => {
      draft.data.kvs[k].dont_time = new Date().toISOString();
      if (draft.data.kvs[k].parent === null) {
        draft.data.dont.unshift(k);
      }
    });
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
    this.setState(this[y](this[x](this.state, k), k), this.save);
  };
  render = () => {
    const fn = {
      eval_: this.eval_,
      delete_: this.delete_,
      start: this.start,
      stop: this.stop,
      new_: this.new_,
      setEstimate: this.setEstimate,
      setText: this.setText,
      todoToDone: this.todoToDone,
      todoToDont: this.todoToDont,
      doneToTodo: this.doneToTodo,
      dontToTodo: this.dontToTodo,
    };

    return (
      <div>
        <div className="header">
          <h1>Evidence Based Scheduling</h1>
        </div>
        <button onClick={this.stop}>Stop</button>
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
      <button
        onClick={() => {
          props.fn.new_(null);
        }}
      >
        New
      </button>
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
      const handleTextChange = e => {
        props.fn.setText(k, e.target.value);
      };
      const handleEstimateChange = e => {
        props.fn.setEstimate(k, e.target.value);
      };
      const v = props.kvs[k];
      return (
        <li key={"li-" + k} className={classOf(v)}>
          <div
            style={
              k === props.current_entry
                ? {
                    backgroundColor: "Moccasin",
                  }
                : null
            }
          >
            <textarea
              key={"text-" + k}
              value={v.text}
              onChange={handleTextChange}
              className={classOf(v)}
            />
            <input
              type="number"
              value={v.estimate}
              onChange={handleEstimateChange}
              className={classOf(v)}
            />
            {v.cache.percentiles
              ? v.cache.percentiles.map(digits2).join(", ")
              : null}
            {v.done_time || v.dont_time ? null : k === props.current_entry ? (
              <button
                onClick={() => {
                  props.fn.stop();
                }}
              >
                Stop
              </button>
            ) : (
              <button
                onClick={() => {
                  props.fn.start(k);
                }}
              >
                Start
              </button>
            )}
            {v.done_time || v.dont_time ? null : (
              <button
                onClick={() => {
                  props.fn.eval_(k);
                }}
              >
                Eval
              </button>
            )}
            {(v.done_time
              ? DoneToXButtonList
              : v.dont_time
              ? DontToXButtonList
              : TodoToXButtonList
            ).map(b => b(k, props))}
            {
              <button
                onClick={() => {
                  props.fn.new_(k);
                }}
              >
                New
              </button>
            }
            {v.children.length &&
            v.done_time === null &&
            v.dont_time === null ? null : (
              <button
                onClick={() => {
                  props.fn.delete_(k);
                }}
              >
                Delete
              </button>
            )}
            {digits2(props.kvs[k].cache.total_time_spent / 3600)}
            {/* {JSON.stringify(v)} */}
          </div>
          {Tree(props.kvs[k].children, props)}
        </li>
      );
    });
    return <ol>{list}</ol>;
  }
};

const TodoToDoneButton = (k, props) => {
  return XToYButton("Done", "todoToDone", k, props);
};

const TodoToDontButton = (k, props) => {
  return XToYButton("Don't", "todoToDont", k, props);
};

const DoneToTodoButton = (k, props) => {
  return XToYButton("To do", "doneToTodo", k, props);
};

const DontToTodoButton = (k, props) => {
  return XToYButton("To do", "dontToTodo", k, props);
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

const toFront = (a, x) => {
  const i = a.indexOf(x);
  if (i !== -1) {
    a.splice(i, 1);
    a.unshift(x);
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

const cumsum = xs => {
  const ret = [];
  xs.reduce((total, current, i) => {
    return (ret[i] = total + current);
  }, 0);
  return ret;
};

const sum = xs => {
  return xs.reduce((total, current) => {
    return total + current;
  }, 0);
};

function* leafs(v, kvs) {
  if (
    v.done_time === null &&
    v.dont_time === null &&
    v.estimate !== CHILDREN_ONLY_FLAG
  ) {
    if (v.children.length) {
      for (const c of v.children) {
        yield* leafs(kvs[c], kvs);
      }
    } else {
      yield v;
    }
  }
}

function* multinomial(xs, ws) {
  const total = sum(ws);
  const partitions = cumsum(ws.map(w => w / total));
  partitions[partitions.length - 1] = 1;
  while (true) {
    const r = Math.random();
    if (r === 0) {
      yield xs[0];
    } else {
      for (const i of ws.keys()) {
        if (partitions[i] < r && r <= partitions[i + 1]) {
          yield xs[i];
        }
      }
    }
  }
}

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
};

fetch("api/" + API_VERSION + "/get")
  .then(r => r.json())
  .then(data => {
    for (const k of Object.keys(data.kvs)) {
      setCache(k, data.kvs);
    }
    ReactDOM.render(<App data={data} />, document.getElementById("root"));
  });
