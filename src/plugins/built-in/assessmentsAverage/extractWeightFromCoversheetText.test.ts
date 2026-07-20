import { extractWeightFromCoversheetText } from "./extractWeightFromCoversheetText";

describe("extractWeightFromCoversheetText", () => {
  it("matches Weight: N", () => {
    expect(extractWeightFromCoversheetText("Due date ... Weight: 20 Subject")).toBe(
      "20",
    );
  });

  it("matches Weighting: N%", () => {
    expect(
      extractWeightFromCoversheetText("Assessment Weighting: 12.5% of semester"),
    ).toBe("12.5");
  });

  it("matches Assessment weight: N", () => {
    expect(
      extractWeightFromCoversheetText("Assessment weight: 15\nCriteria"),
    ).toBe("15");
  });

  it("matches Weight of N%", () => {
    expect(extractWeightFromCoversheetText("This task has a weight of 10%")).toBe(
      "10",
    );
  });

  it("returns null when no weighting is present", () => {
    expect(extractWeightFromCoversheetText("No marks available yet")).toBeNull();
  });
});
