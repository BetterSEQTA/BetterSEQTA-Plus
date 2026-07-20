import { describe, expect, it, jest } from "@jest/globals";

jest.mock("webextension-polyfill", () => ({
  __esModule: true,
  default: {
    runtime: {
      getURL: (path: string) => `chrome-extension://testid/${path}`,
    },
  },
}));

import { extensionPageScriptUrl } from "./extensionPageScriptUrl";

describe("extensionPageScriptUrl", () => {
  it("prefixes chrome.runtime.getURL and strips a leading slash", () => {
    expect(extensionPageScriptUrl("assets/pageState.js")).toBe(
      "chrome-extension://testid/assets/pageState.js",
    );
    expect(extensionPageScriptUrl("/assets/pageState.js")).toBe(
      "chrome-extension://testid/assets/pageState.js",
    );
  });
});
