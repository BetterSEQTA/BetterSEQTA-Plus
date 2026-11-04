import { buildThemeBuilderCss, buildThemeFromDraft } from "./themeBuilderDraft";
import { getFontPreset } from "@/seqta/ui/fonts/presets";

describe("themeBuilderDraft", () => {
  it("paints the tint above an opaque photo when blur is disabled", () => {
    const css = buildThemeBuilderCss(getFontPreset("inter"), ["theme-bg-0"], {
      accentColor: "#00f",
      overlayOpacity: 0.5,
      backgroundBlurPx: 0,
    });
    const backgroundLayers = css.match(/background-image: (.*) !important;/)?.[1];
    expect(backgroundLayers).toMatch(/^linear-gradient\(.*\), var\(--theme-bg-0\)$/);
  });

  it("builds CSS with font import and image variables", () => {
    const css = buildThemeBuilderCss(getFontPreset("inter"), ["theme-bg-0"], {
      accentColor: "#00f",
      gradientEnd: "#f0f",
    });
    expect(css).toContain("Inter");
    expect(css).toContain("var(--theme-bg-0)");
    expect(css).toContain("#title");
  });

  it("creates a theme with photos as custom image variables", () => {
    const theme = buildThemeFromDraft({
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
    expect(() => buildThemeFromDraft({ name: "  ", accentColor: "#000", photoBlobs: [] })).toThrow(
      "Theme name is required",
    );
  });

  it("does not wrap gradient accent colours in color-mix (invalid CSS)", () => {
    const gradient =
      "linear-gradient(90deg, rgb(128, 44, 44) 0%, rgba(188, 63, 23, 1) 35%, rgba(249, 74, 74, 1) 100%)";
    const css = buildThemeBuilderCss(getFontPreset("rubik"), ["custom-image-0"], {
      accentColor: gradient,
      overlayOpacity: 0.35,
      backgroundBlurPx: 0,
    });
    expect(css).not.toMatch(/color-mix\(in srgb, linear-gradient/);
    expect(css).toContain("var(--custom-image-0)");
  });
});
