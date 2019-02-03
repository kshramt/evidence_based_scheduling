import React from "react";
import ReactDOM from "react-dom";
import produce from "immer";

import "./index.css";

// todo: 3) create new child, 4) change-order button

const API_VERSION = "v1";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data,
    };
  }
  delete_ = k => {
    this.setState(
      produce(this.state, draft => {
        draft.data.todo = draft.data.todo.filter(x => x !== k);
        for (const v of Object.values(draft.data.kvs)) {
          const i = v.children.indexOf(k);
          if (i !== -1) {
            v.children.splice(i, 1);
            break;
          }
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
          estimate: 1,
          ranges: [],
          text: "",
        };
        draft.data.kvs[k] = v;
        if (parent === null) {
          draft.data.todo = prepend(k, draft.data.todo);
        } else {
          draft.data.kvs[parent].children = prepend(
            k,
            draft.data.kvs[k].children,
          );
        }
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
      body: JSON.stringify(this.state.data),
    });
  };
  start = k => {
    this.setState(
      produce(this.state, draft => {
        if (k !== draft.data.current_entry) {
          this._stop(draft);
          draft.data.kvs[k].ranges = append(draft.data.kvs[k].ranges, {
            start: new Date().toISOString(),
            end: null,
          });
          draft.data.current_entry = k;
        }
      }),
      this.save,
    );
  };
  stop = () => {
    this.setState(produce(this.state, this._stop));
  };
  _stop = draft => {
    if (draft.data.current_entry !== null) {
      last(
        draft.data.kvs[draft.data.current_entry].ranges,
      ).end = new Date().toISOString();
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
  rmFromTodo = (state, k, depth) => {
    return produce(state, draft => {
      if (draft.data.current_entry === k) {
        this._stop(draft);
      }
      if (depth === 0) {
        draft.data.todo = draft.data.todo.filter(x => x !== k);
      }
    });
  };
  rmFromDone = (state, k, depth) => {
    return produce(state, draft => {
      draft.data.kvs[k].done_time = null;
      if (depth === 0) {
        draft.data.done = draft.data.done.filter(x => x !== k);
      }
    });
  };
  rmFromDont = (state, k, depth) => {
    return produce(state, draft => {
      draft.data.kvs[k].dont_time = null;
      if (depth === 0) {
        draft.data.dont = draft.data.dont.filter(x => x !== k);
      }
    });
  };
  addToTodo = (state, k, depth) => {
    return produce(state, draft => {
      if (depth === 0) {
        draft.data.todo = prepend(k, draft.data.todo);
      }
    });
  };
  addToDone = (state, k, depth) => {
    return produce(state, draft => {
      draft.data.kvs[k].done_time = new Date().toISOString();
      if (depth === 0) {
        draft.data.done = prepend(k, draft.data.done);
      }
    });
  };
  addToDont = (state, k, depth) => {
    return produce(state, draft => {
      draft.data.kvs[k].dont_time = new Date().toISOString();
      if (depth === 0) {
        draft.data.dont = prepend(k, draft.data.dont);
      }
    });
  };
  todoToDone = (k, depth) => {
    this.xToY("rmFromTodo", "addToDone", k, depth);
  };
  todoToDont = (k, depth) => {
    this.xToY("rmFromTodo", "addToDont", k, depth);
  };
  doneToTodo = (k, depth) => {
    this.xToY("rmFromDone", "addToTodo", k, depth);
  };
  dontToTodo = (k, depth) => {
    this.xToY("rmFromDont", "addToTodo", k, depth);
  };
  xToY = (x, y, k, depth) => {
    this.setState(this[y](this[x](this.state, k, depth), k, depth), this.save);
  };
  render = () => {
    const fn = {
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
        <button onClick={this.save}>Save</button>
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
      {Tree(props.ks, props, 0)}
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
      {Tree(props.ks, props, 0)}
    </div>
  );
};

const Tree = (ks, props, depth) => {
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
            <input
              type="number"
              value={v.estimate}
              onChange={handleEstimateChange}
              className={classOf(v)}
            />
            <textarea
              key={"text-" + k}
              value={v.text}
              onChange={handleTextChange}
              className={classOf(v)}
            />
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
            {(v.done_time
              ? DoneToXButtonList
              : v.dont_time
              ? DontToXButtonList
              : TodoToXButtonList
            ).map(b => b(k, depth, props))}
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
            {JSON.stringify(v)}
          </div>
          {Tree(props.kvs[k].children, props, depth + 1)}
        </li>
      );
    });
    return <ol>{list}</ol>;
  }
};

const TodoToDoneButton = (k, depth, props) => {
  return XToYButton("Done", "todoToDone", k, depth, props);
};

const TodoToDontButton = (k, depth, props) => {
  return XToYButton("Don't", "todoToDont", k, depth, props);
};

const DoneToTodoButton = (k, depth, props) => {
  return XToYButton("To do", "doneToTodo", k, depth, props);
};

const DontToTodoButton = (k, depth, props) => {
  return XToYButton("To do", "dontToTodo", k, depth, props);
};

const XToYButton = (title, XToY, k, depth, props) => {
  return (
    <button
      key={XToY + "-" + k}
      onClick={e => {
        props.fn[XToY](k, depth);
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

const prepend = (x, a) => {
  const ret = a.slice();
  ret.unshift(x);
  return ret;
};
const append = (a, x) => {
  const ret = a.slice();
  ret.push(x);
  return ret;
};

const last = a => {
  return a[a.length - 1];
};

fetch("api/" + API_VERSION + "/get")
  .then(r => r.json())
  .then(data => {
    ReactDOM.render(<App data={data} />, document.getElementById("root"));
  });
