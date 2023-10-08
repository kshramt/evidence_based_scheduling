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
    const resolve = this.#resolves.shift();
    if (resolve) {
      resolve(value);
    }
  };
  pop = async () => {
    if (this.#promises.length === 0) {
      this.#add_pair();
    }
    const promise = this.#promises.shift();
    if (!promise) {
      throw new Error("Must not happen.");
    }
    return await promise;
  };
  #add_pair = () => {
    this.#promises.push(
      new Promise<T>((resolve) => {
        this.#resolves.push(resolve);
      }),
    );
  };
}
