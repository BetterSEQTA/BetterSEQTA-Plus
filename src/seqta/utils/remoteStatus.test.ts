import { normalizeRemoteStatus } from "./remoteStatus";

describe("normalizeRemoteStatus", () => {
  it("falls back to working defaults for missing or malformed data", () => {
    const defaults = { off: false, message: null, disabledFeatures: [] };
    expect(normalizeRemoteStatus(null)).toEqual(defaults);
    expect(
      normalizeRemoteStatus({ off: "yes", message: 4, disabledFeatures: "page.news" }),
    ).toEqual(defaults);
  });

  it("keeps valid fields and drops non-string feature keys", () => {
    expect(
      normalizeRemoteStatus({
        off: true,
        message: "Back soon",
        disabledFeatures: ["page.news", 1],
      }),
    ).toEqual({ off: true, message: "Back soon", disabledFeatures: ["page.news"] });
  });
});
