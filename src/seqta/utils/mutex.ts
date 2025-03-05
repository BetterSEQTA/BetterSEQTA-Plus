// Simple mutex implementation
export class Mutex {
  private mutex = Promise.resolve();

  lock(): PromiseLike<() => void> {
    let begin: (unlock: () => void) => void;

    this.mutex = this.mutex.then(() => new Promise(begin));

    return new Promise(res => begin = res);
  }
}