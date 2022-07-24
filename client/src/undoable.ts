import * as immer from "immer";

import * as types from "./types";

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
  reducer_with_patches: (
    state: undefined | types.IState,
    action: types.TAnyPayloadAction,
  ) => {
    state: types.IState;
    patches: immer.Patch[];
    reverse_patches: immer.Patch[];
  },
  history_type_set: Set<string>,
) => {
  const history = new PatchHistory<{
    patches: immer.Patch[];
    reverse_patches: immer.Patch[];
  }>(-1);
  const undoable = (
    state: undefined | types.IState,
    action: types.TAnyPayloadAction,
  ) => {
    if (state === undefined) {
      return reducer_with_patches(state, action);
    }
    switch (action.type) {
      case UNDO_TYPE: {
        const h = history.undo();
        if (!h.shifted) {
          return { state, patches: [], reverse_patches: [] };
        }
        return {
          state: immer.applyPatches(state, h.value.reverse_patches),
          patches: h.value.reverse_patches,
          reverse_patches: h.value.patches,
        };
      }
      case REDO_TYPE: {
        const h = history.redo();
        if (!h.shifted) {
          return { state, patches: [], reverse_patches: [] };
        }
        return {
          state: immer.applyPatches(state, h.value.patches),
          patches: h.value.patches,
          reverse_patches: h.value.reverse_patches,
        };
      }
      default: {
        const reduced = reducer_with_patches(state, action);
        if (
          history_type_set.has(action.type) &&
          (reduced.patches.length || reduced.reverse_patches.length)
        ) {
          history.push({
            patches: reduced.patches,
            reverse_patches: reduced.reverse_patches,
          });
        }
        return reduced;
      }
    }
  };
  return undoable;
};
