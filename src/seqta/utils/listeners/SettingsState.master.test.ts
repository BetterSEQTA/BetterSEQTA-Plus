/** @jest-environment jsdom */

describe("master extension setting", () => {
  afterEach(() => jest.useRealTimers());

  it.each([false, true])("persists %s and queued preferences before reloading SEQTA tabs", async (enabled) => {
    jest.useFakeTimers();
    let browser: any;
    let settings: typeof import("./SettingsState");
    jest.isolateModules(() => {
      browser = require("webextension-polyfill").default;
      settings = require("./SettingsState");
    });
    await browser.storage.local.set({ onoff: !enabled });
    await settings!.initializeSettingsState();
    browser.runtime.sendMessage.mockClear();
    const originalSet = browser.storage.local.set.getMockImplementation();
    let finishWrite: () => Promise<void> = async () => {};
    browser.storage.local.set.mockImplementationOnce((patch: Record<string, unknown>) => new Promise<void>((resolve) => {
      finishWrite = async () => {
        await originalSet(patch);
        resolve();
      };
    }));
    browser.runtime.sendMessage.mockImplementation(async () => {
      expect(await browser.storage.local.get(null)).toMatchObject({ onoff: enabled, selectedFont: "inter" });
    });

    settings!.settingsState.selectedFont = "inter";
    settings!.settingsState.onoff = enabled;
    jest.advanceTimersByTime(300);
    expect(browser.runtime.sendMessage).not.toHaveBeenCalled();
    await finishWrite();
    await Promise.resolve();
    await Promise.resolve();

    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({ type: "reloadTabs" });
  });
});
