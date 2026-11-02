export function createUpdateSignal() {
  const listeners = new Set<() => void>();
  return {
    addListener: (callback: () => void) => void listeners.add(callback),
    removeListener: (callback: () => void) => void listeners.delete(callback),
    triggerUpdate: () => listeners.forEach((callback) => callback()),
  };
}
