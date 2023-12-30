import * as Rtk from "@reduxjs/toolkit";

import * as types from "./types";

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

export const undoableOf = (
  reducer: (state: types.TState, action: Rtk.UnknownAction) => types.TState,
  initialState: types.TState,
) => {
  const history = new History(initialState);
  const undoable = (
    state: undefined | types.TState,
    action: Rtk.UnknownAction,
  ) => {
    if (state === undefined) {
      return initialState;
    }
    switch (action.type) {
      case UNDO_TYPE: {
        return history.undo();
      }
      case REDO_TYPE: {
        return history.redo();
      }
      default: {
        const nextState = reducer(state, action);
        if (history_type_set.has(action.type)) {
          history.push(nextState);
        }
        return nextState;
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
