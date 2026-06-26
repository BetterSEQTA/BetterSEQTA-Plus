import { describe, expect, it } from "vitest";
import {
  extractSolidColor,
  normalizeCssColorString,
  parseCssColor,
} from "./parseCssColor";

describe("normalizeCssColorString", () => {
  it("lowercases uppercase RGBA/RGB function names", () => {
    expect(normalizeCssColorString("RGBA(3, 29, 11, 0.58)")).toBe(
      "rgba(3, 29, 11, 0.58)",
    );
    expect(normalizeCssColorString("RGB(10, 20, 30)")).toBe("rgb(10, 20, 30)");
  });
});

describe("extractSolidColor", () => {
  it("extracts solid uppercase RGBA values", () => {
    expect(extractSolidColor("RGBA(3, 29, 11, 0.58)")).toBe(
      "rgba(3, 29, 11, 0.58)",
    );
  });

  it("extracts the first rgba stop from gradients with mixed casing", () => {
    expect(
      extractSolidColor(
        "linear-gradient(40deg, rgba(201,61,0,1) 0%, RGBA(170, 5, 58, 1) 100%)",
      ),
    ).toBe("rgba(201,61,0,1)");
  });
});

describe("parseCssColor", () => {
  it("parses uppercase RGBA without throwing", () => {
    const parsed = parseCssColor("RGBA(3, 29, 11, 0.58)");
    expect(parsed.alpha()).toBeCloseTo(0.58, 2);
    expect(parsed.red()).toBe(3);
    expect(parsed.green()).toBe(29);
    expect(parsed.blue()).toBe(11);
  });

  it("falls back when the value is not a colour", () => {
    expect(parseCssColor("not-a-color", "#007bff").hex().toLowerCase()).toBe(
      "#007bff",
    );
  });
});
