import { test, expect, vi } from "vitest";
import * as T from "./utils";

test("focuses an offscreen task as soon as the first scroll reveals it", async () => {
  const task = document.createElement("textarea");
  task.id = "focus-test-task";
  document.body.append(task);
  const bounds = vi.spyOn(task, "getBoundingClientRect");
  bounds.mockReturnValue(new DOMRect(0, window.innerHeight + 1, 10, 10));
  const scroll = vi.spyOn(task, "scrollIntoView").mockImplementation(() => {
    bounds.mockReturnValue(new DOMRect(0, 0, 10, 10));
  });

  try {
    const focused = T.focusRobustly(task.id);
    await Promise.resolve();
    expect(document.activeElement).toBe(task);
    await focused;
    expect(scroll).toHaveBeenCalledTimes(1);
  } finally {
    scroll.mockRestore();
    bounds.mockRestore();
    task.remove();
  }
});

test("dnd_move", () => {
  expect(T.dnd_move([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
  expect(T.dnd_move([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
  expect(T.dnd_move([1, 2, 3, 4, 5], 1, 3)).toEqual([1, 3, 4, 2, 5]);
  expect(T.dnd_move([0, 1, 2, 3, 4], 3, 1)).toEqual([0, 3, 1, 2, 4]);
  expect(T.dnd_move([0, 1, 2, 3, 4], 3, 1)).toEqual([0, 3, 1, 2, 4]);
});

test("sum", () => {
  expect(T.sum([1, 2, 3])).toEqual(6);
});

test("cumsum", () => {
  expect(T.cumsum([1, 2, 3])).toEqual([0, 1, 3, 6]);
});

test.each([
  { weights: [1], drawsPerColumn: 2, counts: [2] },
  { weights: [1, 1], drawsPerColumn: 2, counts: [2, 2] },
  { weights: [1, 2, 3], drawsPerColumn: 2, counts: [1, 2, 3] },
  { weights: [0, 1], drawsPerColumn: 2, counts: [0, 4] },
  {
    weights: [...Array<number>(999).fill(1), 101],
    drawsPerColumn: 11,
    counts: [...Array<number>(999).fill(10), 1010],
  },
])(
  "Multinomial distributes $weights.length columns by weight",
  ({ weights, drawsPerColumn, counts }) => {
    const sampler = new T.Multinomial(weights);
    const actual = weights.map(() => 0);
    const random = vi.spyOn(Math, "random");
    try {
      // Sample the center of each equal segment to avoid threshold boundaries.
      for (let column = 0; column < weights.length; column++) {
        for (let draw = 0; draw < drawsPerColumn; draw++) {
          random
            .mockReturnValueOnce((column + 0.5) / weights.length)
            .mockReturnValueOnce((draw + 0.5) / drawsPerColumn);
          actual[sampler.sample()]++;
        }
      }
      expect(actual).toEqual(counts);
    } finally {
      random.mockRestore();
    }
  },
);

test("Multinomial uses the alias when the draw equals the threshold", () => {
  const sampler = new T.Multinomial([1, 3]);
  const random = vi
    .spyOn(Math, "random")
    .mockReturnValueOnce(0)
    .mockReturnValueOnce(0.5);
  try {
    expect(sampler.sample()).toBe(1);
  } finally {
    random.mockRestore();
  }
});
