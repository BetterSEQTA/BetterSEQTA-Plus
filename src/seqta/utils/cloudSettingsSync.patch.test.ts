import {
  buildUploadPatch,
  CLOUD_SETTINGS_SYNC_SCHEMA_VERSION,
  diffSyncableStorage,
  normalizeStorageForSync,
  normalizeThemeIdForSync,
} from "./cloudSettingsSync";

describe("normalizeStorageForSync", () => {
  it("strips omitted auth and client-only keys", () => {
    const normalized = normalizeStorageForSync({
      DarkMode: true,
      bsplus_token: "secret",
      bsplus_cloud_settings_known_remote_updated_at: "2026-01-01T00:00:00.000Z",
      "bsplus.analytics.v2.school.1": { cached: true },
    });
    expect(normalized).toEqual({ DarkMode: true });
  });

  it("migrates legacy animatedbk to plugin settings", () => {
    const normalized = normalizeStorageForSync({ animatedbk: true });
    expect(normalized).toEqual({
      "plugin.animated-background.settings": { enabled: true },
    });
  });
});

describe("diffSyncableStorage", () => {
  it("returns empty object when maps are identical", () => {
    const map = { DarkMode: true, onoff: true };
    expect(diffSyncableStorage(map, { ...map })).toEqual({});
  });

  it("includes only changed scalar keys", () => {
    const current = { DarkMode: false, onoff: true };
    const baseline = { DarkMode: true, onoff: true };
    expect(diffSyncableStorage(current, baseline)).toEqual({ DarkMode: false });
  });

  it("includes whole plugin object when nested value changes", () => {
    const current = {
      "plugin.global-search.settings": { enabled: true, searchHotkey: "ctrl+k" },
    };
    const baseline = {
      "plugin.global-search.settings": { enabled: false, searchHotkey: "ctrl+k" },
    };
    expect(diffSyncableStorage(current, baseline)).toEqual({
      "plugin.global-search.settings": { enabled: true, searchHotkey: "ctrl+k" },
    });
  });

  it("does not emit keys removed locally (absent from current)", () => {
    const current = { DarkMode: true };
    const baseline = { DarkMode: true, onoff: true };
    expect(diffSyncableStorage(current, baseline)).toEqual({});
  });
});

describe("buildUploadPatch", () => {
  it("returns null when current matches baseline", () => {
    const all = { DarkMode: true, selectedTheme: "" };
    const baseline = { DarkMode: true, selectedTheme: "" };
    expect(buildUploadPatch(all, baseline)).toBeNull();
  });

  it("returns sparse envelope when values differ", () => {
    const all = {
      DarkMode: false,
      selectedTheme: "theme-uuid",
      bsplus_token: "ignore-me",
    };
    const baseline = { DarkMode: true, selectedTheme: "theme-uuid" };
    const patch = buildUploadPatch(all, baseline);
    expect(patch).toEqual({
      schemaVersion: CLOUD_SETTINGS_SYNC_SCHEMA_VERSION,
      themeId: "theme-uuid",
      data: { DarkMode: false },
    });
  });
});

describe("normalizeThemeIdForSync", () => {
  it("trims whitespace and returns empty for non-strings", () => {
    expect(normalizeThemeIdForSync("  abc  ")).toBe("abc");
    expect(normalizeThemeIdForSync(undefined)).toBe("");
    expect(normalizeThemeIdForSync("   ")).toBe("");
  });
});
