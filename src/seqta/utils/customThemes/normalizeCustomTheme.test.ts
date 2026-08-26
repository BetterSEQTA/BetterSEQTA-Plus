import { normalizeCustomTheme } from "./normalizeCustomTheme";

describe("normalizeCustomTheme", () => {
  it("maps snake_case API fields and preserves Unix seconds", () => {
    const theme = normalizeCustomTheme({
      id: "abc-123",
      name: "Ocean Blue",
      description: "A calm theme",
      cover_image: "https://example.test/cover.webp",
      theme_json_url: "https://example.test/theme.json",
      download_count: 42,
      created_at: 1700000000,
      updated_at: 1700100000,
      status: "pending",
      submission_notes: "First try",
      rejection_reason: null,
      theme_type: "betterseqta",
      author: "Alice",
    });

    expect(theme.id).toBe("abc-123");
    expect(theme.name).toBe("Ocean Blue");
    expect(theme.coverImage).toBe("https://example.test/cover.webp");
    expect(theme.theme_json_url).toBe("https://example.test/theme.json");
    expect(theme.download_count).toBe(42);
    expect(theme.created_at).toBe(1700000000);
    expect(theme.updated_at).toBe(1700100000);
    expect(theme.status).toBe("pending");
    expect(theme.submission_notes).toBe("First try");
    expect(theme.theme_type).toBe("betterseqta");
  });

  it("falls back to generated cover image URL when missing", () => {
    const theme = normalizeCustomTheme({ id: "theme-1", name: "Test" });
    expect(theme.coverImage).toContain("/api/images/custom-themes/theme-1/images/banner.webp");
  });
});
