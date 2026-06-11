/**
 * Minimal stdlib-only concurrency limiter for bounded fs fan-out in
 * {@link createCollector}. No external dependencies (no p-limit).
 */

export interface Semaphore {
  /** Run `fn` when a slot is available; releases the slot when done. */
  run<T>(fn: () => Promise<T>): Promise<T>;
}

/** Create a semaphore that allows at most `limit` concurrent operations. */
export function createSemaphore(limit: number): Semaphore {
  const cap = Math.max(1, limit);
  let active = 0;
  const queue: Array<() => void> = [];

  const pump = (): void => {
    while (active < cap && queue.length > 0) {
      active += 1;
      const next = queue.shift()!;
      next();
    }
  };

  return {
    run<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queue.push(() => {
          void fn()
            .then(resolve, reject)
            .finally(() => {
              active -= 1;
              pump();
            });
        });
        pump();
      });
    },
  };
}
