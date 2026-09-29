import { buildSimpleTheme } from "./buildSimpleTheme";
import { buildThemeBuilderCss } from "./themeBuilderDraft";
import { getFontPreset } from "@/seqta/ui/fonts/presets";

describe("buildSimpleTheme", () => {
  it("builds CSS with font import and image variables", () => {
    const css = buildThemeBuilderCss(
      getFontPreset("inter"),
      ["theme-bg-0"],
      { accentColor: "#00f", gradientEnd: "#f0f" },
    );
    expect(css).toContain("Inter");
    expect(css).toContain("var(--theme-bg-0)");
    expect(css).toContain("#title");
  });

  it("creates a theme with photos as custom image variables", () => {
    const theme = buildSimpleTheme({
      name: "Sunset",
      accentColor: "#ff6600",
      fontId: "rubik",
      photoBlobs: [new Blob(["x"], { type: "image/png" })],
    });
    expect(theme.name).toBe("Sunset");
    expect(theme.defaultColour).toBe("#ff6600");
    expect(theme.CustomImages).toHaveLength(1);
    expect(theme.CustomImages[0].variableName).toBe("theme-bg-0");
    expect(theme.coverImage).toBeTruthy();
    expect(theme.hideThemeName).toBe(true);
  });

  it("requires a name", () => {
    expect(() =>
      buildSimpleTheme({ name: "  ", accentColor: "#000", photoBlobs: [] }),
    ).toThrow("Theme name is required");
  });
});
