import React from "react";
import ReactDOM from "react-dom";
import uuidv4 from "uuid/v4";

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
          end: "2019-01-26T06:47:10.000Z",
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
  rmFromTodo = k => {
    return {
      todo: this.state.data.todo.filter(x => x !== k),
    };
  };
  rmFromDone = k => {
    return {
      done: this.state.data.done.filter(x => x !== k),
        kvs:this.newKvs(k,"done_time",null)
    };
  };
  rmFromDont = k => {
    return {
      dont: this.state.data.dont.filter(x => x !== k),
        kvs:this.newKvs(k,"dont_time",null)
    };
  };
  addToTodo = k => {
    return {
      todo: prepend(k, this.state.data.todo),
    };
  };
  addToDone = k => {
    return {
      done: prepend(k, this.state.data.done),
        kvs:this.newKvs(k,"done_time",(new Date()).toISOString())
    };
  };
  addToDont = k => {
    return {
      dont: prepend(k, this.state.data.dont),
        kvs:this.newKvs(k,"dont_time",(new Date()).toISOString())
    };
  };
  todoToDone = k => {
    this.setState({
      data: {
        ...this.state.data,
        ...this.rmFromTodo(k),
        ...this.addToDone(k),
      },
    });
  };
  todoToDont = k => {
    this.setState({
      data: {
        ...this.state.data,
        ...this.rmFromTodo(k),
        ...this.addToDont(k),
      },
    });
  };
  doneToTodo = k => {
    this.setState({
      data: {
        ...this.state.data,
        ...this.rmFromDone(k),
        ...this.addToTodo(k),
      },
    });
  };
  dontToTodo = k => {
    this.setState({
      data: {
        ...this.state.data,
        ...this.rmFromDont(k),
        ...this.addToTodo(k),
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
        <Todo
          ks={this.state.data.todo}
          kvs={this.state.data.kvs}
          fn={fn}
          buttons={[TodoToDoneButton, TodoToDontButton]}
        />
        <Done
          ks={this.state.data.done}
          kvs={this.state.data.kvs}
          fn={fn}
          buttons={[DoneToTodoButton]}
        />
        <Dont
          ks={this.state.data.dont}
          kvs={this.state.data.kvs}
          fn={fn}
          buttons={[DontToTodoButton]}
        />
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

const Tree = (ks, props) => {
  if (ks) {
    const todo_list = ks.map(k => {
      const handleTextChange = e => {
        props.fn.setText(k, e.target.value);
      };
      const v = props.kvs[k];
      return (
        <li key={v.uuid}>
          <textarea key={v.uuid} value={v.text} onChange={handleTextChange} />
          {props.buttons.map(b => b(k, props))}
          {Tree(props.kvs[k].children, props)}
        </li>
      );
    });
    return <ol>{todo_list}</ol>;
  }
};

const Panel = (title, props) => {
  return (
    <div>
      <h1>{title}</h1>
      {Tree(props.ks, props)}
    </div>
  );
};

const TodoToDoneButton = (k, props) => {
  return (
    <button
      className="done"
      onClick={e => {
        props.fn.todoToDone(k);
      }}
    >
      Done
    </button>
  );
};

const TodoToDontButton = (k, props) => {
  return (
    <button
      className="dont"
      onClick={e => {
        props.fn.todoToDont(k);
      }}
    >
      Don't
    </button>
  );
};

const DoneToTodoButton = (k, props) => {
  return (
    <button
      className="todo"
      onClick={e => {
        props.fn.doneToTodo(k);
      }}
    >
      To do
    </button>
  );
};

const DontToTodoButton = (k, props) => {
  return (
    <button
      className="todo"
      onClick={e => {
        props.fn.dontToTodo(k);
      }}
    >
      To do
    </button>
  );
};

const prepend = (x, a) => {
  const ret = a.slice();
  ret.unshift(x);
  return ret;
};

ReactDOM.render(<App data={data} />, document.getElementById("root"));
