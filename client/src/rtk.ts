import * as immer from "immer";

import * as types from "./types";
import * as producer from "./producer";

type IfVoid<P, T, F> = [void] extends [P] ? T : F;
export type TReduce<State, Payload> = (
  state: immer.Draft<State>,
  action: ReturnType<TActionOf<Payload>>,
) =>
  | void
  | undefined
  | (immer.Draft<State> extends undefined ? typeof immer.nothing : never)
  | immer.Draft<State>;
type TActionOfWithoutPayload = {
  (): types.TActionWithoutPayload;
  toString: () => string;
  type: string;
};
type TActionOfWithPayload<Payload> = {
  (payload: Payload): types.TActionWithPayload<Payload>;
  toString: () => string;
  type: string;
};
export type TActionOf<Payload> = IfVoid<
  Payload,
  TActionOfWithoutPayload,
  TActionOfWithPayload<Payload>
>;

export function action_of_of<Payload = void>(type: string): TActionOf<Payload>;
export function action_of_of<Payload = void>(type: string) {
  const action_of = (payload: Payload) => {
    return payload === undefined ? { type } : { type, payload };
  };
  action_of.toString = () => type;
  action_of.type = type;
  return action_of;
}

export function async_thunk_of_of<Payload, Rejected = Error>(
  type_prefix: string,
  payload_of: () => Promise<Payload>,
) {
  const pending = action_of_of(`${type_prefix}/pending`);
  const fulfilled = action_of_of<Payload>(`${type_prefix}/fulfilled`);
  const rejected = action_of_of<Rejected>(`${type_prefix}/rejected`);
  const async_thunk_of = () => {
    return async (
      dispatch: (
        action:
          | ReturnType<typeof pending>
          | ReturnType<typeof fulfilled>
          | ReturnType<typeof rejected>,
      ) => void,
    ) => {
      dispatch(pending());
      try {
        const payload = await payload_of();
        dispatch(fulfilled(payload));
      } catch (e: any) {
        dispatch(rejected(e));
      }
    };
  };
  async_thunk_of.pending = pending;
  async_thunk_of.fulfilled = fulfilled;
  async_thunk_of.rejected = rejected;
  return async_thunk_of;
}

export const reducer_with_patch_of = <State extends {}>(
  initial_state: State,
  ctor: (
    builder: <Payload>(
      action_of: TActionOf<Payload>,
      reduce: TReduce<State, Payload>,
    ) => void,
  ) => void,
) => {
  const map: Record<string, TReduce<State, any> | TReduce<State, void>> = {};
  ctor((action_of, reduce) => {
    map[action_of.type] = reduce;
  });

  const reducer = (
    state: undefined | State,
    action: types.TAnyPayloadAction,
  ) => {
    if (state === undefined) {
      return { state: initial_state, patch: [], reverse_patch: [] };
    }
    const reduce = map[action.type];
    if (!reduce) {
      return { state, patch: [], reverse_patch: [] };
    }
    const produced = producer.produce_with_patche(state, (draft) =>
      reduce(draft, action),
    );
    return {
      state: produced.value,
      patch: produced.patch,
      reverse_patch: produced.reverse_patch,
    };
  };
  return reducer;
};
