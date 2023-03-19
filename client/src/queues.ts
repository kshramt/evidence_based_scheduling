export class Queue<T> {
  #promises: Promise<T>[] = [];
  #resolves: ((value: T) => void)[] = [];
  constructor() {
    this.#promises = [];
    this.#resolves = [];
  }
  push = (value: T) => {
    if (this.#resolves.length === 0) {
      this.#add_pair();
    }
    this.#resolves.shift()!(value);
  };
  pop = () => {
    if (this.#promises.length === 0) {
      this.#add_pair();
    }
    return this.#promises.shift()!;
  };
  #add_pair = () => {
    this.#promises.push(
      new Promise<T>((resolve) => {
        this.#resolves.push(resolve);
      }),
    );
  };
}
