import { describe, expect, it } from "@jest/globals";
import { nearestGoogleEventColorId } from "./eventColor";

describe("nearestGoogleEventColorId", () => {
  it("returns undefined for empty input", () => {
    expect(nearestGoogleEventColorId(undefined)).toBeUndefined();
    expect(nearestGoogleEventColorId("")).toBeUndefined();
  });

  it("maps a red subject colour to Tomato", () => {
    expect(nearestGoogleEventColorId("#dc2127")).toBe("11");
    expect(nearestGoogleEventColorId("#E76F51")).toBe("4");
  });

  it("maps a green subject colour to Basil or Sage", () => {
    expect(["2", "10"]).toContain(nearestGoogleEventColorId("#51b749"));
  });

  it("accepts rgb() values", () => {
    expect(nearestGoogleEventColorId("rgb(220, 33, 39)")).toBe("11");
  });
});
