/** @jest-environment jsdom */

import {
  consumeOpenCommunityThemeSubmit,
  consumePendingCommunitySubmitThemeId,
  requestOpenCommunityThemeSubmit,
} from "./openCommunityThemeSubmit";

describe("openCommunityThemeSubmit", () => {
  beforeEach(() => {
    sessionStorage.clear();
    while (consumeOpenCommunityThemeSubmit()) {
      /* drain pending state */
    }
  });

  it("consumes the pending submit request once", () => {
    requestOpenCommunityThemeSubmit();
    expect(consumeOpenCommunityThemeSubmit()).toBe(true);
    expect(consumeOpenCommunityThemeSubmit()).toBe(false);
  });

  it("consumes a sessionStorage handoff once", () => {
    sessionStorage.setItem("bsplus:open-community-theme-submit", "1");
    expect(consumeOpenCommunityThemeSubmit()).toBe(true);
    expect(consumeOpenCommunityThemeSubmit()).toBe(false);
  });

  it("hands off a theme id for the submit modal", () => {
    requestOpenCommunityThemeSubmit("theme-abc");
    expect(consumePendingCommunitySubmitThemeId()).toBe("theme-abc");
    expect(consumePendingCommunitySubmitThemeId()).toBeNull();
  });
});
