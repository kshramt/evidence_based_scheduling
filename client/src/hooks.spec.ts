import { expect, test } from "vitest";
import { selectQueues } from "./hooks";
import type { TNodeId } from "./types";

test("queue consumers share results and keep priority and Ctime order", () => {
  const a = "a" as TNodeId;
  const b = "b" as TNodeId;
  const c = "c" as TNodeId;
  const state: Parameters<typeof selectQueues>[0] = {
    data: { queue: { [a]: 3, [b]: 2, [c]: 1 } },
    swapped_nodes: {
      status: { [a]: "todo", [b]: "todo", [c]: "done" },
      start_time: { [a]: 1, [b]: 2, [c]: 3 },
    },
  };
  const queues = selectQueues(state);
  expect(selectQueues({ ...state, data: { ...state.data } })).toBe(queues);
  expect(queues).toEqual({
    todoQueue: [a, b],
    nonTodoQueue: [c],
    todoQueueCtime: [b, a],
    nonTodoQueueCtime: [c],
  });
  expect(
    selectQueues({
      ...state,
      swapped_nodes: {
        ...state.swapped_nodes,
        start_time: { [a]: 4, [b]: 2, [c]: 3 },
      },
    }).todoQueueCtime,
  ).toEqual([a, b]);
  expect(
    selectQueues({ ...state, data: { queue: { [a]: 3, [b]: 4, [c]: 1 } } })
      .todoQueue,
  ).toEqual([b, a]);
  expect(selectQueues(state)).not.toBe(queues);
  expect(selectQueues(state)).toEqual(queues);
});
