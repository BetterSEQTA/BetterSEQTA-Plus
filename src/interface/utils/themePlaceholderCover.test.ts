import {
  createDefaultThemeCoverSvg,
  defaultThemeCoverDataUrl,
} from "./themePlaceholderCover";

describe("themePlaceholderCover", () => {
  it("builds an svg cover placeholder", () => {
    const svg = createDefaultThemeCoverSvg("#3366ff");
    expect(svg).toContain("<svg");
    expect(svg).toContain("No cover image");
    expect(svg).toContain("#3366ff");
  });

  it("builds a data url", () => {
    expect(defaultThemeCoverDataUrl()).toMatch(/^data:image\/svg\+xml/);
  });
});
