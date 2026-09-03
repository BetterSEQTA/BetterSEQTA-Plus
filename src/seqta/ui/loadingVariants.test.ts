import {
  listLoadingVariants,
  resolveLoadingTheme,
} from "./loadingVariants";

describe("resolveLoadingTheme", () => {
  it("keeps the dark background in dark mode and swaps it for light mode", () => {
    for (const variant of listLoadingVariants()) {
      const dark = resolveLoadingTheme(variant, true);
      const light = resolveLoadingTheme(variant, false);
      expect(dark).toEqual(variant.theme);
      expect(light.background).not.toBe(dark.background);
      expect(light.background).toContain("#fafafa");
      expect(light.background).not.toContain("#010101");
    }
  });
});
