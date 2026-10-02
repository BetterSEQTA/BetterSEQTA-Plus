/**
 * @jest-environment jsdom
 */
import {
  extractSchoolLoginBackground,
  parseCssBackgroundUrl,
  resolveSchoolMediaUrl,
} from "./extractSchoolLoginBackground";

describe("parseCssBackgroundUrl", () => {
  it("extracts quoted and unquoted urls", () => {
    expect(parseCssBackgroundUrl('url("/seqta/student/branding?file=abc")')).toBe(
      "/seqta/student/branding?file=abc",
    );
    expect(parseCssBackgroundUrl("url(/wallpaper.jpg)")).toBe("/wallpaper.jpg");
    expect(parseCssBackgroundUrl("none")).toBeNull();
  });
});

describe("resolveSchoolMediaUrl", () => {
  it("resolves relative paths against the origin", () => {
    expect(
      resolveSchoolMediaUrl(
        "/seqta/student/branding?file=abc",
        "https://learn.example.edu.au",
      ),
    ).toBe("https://learn.example.edu.au/seqta/student/branding?file=abc");
  });
});

describe("extractSchoolLoginBackground", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("prefers the school wallpaper over a logo image", () => {
    document.body.innerHTML = `
      <div class="login" style="background-image: url('/school-wallpaper.jpg')">
        <img class="school-logo" src="/school-logo.png" width="120" height="80" />
      </div>
    `;

    expect(extractSchoolLoginBackground()).toEqual({
      src: `${location.origin}/school-wallpaper.jpg`,
      type: "image",
    });
  });

  it("reads branding urls from nested background elements", () => {
    document.body.innerHTML = `
      <div class="login">
        <div class="login-background" style="background-image: url('/seqta/student/branding?file=abc')"></div>
      </div>
    `;

    expect(extractSchoolLoginBackground()?.src).toBe(
      `${location.origin}/seqta/student/branding?file=abc`,
    );
  });

  it("returns null when no school wallpaper is present", () => {
    document.body.innerHTML = `<div class="login"><form></form></div>`;
    expect(extractSchoolLoginBackground()).toBeNull();
  });
});
