import {
  isKeyIncludedInCloudUploadPayload,
  migrateLegacyToPluginSettings,
  normalizeThemeIdForSync,
  resolveThemeIdForPostSyncDownload,
} from "./cloudSettingsSync";

describe("migrateLegacyToPluginSettings", () => {
  it("maps animatedbk without overwriting existing plugin fields", () => {
    const result = migrateLegacyToPluginSettings({
      animatedbk: true,
      "plugin.animated-background.settings": { speed: 1.5 },
    });
    expect(result["plugin.animated-background.settings"]).toEqual({
      speed: 1.5,
      enabled: true,
    });
    expect(result).not.toHaveProperty("animatedbk");
  });

  it("does not set enabled when legacy key is absent", () => {
    const result = migrateLegacyToPluginSettings({
      "plugin.animated-background.settings": { speed: 1.0 },
    });
    expect(result["plugin.animated-background.settings"]).toEqual({ speed: 1.0 });
  });
});

describe("isKeyIncludedInCloudUploadPayload", () => {
  it("excludes auth and device cache prefixes", () => {
    expect(isKeyIncludedInCloudUploadPayload("bsplus_token")).toBe(false);
    expect(isKeyIncludedInCloudUploadPayload("plugin.global-search.storage.index")).toBe(
      false,
    );
    expect(isKeyIncludedInCloudUploadPayload("bsplus.analytics.v2.school.1")).toBe(false);
  });

  it("includes core and plugin settings keys", () => {
    expect(isKeyIncludedInCloudUploadPayload("DarkMode")).toBe(true);
    expect(isKeyIncludedInCloudUploadPayload("plugin.profile-picture.settings")).toBe(true);
  });
});

describe("resolveThemeIdForPostSyncDownload", () => {
  it("prefers top-level themeId over data.selectedTheme", () => {
    expect(
      resolveThemeIdForPostSyncDownload({
        themeId: " top-id ",
        data: { selectedTheme: "other-id" },
      }),
    ).toBe("top-id");
  });

  it("falls back to data.selectedTheme", () => {
    expect(
      resolveThemeIdForPostSyncDownload({
        data: { selectedTheme: "from-data" },
      }),
    ).toBe("from-data");
  });

  it("returns undefined when theme id is empty", () => {
    expect(
      resolveThemeIdForPostSyncDownload({
        data: { selectedTheme: "   " },
      }),
    ).toBeUndefined();
  });
});

describe("normalizeThemeIdForSync", () => {
  it("normalizes envelope theme ids consistently", () => {
    expect(normalizeThemeIdForSync(" uuid ")).toBe("uuid");
  });
});
