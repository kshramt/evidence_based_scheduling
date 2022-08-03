import * as immer from "immer";

import * as types from "./types";
import * as producer from "./producer";

export const UNDO_TYPE = "undoable/undo";
export const REDO_TYPE = "undoable/redo";

class PatchHistory<T> {
  capacity: number;
  i: number;
  i_guard: number;
  buf: T[];
  constructor(i_guard: number) {
    this.capacity = 0;
    this.i = -1;
    this.i_guard = i_guard;
    this.buf = [];
  }

  value = () => this.buf[this.i];

  push = (v: T) => {
    ++this.i;
    this.buf[this.i] = v;
    this.capacity = this.i + 1;
    return this;
  };

  undo = (): { shifted: true; value: T } | { shifted: false } => {
    const shifted = this.i_guard < this.i;
    if (!shifted) {
      return { shifted };
    }
    const value = this.value();
    --this.i;
    return { value, shifted };
  };

  redo = (): { shifted: true; value: T } | { shifted: false } => {
    const shifted = this.i < this.capacity - 1;
    if (!shifted) {
      return { shifted };
    }
    ++this.i;
    return { value: this.value(), shifted };
  };
}

export const undoable_of = (
  reducer_with_patch: (
    state: undefined | types.IState,
    action: types.TAnyPayloadAction,
  ) => {
    state: types.IState;
    patch: producer.TOperation[];
    reverse_patch: producer.TOperation[];
  },
  history_type_set: Set<string>,
) => {
  const history = new PatchHistory<{
    patch: producer.TOperation[];
    reverse_patch: producer.TOperation[];
  }>(-1);
  const undoable = (
    state: undefined | types.IState,
    action: types.TAnyPayloadAction,
  ) => {
    if (state === undefined) {
      return reducer_with_patch(state, action);
    }
    switch (action.type) {
      case UNDO_TYPE: {
        const h = history.undo();
        if (!h.shifted) {
          return { state, patch: [], reverse_patch: [] };
        }
        const produced = immer.produce(
          { state, patch: h.value.reverse_patch },
          (draft) => {
            producer.apply_patch(draft.state, draft.patch);
          },
        );
        return {
          state: produced.state,
          patch: h.value.reverse_patch,
          reverse_patch: h.value.patch,
        };
      }
      case REDO_TYPE: {
        const h = history.redo();
        if (!h.shifted) {
          return { state, patch: [], reverse_patch: [] };
        }
        const produced = immer.produce(
          { state, patch: h.value.patch },
          (draft) => {
            producer.apply_patch(draft.state, draft.patch);
          },
        );
        return {
          state: produced.state,
          patch: h.value.patch,
          reverse_patch: h.value.reverse_patch,
        };
      }
      default: {
        const reduced = reducer_with_patch(state, action);
        if (
          history_type_set.has(action.type) &&
          (reduced.patch.length || reduced.reverse_patch.length)
        ) {
          history.push({
            patch: reduced.patch,
            reverse_patch: reduced.reverse_patch,
          });
        }
        return reduced;
      }
    }
  };
  return undoable;
};
