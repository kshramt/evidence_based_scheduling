export class MultiSet<K> {
  _map: Map<K, number>;
  constructor() {
    this._map = new Map<K, number>();
  }
  add = (k: K) => {
    const c = this._map.get(k);
    this._map.set(k, c === undefined ? 1 : c + 1);
    return this;
  };
  delete = (k: K) => {
    const c = this._map.get(k);
    if (c === undefined) {
      return false;
    }
    if (c === 1) {
      return this._map.delete(k);
    }
    this._map.set(k, c - 1);
    return true;
  };
  has = (k: K) => {
    return this._map.has(k);
  };
  [Symbol.iterator]() {
    return this._map.keys();
  }
  keys = () => {
    return this._map.keys();
  };
}

if (import.meta.vitest) {
  const { it, expect } = await import("vitest");
  it("MultiSet", () => {
    const ms = new MultiSet<number>();
    expect(ms.has(0)).toBeFalsy();
    ms.add(0);
    expect(ms.has(0)).toBeTruthy();
    ms.add(0);
    expect(ms.has(0)).toBeTruthy();
    ms.delete(0);
    expect(ms.has(0)).toBeTruthy();
    ms.delete(0);
    expect(ms.has(0)).toBeFalsy();
  });
}
