import { describe, expect, it } from "@jest/globals";
import { resolveExtensionAssetUrl } from "./extensionAssetUrl";

describe("resolveExtensionAssetUrl", () => {
  it("returns already-resolved extension URLs unchanged", () => {
    const url =
      "chrome-extension://abc/assets/IconFamily-B8lopphU.woff";
    expect(resolveExtensionAssetUrl(url)).toBe(url);
  });

  it("repairs accidental double extension URL prefix", () => {
    const doubled =
      "chrome-extension://abc/chrome-extension://abc/assets/IconFamily-B8lopphU.woff";
    expect(resolveExtensionAssetUrl(doubled)).toBe(
      "chrome-extension://abc/assets/IconFamily-B8lopphU.woff",
    );
  });
});
