import { test, expect } from "@playwright/experimental-ct-react";
import * as T from "./next_action_predictor";

test("TriGramPredictor(1)", () => {
  const predictor = new T.TriGramPredictor(1);
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

test("TriGramPredictor(0.9)", () => {
  const predictor = new T.TriGramPredictor(0.9);
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

test("BiGramPredictor(1)", () => {
  const predictor = new T.BiGramPredictor(1);
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

test("BiGramPredictor(0.9)", () => {
  const predictor = new T.BiGramPredictor(0.9);
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
