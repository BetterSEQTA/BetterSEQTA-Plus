import browser from "webextension-polyfill";
import { fetchThemeOfTheMonth } from "./OpenThemeOfTheMonthPopup";

jest.mock("../DevApiBase", () => ({
  getApiBase: () => "https://example.test",
}));

const CACHE_KEY = "bsplus_theme_of_the_month_cache";

const sampleEntry = {
  id: "totm-1",
  month: "2026-07",
  title: "July Theme",
  description: "desc",
  cover_image: null,
  theme_id: null,
  theme: null,
  created_at: 1,
  updated_at: 1,
};

describe("fetchThemeOfTheMonth", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("caches a successful response", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(sampleEntry),
    }) as typeof fetch;

    const entry = await fetchThemeOfTheMonth();
    expect(entry?.id).toBe("totm-1");
    expect(browser.storage.local.set).toHaveBeenCalledWith({
      [CACHE_KEY]: sampleEntry,
    });
  });

  it("falls back to cache when fetch fails or times out", async () => {
    await browser.storage.local.set({ [CACHE_KEY]: sampleEntry });
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new DOMException("Aborted", "AbortError"));

    const entry = await fetchThemeOfTheMonth();
    expect(entry?.id).toBe("totm-1");
  });
});
