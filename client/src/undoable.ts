import * as types from "./types";
import * as producer from "./producer";

export const UNDO_TYPE = "undoable/undo";
export const REDO_TYPE = "undoable/redo";

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
    ++this.i;
    this.buf[this.i] = v;
    this.capacity = this.i + 1;
    return this;
  };

  undo = () => {
    if (0 < this.i) {
      --this.i;
    }
    return this.value();
  };

  redo = () => {
    this.i = Math.min(this.i + 1, this.capacity - 1);
    return this.value();
  };
}

export const undoable_of = (
  reducer_with_patch: (
    state: undefined | types.TState,
    action: types.TAnyPayloadAction,
  ) => {
    state: types.TState;
    patch: producer.TOperation[];
  },
  history_type_set: Set<string>,
  initial_state: types.TState,
) => {
  const history = new History<types.TState>(initial_state);
  const undoable = (
    state: undefined | types.TState,
    action: types.TAnyPayloadAction,
  ) => {
    if (state === undefined) {
      return reducer_with_patch(state, action);
    }
    switch (action.type) {
      case UNDO_TYPE: {
        const next_state = history.undo();
        return { state: next_state, ...producer.compare(state, next_state) };
      }
      case REDO_TYPE: {
        const next_state = history.redo();
        return { state: next_state, ...producer.compare(state, next_state) };
      }
      default: {
        const reduced = reducer_with_patch(state, action);
        if (history_type_set.has(action.type)) {
          history.push(reduced.state);
        }
        return reduced;
      }
    }
  };
  return undoable;
};

export const history_type_set = new Set<string>();
export const register_history_type = <T extends { toString: () => string }>(
  x: T,
) => {
  history_type_set.add(x.toString());
  return x;
};
