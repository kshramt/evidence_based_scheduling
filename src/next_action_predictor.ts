class DefaultMap<K, V> {
  _map: Map<K, V>;
  _value_of: (k: K) => V;
  constructor(value_of: (k: K) => V) {
    this._map = new Map();
    this._value_of = value_of;
  }
  has = (k: K) => this._map.has(k);
  set = (k: K, v: V) => this._map.set(k, v);
  keys = () => this._map.keys();
  entries = () => this._map.entries();
  get = (k: K) => {
    let v = this._map.get(k);
    if (v === undefined) {
      v = this._value_of(k);
      this.set(k, v);
    }
    return v;
  };
  [Symbol.iterator]() {
    return this._map[Symbol.iterator]();
  }
  toString = () =>
    "{" +
    Array.from(this.entries())
      .map((kv) => `${kv[0]}: ${kv[1]}`)
      .join(", ") +
    "}";
}

export class TriGramPredictor<K> {
  counts: DefaultMap<K, DefaultMap<K, DefaultMap<K, number>>>;
  decay: number;
  buf: K[];
  i: number;
  n: number;
  constructor(decay: number) {
    this.decay = decay;
    this.counts = new DefaultMap(
      (k: K) => new DefaultMap((k: K) => new DefaultMap(this.default_count_of)),
    );
    this.buf = [];
    this.i = -1;
    this.n = 3;
  }
  fit = (k: K) => {
    this.i = (this.i + 1) % this.n;
    this.buf[this.i] = k;
    if (this.buf.length < this.n) {
      return this;
    }
    const counts = this.counts
      .get(this.buf[(this.i + 1) % this.n])
      .get(this.buf[(this.i + 2) % this.n]);
    for (const [kk, vv] of counts) {
      counts.set(kk, this.decay * vv);
    }
    counts.set(k, counts.get(k) + 1);
    return this;
  };
  predict = () => {
    const kvs = Array.from(
      this.buf.length < this.n
        ? new DefaultMap<K, number>(this.default_count_of)
        : this.counts
            .get(this.buf[(this.i + 2) % this.n])
            .get(this.buf[(this.i + 0) % this.n]),
    );
    kvs.sort((a, b) => b[1] - a[1]);
    return kvs.map((kv) => kv[0]);
  };
  default_count_of = () => 0;
}
