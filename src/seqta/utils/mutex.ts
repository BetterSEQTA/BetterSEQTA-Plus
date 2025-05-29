/**
 * @callback UnlockFunction
 * @description A function that must be called to release the mutex.
 * @returns {void}
 */

/**
 * A simple mutex implementation for managing asynchronous operations.
 * It ensures that only one operation can hold the lock at a time.
 * Operations queue up and are granted access sequentially.
 */
export class Mutex {
  private mutex = Promise.resolve();

  /**
   * Acquires the mutex.
   *
   * This method returns a Promise that resolves with an {@link UnlockFunction}.
   * The calling code *must* call this {@link UnlockFunction} to release the mutex
   * once the critical section of code has completed.
   *
   * If the mutex is already locked, this method will wait until it is released
   * before resolving the Promise.
   *
   * @returns {Promise<UnlockFunction>} A Promise that resolves with the function to call to release the lock.
   */
  acquire(): Promise<() => void> {
    let begin: (unlock: () => void) => void = () => {}; // Initialize with a no-op

    const newPromise = new Promise<void>((resolve) => {
      begin = resolve;
    });

    const chainedPromise = this.mutex.then(() => {
      return new Promise<() => void>((resolveOuter) => {
        // The 'begin' function, when called, will resolve the newPromise,
        // effectively passing control to the next then() in the chain.
        // We pass 'begin' itself as the unlock function.
        // So, when the user calls unlock (which is 'begin'), newPromise resolves.
        resolveOuter(begin);
      });
    });
    
    this.mutex = newPromise;

    return chainedPromise;
  }

  // Note: There isn't a separate `release()` method in this pattern.
  // The lock is released by calling the function returned by `acquire()`.
}
