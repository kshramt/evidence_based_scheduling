import * as Rtk from "@reduxjs/toolkit";
import * as Immer from "immer";

import * as types from "./types";

export const UNDO_TYPE = "undoable/undo";
export const REDO_TYPE = "undoable/redo";

Immer.enablePatches();

type Step = { forward: Immer.Patch[]; inverse: Immer.Patch[] };

class History {
  #snapshot: types.TState;
  #steps: Step[] = [];
  #index = 0;
  // Cache/UI updates belong to the next recorded snapshot, not their own step.
  #pending: Step[] = [];

  constructor(initial: types.TState) {
    this.#snapshot = initial;
  }

  record = (nextState: types.TState, step: Step, tracked: boolean) => {
    if (!tracked) {
      if (step.forward.length > 0) this.#pending.push(step);
      return;
    }
    if (this.#snapshot !== nextState) {
      this.#steps.length = this.#index;
      this.#steps.push({
        forward: this.#pending
          .flatMap((pending) => pending.forward)
          .concat(step.forward),
        inverse: step.inverse.concat(
          this.#pending.toReversed().flatMap((pending) => pending.inverse),
        ),
      });
      this.#index++;
      this.#snapshot = nextState;
    }
    this.#pending = [];
  };

  undo = () => {
    this.#pending = [];
    if (this.#index > 0) {
      this.#snapshot = Immer.applyPatches(
        this.#snapshot,
        this.#steps[--this.#index].inverse,
      );
    }
    return this.#snapshot;
  };

  redo = () => {
    this.#pending = [];
    if (this.#index < this.#steps.length) {
      this.#snapshot = Immer.applyPatches(
        this.#snapshot,
        this.#steps[this.#index++].forward,
      );
    }
    return this.#snapshot;
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
        const [nextState, forward, inverse] = Immer.produceWithPatches(
          state,
          (draft) => {
            const value = reducer(draft, action);
            if (value !== draft) return Immer.castDraft(value);
            return undefined;
          },
        );
        history.record(
          nextState,
          { forward, inverse },
          history_type_set.has(action.type),
        );
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
