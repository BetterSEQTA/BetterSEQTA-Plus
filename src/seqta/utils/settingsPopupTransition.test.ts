/** @jest-environment jsdom */

import {
  beginSettingsPopupTransition,
  isCurrentSettingsPopupTransition,
  stopSettingsPopupAnimations,
  trackSettingsPopupAnimation,
} from "./settingsPopupTransition";

describe("settingsPopupTransition", () => {
  it("invalidates prior transitions when a new one begins", () => {
    const first = beginSettingsPopupTransition();
    expect(isCurrentSettingsPopupTransition(first)).toBe(true);

    const second = beginSettingsPopupTransition();
    expect(isCurrentSettingsPopupTransition(first)).toBe(false);
    expect(isCurrentSettingsPopupTransition(second)).toBe(true);
  });

  it("clears tracked animations when a new transition begins", () => {
    const stop = jest.fn();
    stopSettingsPopupAnimations();

    beginSettingsPopupTransition();
    trackSettingsPopupAnimation({ stop } as never);

    beginSettingsPopupTransition();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
