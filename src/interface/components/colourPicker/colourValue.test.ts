import { describe, expect, it } from "@jest/globals";
import {
  colourAt,
  formatValue,
  hsvaToRgba,
  parseColour,
  parseValue,
  rgbaToHex,
  rgbaToHsva,
} from "./colourValue";

describe("parseColour", () => {
  it.each([
    ["#fff", { r: 255, g: 255, b: 255, a: 1 }],
    ["#11588380", { r: 17, g: 88, b: 131, a: 0.5 }],
    ["rgba(17,88,131,1)", { r: 17, g: 88, b: 131, a: 1 }],
    ["RGBA(235,169,202,1)", { r: 235, g: 169, b: 202, a: 1 }],
    ["rgb(230, 21, 21)", { r: 230, g: 21, b: 21, a: 1 }],
    ["rgb(10 20 30 / 50%)", { r: 10, g: 20, b: 30, a: 0.5 }],
    ["hsl(0, 100%, 50%)", { r: 255, g: 0, b: 0, a: 1 }],
    ["transparent", { r: 0, g: 0, b: 0, a: 0 }],
  ])("parses %s", (input, expected) => {
    expect(parseColour(input)).toEqual(expected);
  });

  it.each(["", "red", "#12345", "rgb(1, 2)", "rgba(a, b, c)"])("rejects %s", (input) => {
    expect(parseColour(input)).toBeNull();
  });
});

describe("parseValue", () => {
  it("parses the default gradient", () => {
    expect(parseValue("linear-gradient(45deg, rgba(17,88,131,1) 0%, rgba(18,106,98,1) 100%)")).toEqual({
      kind: "linear",
      angle: 45,
      stops: [
        { colour: { r: 17, g: 88, b: 131, a: 1 }, position: 0 },
        { colour: { r: 18, g: 106, b: 98, a: 1 }, position: 100 },
      ],
    });
  });

  it("parses radial gradients and skips the shape", () => {
    const value = parseValue("radial-gradient(circle, rgba(20, 199, 178, 0.76) 32%, rgba(3, 120, 57, 0.66) 100%)");
    expect(value.kind).toBe("radial");
    expect(value.kind !== "solid" && value.stops.map((stop) => stop.position)).toEqual([32, 100]);
  });

  it("maps side keywords and fills missing stop positions", () => {
    const value = parseValue("linear-gradient(to right, #000, #888, #fff)");
    expect(value).toMatchObject({ kind: "linear", angle: 90 });
    expect(value.kind !== "solid" && value.stops.map((stop) => stop.position)).toEqual([0, 50, 100]);
  });

  it("treats plain colours as solid and falls back on garbage", () => {
    expect(parseValue("rgba(4, 4, 138, 0.77)")).toEqual({ kind: "solid", colour: { r: 4, g: 4, b: 138, a: 0.77 } });
    expect(parseValue("not a colour").kind).toBe("solid");
  });
});

describe("formatValue", () => {
  it("round-trips gradients in the stored format", () => {
    const css = "linear-gradient(45deg, rgba(17, 88, 131, 1) 0%, rgba(18, 106, 98, 1) 100%)";
    expect(formatValue(parseValue(css))).toBe(css);
  });

  it("sorts stops by position", () => {
    expect(
      formatValue({
        kind: "radial",
        stops: [
          { colour: { r: 255, g: 255, b: 255, a: 1 }, position: 80 },
          { colour: { r: 0, g: 0, b: 0, a: 0.5 }, position: 10 },
        ],
      }),
    ).toBe("radial-gradient(circle, rgba(0, 0, 0, 0.5) 10%, rgba(255, 255, 255, 1) 80%)");
  });
});

describe("conversions", () => {
  it("converts between RGB, HSV and hex", () => {
    const colour = { r: 17, g: 88, b: 131, a: 1 };
    expect(hsvaToRgba(rgbaToHsva(colour))).toEqual(colour);
    expect(rgbaToHex(colour)).toBe("#115883");
  });

  it("interpolates colours between stops", () => {
    const stops = [
      { colour: { r: 0, g: 0, b: 0, a: 1 }, position: 0 },
      { colour: { r: 200, g: 100, b: 50, a: 0 }, position: 100 },
    ];
    expect(colourAt(stops, 50)).toEqual({ r: 100, g: 50, b: 25, a: 0.5 });
    expect(colourAt(stops, 120)).toEqual(stops[1].colour);
  });
});
