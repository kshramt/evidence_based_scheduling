import * as types from "./types";

import * as immer from "immer";

type IfVoid<P, T, F> = [void] extends [P] ? T : F;
type TReduce<State, Payload> = (
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
type TActionOf<Payload> = IfVoid<
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

export const reducer_of = <State>(
  initial_state_of: () => State,
  ctor: (
    builder: <Payload, Type extends string>(
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
      return initial_state_of();
    }
    const reduce = map[action.type];
    return reduce
      ? immer.produce(state, (draft) => reduce(draft, action))
      : state;
  };
  return reducer;
};

export const reducer_with_patches_of = <State>(
  initial_state_of: () => State,
  ctor: (
    builder: <Payload, Type extends string>(
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
      return { state: initial_state_of(), patches: [], reverse_patches: [] };
    }
    const reduce = map[action.type];
    if (!reduce) {
      return { state, patches: [], reverse_patches: [] };
    }
    const [new_state, patches, reverse_patches] = immer.produceWithPatches(
      state,
      (draft) => reduce(draft, action),
    );
    return { state: new_state, patches, reverse_patches };
  };
  return reducer;
};
