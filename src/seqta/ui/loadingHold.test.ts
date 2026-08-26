import { loadingScreenHoldMs } from "./loadingHold";

describe("loadingScreenHoldMs", () => {
  it("holds 5 seconds when developer mode and the delay option are both on", () => {
    expect(
      loadingScreenHoldMs({
        devMode: true,
        devDelayLoadingScreen: true,
      }),
    ).toBe(5000);
  });

  it("does not hold when developer mode is off", () => {
    expect(
      loadingScreenHoldMs({
        devMode: false,
        devDelayLoadingScreen: true,
      }),
    ).toBe(0);
  });

  it("does not hold when the delay option is off", () => {
    expect(
      loadingScreenHoldMs({
        devMode: true,
        devDelayLoadingScreen: false,
      }),
    ).toBe(0);
  });
});
