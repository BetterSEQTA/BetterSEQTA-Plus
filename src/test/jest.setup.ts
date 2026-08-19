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

afterEach(() => {
  __resetBrowserStorageMock();
});
