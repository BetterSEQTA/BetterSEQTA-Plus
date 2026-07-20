import { __resetBrowserStorageMock } from "./mocks/webextension-polyfill";

afterEach(() => {
  __resetBrowserStorageMock();
});
