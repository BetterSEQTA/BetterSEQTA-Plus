import { formatThemeDate } from "./formatThemeDate";

describe("formatThemeDate", () => {
  it("formats Unix seconds as a locale date string", () => {
    const formatted = formatThemeDate(1700000000);
    expect(formatted).toMatch(/\d/);
    expect(new Date(1700000000 * 1000).toLocaleDateString()).toBe(formatted);
  });

  it("returns em dash for missing values", () => {
    expect(formatThemeDate(undefined)).toBe("—");
    expect(formatThemeDate(null)).toBe("—");
  });
});
