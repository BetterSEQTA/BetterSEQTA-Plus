import browser from "webextension-polyfill";
import localforage from "localforage";
import { BSPLUS_PENDING_THEME_ENSURE_AFTER_CLOUD_KEY } from "@/seqta/utils/cloudSettingsSync";
import { ThemeManager } from "./theme-manager";

jest.mock("localforage", () => {
  const records = new Map<string, unknown>();
  return {
    getItem: jest.fn(async (key: string) => records.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: unknown) =>
      records.set(key, value),
    ),
    clear: jest.fn(async () => records.clear()),
  };
});
jest.mock("@/seqta/utils/listeners/SettingsState", () => ({
  settingsState: {},
}));
jest.mock("@/seqta/utils/performanceMode", () => ({
  fullMotionEffectsEnabled: () => false,
}));
jest.mock("@/seqta/utils/DevApiBase", () => ({
  getApiBase: () => "https://betterseqta.org",
}));
jest.mock("@/seqta/ui/colors/Manager", () => ({ updateAllColors: jest.fn() }));
jest.mock("@/seqta/ui/colors/customThemeAdaptiveBindings", () => ({}));
jest.mock("@/seqta/utils/patchThemeImagesPageContext", () => ({}));
jest.mock("@/utils/verboseLog", () => ({
  verboseDebug: jest.fn(),
  verboseInfo: jest.fn(),
}));
jest.mock("./theme-runtime", () => ({
  validateThemeScript: () => true,
  validateThemeDom: () => true,
}));

describe("cloud theme restoration", () => {
  beforeEach(async () => {
    await localforage.clear();
    await browser.storage.local.set({
      [BSPLUS_PENDING_THEME_ENSURE_AFTER_CLOUD_KEY]: "catalog-id",
    });
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it.each(["themes", "custom-themes"])(
    "installs a missing %s catalog theme",
    async (catalog) => {
      const jsonUrl = "https://betterseqta.org/storage/theme.json";
      (browser.runtime.sendMessage as jest.Mock).mockImplementation(
        async ({ url }) => {
          if (
            url === `https://betterseqta.org/api/${catalog}/catalog-id/download`
          ) {
            return {
              data: { success: true, data: { theme_json_url: jsonUrl } },
            };
          }
          if (url === jsonUrl)
            return {
              data: {
                id: "catalog-id",
                name: "Restored theme",
                CustomCSS: "body { color: red; }",
              },
            };
          return { error: "Not found" };
        },
      );

      await ThemeManager.getInstance().prepareThemeAfterCloudSync();

      expect(await localforage.getItem("catalog-id")).toMatchObject({
        name: "Restored theme",
        installedFromStore: catalog === "themes",
        ...(catalog === "custom-themes"
          ? { installedFromCommunity: true }
          : {}),
      });
      expect(
        await browser.storage.local.get(
          BSPLUS_PENDING_THEME_ENSURE_AFTER_CLOUD_KEY,
        ),
      ).toEqual({});
    },
  );

  it("keeps a failed download pending so a later page can retry", async () => {
    (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({
      error: "Offline",
    });
    await ThemeManager.getInstance().prepareThemeAfterCloudSync();
    expect(
      await browser.storage.local.get(
        BSPLUS_PENDING_THEME_ENSURE_AFTER_CLOUD_KEY,
      ),
    ).toEqual({
      [BSPLUS_PENDING_THEME_ENSURE_AFTER_CLOUD_KEY]: "catalog-id",
    });
  });

  it("installs via admin preview endpoints with auth", async () => {
    const jsonUrl =
      "https://betterseqta.org/api/bsplus/admin/themes/t1/theme.json?source=community";
    (browser.runtime.sendMessage as jest.Mock).mockImplementation(async (msg) => {
      if (msg.type === "fetchFromUrl" && msg.url.includes("/preview?")) {
        return { data: { data: { theme_json_url: jsonUrl } } };
      }
      if (msg.type === "fetchFromUrl" && msg.url === jsonUrl && msg.auth === true) {
        return {
          data: { id: "t1", name: "Pending theme", CustomCSS: "body { color: green; }" },
        };
      }
      return { error: "unexpected" };
    });

    const id = await ThemeManager.getInstance().previewAdminTheme({
      id: "t1",
      source: "community",
    });
    expect(id).toBe("t1");
    expect(await localforage.getItem("t1")).toMatchObject({
      installedFromCommunity: true,
    });
  });
});
