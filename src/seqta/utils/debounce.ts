/**
 * Creates a debounced function that delays invoking the provided function until after `wait` milliseconds have elapsed
 * since the last time it was invoked. The debounced function will only be invoked once during the `wait` period.
 *
 * @param func - The function to debounce.
 * @param wait - The number of milliseconds to delay.
 * @param immediate - If `true`, the function will be invoked immediately on the leading edge instead of the trailing edge.
 *                    If not provided, it is disabled by default.
 * @returns A debounced function.
 */
export function debounce(func: Function, wait: number, immediate?: boolean): Function {
  let timeout: number | undefined;
  return function(this: any) {
    const context = this;
    const args = arguments;
    const later = function() {
      timeout = undefined;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}