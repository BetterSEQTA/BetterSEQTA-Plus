/** Coalesce rapid callbacks to at most once per animation frame. */
export function rafThrottle<T extends (...args: never[]) => void>(fn: T): T {
  let scheduled = false;
  let lastArgs: Parameters<T> | null = null;

  return ((...args: Parameters<T>) => {
    lastArgs = args;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (lastArgs) fn(...lastArgs);
      lastArgs = null;
    });
  }) as T;
}
