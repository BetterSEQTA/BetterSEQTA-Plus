import {
  listLoadingVariants,
  resolveLoadingTheme,
} from "./loadingVariants";

describe("loading variant light themes", () => {
  it("defines a distinct light theme for every canvas variant", () => {
    const variants = listLoadingVariants();
    expect(variants.length).toBeGreaterThan(0);

    for (const variant of variants) {
      expect(variant.lightTheme.background).not.toBe(variant.theme.background);
      expect(variant.lightTheme.background).not.toMatch(/#0[148]0[148]0[148]/);
      expect(variant.lightTheme.vignetteFill).not.toBe(variant.theme.vignetteFill);
    }
  });

  it("resolves dark theme when dark mode is on and light theme when it is off", () => {
    const sweep = listLoadingVariants().find((variant) => variant.id === "sweep");
    expect(sweep).toBeDefined();
    expect(resolveLoadingTheme(sweep!, true)).toEqual(sweep!.theme);
    expect(resolveLoadingTheme(sweep!, false)).toEqual(sweep!.lightTheme);
  });
});
