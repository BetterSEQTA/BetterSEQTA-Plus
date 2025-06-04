/**
 * Pauses execution for a specified number of milliseconds.
 *
 * This function returns a Promise that resolves after the given delay,
 * allowing it to be used with `async/await` to pause asynchronous operations.
 *
 * @param {number} ms The number of milliseconds to delay.
 * @returns {Promise<void>} A Promise that resolves after the specified delay.
 */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
