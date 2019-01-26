import React from "react";
import ReactDOM from "react-dom";
import uuidv4 from "uuid/v4";

import "./index.css";

const data = {
  todo: [
    {
      uuid: "94f059ac-d2ce-4db3-8dd3-e184d4516e41",
      text: "evidence_based_schedulingを完成させること．",
      estimate: 30,
      todo_time: "2019-01-26T19:55:00+0900",
      done_time: null,
      dont_time: null,
      ranges: [
        {
          start: "2019-01-26T10:00:00+0900",
          end: "2019-01-26T13:05:02+0900",
        },
      ],
      children: [],
    },
    {
      uuid: "45ee82b9-cc4b-424c-b2ab-b4e3e2fcef2f",
      text: "荷物組み立て．",
      estimate: 1.5,
      todo_time: "2019-01-26T12:58:27+0900",
      done_time: null,
      dont_time: null,
      ranges: [],
      children: [],
    },
    null,
  ],
  done: [null],
  dont: [null],
};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: data,
    };
  }
  render = () => {
    const fn = {
      setTodoText: (i, text) => {
        const v = {
          ...this.state.data.todo[i],
          text,
        };
        const todo = setIndex(this.state.data.todo, i, v);

        this.setState({
          data: {
            ...data,
            todo,
          },
        });
      },
    };
    return (
      <div className="app">
        {" "}
        <div className="header">
          <h1>Evidence Based Scheduling</h1>
        </div>
        <Todo data={this.state.data.todo} fn={fn} />
        <Done data={this.state.data.done} fn={fn} />
        <Dont data={this.state.data.dont} fn={fn} />
      </div>
    );
  };
}

const Todo = props => {
  const todo_list = props.data
    .filter(v => v !== null)
    .map((v, i) => {
      const handleChange = e => {
        props.fn.setTodoText(i, e.target.value);
      };
      return (
        <li key={v.uuid}>
          <textarea key={v.uuid} value={v.text} onChange={handleChange} />
        </li>
      );
    });
  return (
    <div className="todo">
      <h1>TODO</h1>
      <ol className="todo-list">{todo_list}</ol>
    </div>
  );
};

const Done = props => {
  return (
    <div className="done">
      <h1>Done</h1>
    </div>
  );
};

const Dont = props => {
  return (
    <div className="dont">
      <h1>Don't</h1>
    </div>
  );
};

const setIndex = (a, i, v) => {
  const ret = [...a];
  ret[i] = v;
  return ret;
};

ReactDOM.render(<App data={data} />, document.getElementById("root"));
