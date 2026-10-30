import {
  DEFAULT_REMOTE_CONFIG,
  mergeGithubConfigFiles,
  normalizeRemoteConfigSnapshot,
} from "./normalize";

describe("normalizeRemoteConfigSnapshot", () => {
  it("returns defaults for empty input", () => {
    expect(normalizeRemoteConfigSnapshot(null)).toEqual(DEFAULT_REMOTE_CONFIG);
  });

  it("unwraps API envelope data", () => {
    const snap = normalizeRemoteConfigSnapshot({
      success: true,
      data: {
        configVersion: "9",
        global: { mode: "off", statusMessage: "Maintenance" },
      },
    });
    expect(snap.configVersion).toBe("9");
    expect(snap.global.mode).toBe("off");
    expect(snap.global.statusMessage).toBe("Maintenance");
  });
});

describe("mergeGithubConfigFiles", () => {
  it("merges manifest file map into snapshot", () => {
    const snap = mergeGithubConfigFiles(
      { version: "1", updatedAt: "2026-01-01" },
      {
        global: { mode: "on" },
        features: { "page.news": { mode: "hide" } },
        campaigns: [],
      },
    );
    expect(snap.source).toBe("github");
    expect(snap.features["page.news"]?.mode).toBe("hide");
  });
});
