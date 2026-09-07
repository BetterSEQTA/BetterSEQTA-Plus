import { __resetBrowserStorageMock } from "./mocks/webextension-polyfill";

if (typeof globalThis.CSS === "undefined") {
  Object.defineProperty(globalThis, "CSS", {
    value: {
      escape(value: string) {
        return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      },
    },
    writable: true,
  });
}

// requestAnimationFrame / cancelAnimationFrame polyfill
// SettingsState.ts calls requestAnimationFrame to batch subscriber
// notifications, but that API doesn't exist under the Node test
// environment. This provides a minimal setTimeout-based stand-in.
if (typeof globalThis.requestAnimationFrame === "undefined") {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    return setTimeout(() => cb(Date.now()), 0) as unknown as number;
  };
}

if (typeof globalThis.cancelAnimationFrame === "undefined") {
  globalThis.cancelAnimationFrame = (handle: number): void => {
    clearTimeout(handle);
  };
}

afterEach(() => {
  __resetBrowserStorageMock();
});
