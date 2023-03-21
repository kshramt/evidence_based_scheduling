export class Retryer {
  min_interval_msec: number;
  max_interval_msec: number;
  interval_factor: number;
  interval_jitter_ratio: number;
  constructor(
    min_retry_interval_msec: number = 1_000,
    max_retry_interval_msec: number = 300_000,
    retry_interval_factor: number = Math.sqrt(2),
    retry_interval_jitter_ratio: number = 0.2,
  ) {
    if (min_retry_interval_msec <= 0) {
      throw new Error(
        `min_retry_interval_msec <= 0: ${min_retry_interval_msec}`,
      );
    }
    if (max_retry_interval_msec < min_retry_interval_msec) {
      throw new Error(
        `max_retry_interval_msec < min_retry_interval_msec: ${max_retry_interval_msec} < ${min_retry_interval_msec}`,
      );
    }
    if (retry_interval_factor < 1) {
      throw new Error(`retry_interval_factor < 1: ${retry_interval_factor}`);
    }
    if (1 < retry_interval_jitter_ratio) {
      throw new Error(
        `1 < retry_inerval_jitter_ratio: ${retry_interval_jitter_ratio}`,
      );
    }
    this.min_interval_msec = min_retry_interval_msec;
    this.max_interval_msec = max_retry_interval_msec;
    this.interval_factor = retry_interval_factor;
    this.interval_jitter_ratio = retry_interval_jitter_ratio;
  }
  with_retry = async <T>(fn: () => Promise<T>): Promise<T> => {
    let interval_msec = this.min_interval_msec;
    while (true) {
      try {
        await get_online_promise();
        return await fn();
      } catch (e: unknown) {
        console.warn(e);
        await sleep(
          interval_msec *
            (1 + this.interval_jitter_ratio * (2 * Math.random() - 1)),
        );
        interval_msec = Math.min(
          interval_msec * this.interval_factor,
          this.max_interval_msec,
        );
      }
    }
  };
}

// Get a promise that resolves when the browser is online.
export const get_online_promise = () => {
  if (navigator.onLine) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const fn = () => {
      window.removeEventListener("online", fn);
      resolve();
    };
    window.addEventListener("online", fn);
  });
};

const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec));
