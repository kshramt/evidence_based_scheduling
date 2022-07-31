const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec));

export const rate_limit_of = (
  interval_msec: number = 1_000,
  min_retry_interval_msec: number = 1_000,
  max_retry_interval_msec: number = 60_000,
  retry_interval_factor: number = Math.sqrt(2),
  interval_jitter_ratio: number = 0.2,
  retry_interval_jitter_ratio: number = 0.2,
) => {
  if (interval_msec <= 0) {
    throw new Error(`interval_msec <= 0: ${interval_msec}`);
  }
  if (min_retry_interval_msec <= 0) {
    throw new Error(`min_retry_interval_msec <= 0: ${min_retry_interval_msec}`);
  }
  if (max_retry_interval_msec < min_retry_interval_msec) {
    throw new Error(
      `max_retry_interval_msec < min_retry_interval_msec: ${max_retry_interval_msec} < ${min_retry_interval_msec}`,
    );
  }
  if (retry_interval_factor < 1) {
    throw new Error(`retry_interval_factor < 1: ${retry_interval_factor}`);
  }
  if (1 < interval_jitter_ratio) {
    throw new Error(`1 < interval_jitter_ratio: ${interval_jitter_ratio}`);
  }
  if (1 < retry_interval_jitter_ratio) {
    throw new Error(
      `1 < retry_inerval_jitter_ratio: ${retry_interval_jitter_ratio}`,
    );
  }
  const queue: (() => Promise<boolean>)[] = [];
  let running: boolean = false;

  const before_process_hooks: ((q: typeof queue) => void)[] = [];
  const before_process_hook = () => {
    for (const hook of before_process_hooks) {
      try {
        hook(queue);
      } catch (e) {
        console.error(e);
      }
    }
  };
  const after_process_hooks: (() => void)[] = [];
  const after_process_hook = () => {
    for (const hook of after_process_hooks) {
      try {
        hook();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const process = async (from_push: boolean = false) => {
    before_process_hook();
    if (from_push && running) {
      return;
    }
    running = true;
    const fn = queue.shift();
    if (fn === undefined) {
      running = false;
      after_process_hook();
      return;
    }
    let retry_interval_msec = min_retry_interval_msec;
    while (!(await fn())) {
      await sleep(
        retry_interval_msec *
          (1 + retry_interval_jitter_ratio * (2 * Math.random() - 1)),
      );
      retry_interval_msec = Math.min(
        retry_interval_msec * retry_interval_factor,
        max_retry_interval_msec,
      );
    }
    setTimeout(
      process,
      interval_msec * (1 + interval_jitter_ratio * (2 * Math.random() - 1)),
    );
  };

  const push = (fn: () => Promise<boolean>) => {
    queue.push(fn);
    process(true);
  };
  const unshift = (fn: () => Promise<boolean>) => {
    queue.unshift(fn);
    process(true);
  };

  const add_before_process_hook = (fn: (q: typeof queue) => void) =>
    before_process_hooks.push(fn);
  const add_after_process_hook = (fn: () => void) =>
    after_process_hooks.push(fn);
  return { push, unshift, add_before_process_hook, add_after_process_hook };
};
