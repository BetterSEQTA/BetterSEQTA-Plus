import { extractSolidColor, normalizeCssColorString } from "./parseCssColor";

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
