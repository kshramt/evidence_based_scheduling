import React from "react";
import ReactDOM from "react-dom";
import { v4 as uuid } from "uuid";

import "./index.css";

const data = {
  kvs: {
    "94f059ac-d2ce-4db3-8dd3-e184d4516e41": {
      text: "evidence_based_schedulingを完成させること．",
      estimate: 30,
      todo_time: "2019-01-26T01:55:00.000Z",
      done_time: null,
      dont_time: null,
      ranges: [
        {
          start: "2019-01-26T01:00:00.000Z",
          end: "2019-01-26T04:05:02.000Z",
        },
        {
          start: "2019-01-26T05:15:00.000Z",
          end: "2019-01-26T10:00:00.000Z",
        },
      ],
      children: [],
    },
    "45ee82b9-cc4b-424c-b2ab-b4e3e2fcef2f": {
      text: "荷物組み立て．",
      estimate: 1.5,
      todo_time: "2019-01-26T03:06:27.000Z",
      done_time: "2019-01-26T06:13:04.000Z",
      dont_time: null,
      ranges: [
        {
          start: "2019-01-26T04:15:00.000Z",
          end: "2019-01-26T05:00:00.000Z",
        },
      ],
      children: [],
    },
  },
  todo: ["94f059ac-d2ce-4db3-8dd3-e184d4516e41"],
  done: ["45ee82b9-cc4b-424c-b2ab-b4e3e2fcef2f"],
  dont: [],
};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data,
    };
  }
  newKvs = (k, vk, vv) => {
    const v = {
      ...this.state.data.kvs[k],
      [vk]: vv,
    };
    return {
      ...this.state.data.kvs,
      [k]: v,
    };
  };
  setText = (k, text) => {
    this.setState({
      data: {
        ...this.state.data,
        kvs: this.newKvs(k, "text", text),
      },
    });
  };
  rmFromTodo = (k, depth) => {
    const ret = {};
    if (depth === 0) {
      ret["todo"] = this.state.data.todo.filter(x => x !== k);
    }
    return ret;
  };
  rmFromDone = (k, depth) => {
    const ret = {
      kvs: this.newKvs(k, "done_time", null),
    };
    if (depth === 0) {
      ret["done"] = this.state.data.done.filter(x => x !== k);
    }
    return ret;
  };
  rmFromDont = (k, depth) => {
    const ret = {
      kvs: this.newKvs(k, "dont_time", null),
    };
    if (depth === 0) {
      ret["dont"] = this.state.data.dont.filter(x => x !== k);
    }
    return ret;
  };
  addToTodo = (k, depth) => {
    const ret = {};
    if (depth === 0) {
      ret["todo"] = prepend(k, this.state.data.todo);
    }
    return ret;
  };
  addToDone = (k, depth) => {
    const ret = {
      kvs: this.newKvs(k, "done_time", new Date().toISOString()),
    };
    if (depth === 0) {
      ret["done"] = prepend(k, this.state.data.done);
    }
    return ret;
  };
  addToDont = (k, depth) => {
    const ret = {
      kvs: this.newKvs(k, "dont_time", new Date().toISOString()),
    };
    if (depth === 0) {
      ret["dont"] = prepend(k, this.state.data.dont);
    }
    return ret;
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
    this.setState({
      data: {
        ...this.state.data,
        ...this[x](k, depth),
        ...this[y](k, depth),
      },
    });
  };
  render = () => {
    const fn = {
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
        <Todo ks={this.state.data.todo} kvs={this.state.data.kvs} fn={fn} />
        <Done ks={this.state.data.done} kvs={this.state.data.kvs} fn={fn} />
        <Dont ks={this.state.data.dont} kvs={this.state.data.kvs} fn={fn} />
      </div>
    );
  };
}

const Todo = props => {
  return Panel("To do", props);
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
    const todo_list = ks.map(k => {
      const handleTextChange = e => {
        props.fn.setText(k, e.target.value);
      };
      const v = props.kvs[k];
      return (
        <li key={v.uuid} className={
classOf(v)
}>
          <textarea key={v.uuid} value={v.text} onChange={handleTextChange} className={
classOf(v)
}/>
          {(v.done_time
            ? DoneToXButtonList
            : v.dont_time
            ? DontToXButtonList
            : TodoToXButtonList
          ).map(b => b(k, depth, props))}
          {JSON.stringify(v)}
          {Tree(props.kvs[k].children, props, depth + 1)}
        </li>
      );
    });
    return <ol>{todo_list}</ol>;
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
      onClick={e => {
        props.fn[XToY](k, depth);
      }}
    >
      {title}
    </button>
  );
};

const classOf=(entry)=>{
return entry.done_time?"done":entry.dont_time?"dont":"todo"
}

const TodoToXButtonList = [TodoToDoneButton, TodoToDontButton];
const DoneToXButtonList = [DoneToTodoButton];
const DontToXButtonList = [DontToTodoButton];

const prepend = (x, a) => {
  const ret = a.slice();
  ret.unshift(x);
  return ret;
};

ReactDOM.render(<App data={data} />, document.getElementById("root"));
