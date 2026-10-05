import { getDefaultSettingsState } from "./defaultSettings";

describe("getDefaultSettingsState", () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    if (originalNavigator === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).navigator;
    } else {
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: originalNavigator,
      });
    }
  });

  it("does not assume low-end when navigator is unavailable", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).navigator;

    const state = getDefaultSettingsState();

    expect(state.performanceMode).toBe(false);
    expect(state.animations).toBe(true);
  });

  it("defaults to performance mode on low core count", () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { hardwareConcurrency: 2 },
    });

    const state = getDefaultSettingsState();

    expect(state.performanceMode).toBe(true);
    expect(state.animations).toBe(false);
  });

  it("defaults to performance mode when device memory is 2 GB or less", () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { hardwareConcurrency: 8, deviceMemory: 2 },
    });

    const state = getDefaultSettingsState();

    expect(state.performanceMode).toBe(true);
    expect(state.animations).toBe(false);
  });
});
