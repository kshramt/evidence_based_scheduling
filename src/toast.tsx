import React from "react";

import * as consts from "./consts";
import * as utils from "./utils";

const severity_values = ["error", "info"] as const;
type TSeverity = typeof severity_values[number];

interface IMessage {
  text: string;
  id: number;
  severity: TSeverity;
}
type TState = IMessage[];

const initial_state: TState = [];

const store_of = () => {
  let state = initial_state;
  let id_seq = 0;
  const listeners = new Set<() => void>();
  const call = (fn: () => void) => fn();
  const set_state = (update: (state: TState) => TState) => {
    state = update(state);
    listeners.forEach(call);
  };
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        set_state((_) => initial_state);
      };
    },
    get_state: () => state,
    add: (severity: TSeverity, text: string) => {
      const id = (id_seq += 1);
      set_state((prev) => {
        const message = { severity, text, id };
        return [...prev, message];
      });
      return id;
    },
    delete: (id: number) =>
      set_state((prev) => {
        return prev.filter((message) => message.id !== id);
      }),
  };
};

const store = store_of();

const Component = () => {
  const state = React.useSyncExternalStore(store.subscribe, store.get_state);
  return (
    <ul className="list-none fixed z-[999999] font-bold p-[1em] bottom-4 right-4">
      {state.map((message) => (
        <li
          key={message.id}
          className={utils.join(
            "flex items-baseline gap-x-[1em] dark:text-gray-200 p-[0.5em] mb-[1em] last:mb-0",
            message.severity === "error"
              ? "bg-red-300 dark:bg-red-700"
              : "bg-blue-300 dark:bg-blue-700",
          )}
        >
          <button
            className="btn-icon bg-inherit hover:bg-inherit hover:border-solid hover:border-2 hover:border-gray-400"
            onClick={() => {
              store.delete(message.id);
            }}
          >
            {consts.DELETE_MARK}
          </button>
          <div className="w-[20em] break-words">{message.text}</div>
        </li>
      ))}
    </ul>
  );
};

export const component = <Component />;
export const add = (
  severity: TSeverity,
  text: string,
  duration: number = 50000,
) => {
  const id = store.add(severity, text);
  if (0 < duration) {
    setTimeout(() => store.delete(id), duration);
  }
};
