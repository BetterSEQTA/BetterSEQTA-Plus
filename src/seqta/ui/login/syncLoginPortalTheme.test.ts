/**
 * @jest-environment jsdom
 */
import { syncPageThemeToElement } from "@/interface/utils/syncPageTheme";
import {
  syncLoginPortalTheme,
  unwatchLoginPortalTheme,
  watchLoginPortalTheme,
} from "./syncLoginPortalTheme";

jest.mock("@/interface/utils/syncPageTheme", () => ({
  syncPageThemeToElement: jest.fn(),
}));

describe("syncLoginPortalTheme", () => {
  beforeEach(() => {
    document.documentElement.style.setProperty("--better-main", "#ff0000");
    document.documentElement.style.setProperty(
      "--betterseqta-font-family",
      "Comic Sans MS",
    );
    jest.mocked(syncPageThemeToElement).mockClear();
  });

  it("delegates to syncPageThemeToElement and copies font tokens", () => {
    const host = document.createElement("div");
    syncLoginPortalTheme(host);

    expect(syncPageThemeToElement).toHaveBeenCalledWith(host);
    expect(host.style.getPropertyValue("--betterseqta-font-family")).toBe(
      "Comic Sans MS",
    );
  });
});

describe("watchLoginPortalTheme", () => {
  afterEach(() => {
    unwatchLoginPortalTheme();
  });

  it("cleans up listeners on unwatch", () => {
    const host = document.createElement("div");
    watchLoginPortalTheme(host);
    expect(() => unwatchLoginPortalTheme()).not.toThrow();
  });
});
