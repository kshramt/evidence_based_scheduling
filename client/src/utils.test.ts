import { sum, cumsum, Multinomial } from "./utils";

it("sum", () => {
  expect(sum([1, 2, 3])).toEqual(6);
});

it("cumsum", () => {
  expect(cumsum([1, 2, 3])).toEqual([0, 1, 3, 6]);
});

it("Multinomial", () => {
  {
    const vals = [9, 8, 7];
    const rng = new Multinomial([1, 2, 3]);
    const ns = [];
    for (let i = 0; i < 300000; i++) {
      ns.push(vals[rng.sample()]);
    }
    const _9 = ns.filter((x) => x === 9);
    const _8 = ns.filter((x) => x === 8);
    const _7 = ns.filter((x) => x === 7);
    expect(
      1.95 <= _8.length / _9.length && _8.length / _9.length <= 2.05,
    ).toBeTruthy();
    expect(
      2.95 <= _7.length / _9.length && _7.length / _9.length <= 3.05,
    ).toBeTruthy();
  }
  {
    const rng = new Multinomial([1]);
    for (let i = 0; i < 10; i++) {
      expect(rng.sample()).toEqual(0);
    }
  }
  {
    const vals = [9, 8];
    const rng = new Multinomial([1, 1]);
    const ns = [];
    for (let i = 0; i < 200000; i++) {
      ns.push(vals[rng.sample()]);
    }
    const _9 = ns.filter((x) => x === 9);
    const _8 = ns.filter((x) => x === 8);
    expect(
      0.95 <= _8.length / _9.length && _8.length / _9.length <= 1.05,
    ).toBeTruthy();
  }
  {
    const ws = [];
    for (let i = 0; i < 1000; ++i) {
      ws[i] = Math.random();
    }
    const i_target = 500;
    ws[i_target] = 100;
    let w_total = 0;
    for (const w of ws) {
      w_total += w;
    }
    const p = 100 / w_total;
    const rng = new Multinomial(ws);
    const total = 100000;
    let count = 0;
    for (let i = 0; i < total; ++i) {
      if (rng.sample() === i_target) {
        count += 1;
      }
    }
    expect(0.95 * p * total <= count && count <= 1.05 * p * total);
  }
});
