import { TriGramPredictor, BiGramPredictor } from "./next_action_predictor";

it("TriGramPredictor(1)", () => {
  const predictor = new TriGramPredictor(1);
  expect(predictor.fit(0).predict()).toEqual([]);
  expect(predictor.fit(1).predict()).toEqual([]);
  expect(predictor.fit(2).predict()).toEqual([]);
  expect(predictor.fit(0).predict()).toEqual([]);
  expect(predictor.fit(1).predict()).toEqual([2]);
  expect(predictor.fit(2).predict()).toEqual([0]);
  expect(predictor.fit(3).predict()).toEqual([]);
  expect(predictor.fit(1).predict()).toEqual([]);
  expect(new Set(predictor.fit(2).predict())).toEqual(new Set([0, 3]));
});

it("TriGramPredictor(0.9)", () => {
  const predictor = new TriGramPredictor(0.9);
  expect(predictor.fit(0).predict()).toEqual([]);
  expect(predictor.fit(1).predict()).toEqual([]);
  expect(predictor.fit(2).predict()).toEqual([]);
  expect(predictor.fit(0).predict()).toEqual([]);
  expect(predictor.fit(1).predict()).toEqual([2]);
  expect(predictor.fit(2).predict()).toEqual([0]);
  expect(predictor.fit(3).predict()).toEqual([]);
  expect(predictor.fit(1).predict()).toEqual([]);
  expect(predictor.fit(2).predict()).toEqual([3, 0]);
});

it("BiGramPredictor(1)", () => {
  const predictor = new BiGramPredictor(1);
  expect(predictor.fit(0).predict()).toEqual([]);
  expect(predictor.fit(1).predict()).toEqual([]);
  expect(predictor.fit(2).predict()).toEqual([]);
  expect(predictor.fit(0).predict()).toEqual([1]);
  expect(predictor.fit(1).predict()).toEqual([2]);
  expect(predictor.fit(2).predict()).toEqual([0]);
  expect(predictor.fit(3).predict()).toEqual([]);
  expect(predictor.fit(1).predict()).toEqual([2]);
  expect(new Set(predictor.fit(2).predict())).toEqual(new Set([0, 3]));
});

it("BiGramPredictor(0.9)", () => {
  const predictor = new BiGramPredictor(0.9);
  expect(predictor.fit(0).predict()).toEqual([]);
  expect(predictor.fit(1).predict()).toEqual([]);
  expect(predictor.fit(2).predict()).toEqual([]);
  expect(predictor.fit(0).predict()).toEqual([1]);
  expect(predictor.fit(1).predict()).toEqual([2]);
  expect(predictor.fit(2).predict()).toEqual([0]);
  expect(predictor.fit(3).predict()).toEqual([]);
  expect(predictor.fit(1).predict()).toEqual([2]);
  expect(predictor.fit(2).predict()).toEqual([3, 0]);
});
