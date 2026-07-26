import {
  calculateExpression,
  isLikelyMathExpression,
} from "./calculator";

describe("calculator", () => {
  it("rejects non-math text without needing mathjs for validity", () => {
    expect(isLikelyMathExpression("homework due tomorrow")).toBe(false);
    expect(isLikelyMathExpression("2 + 2")).toBe(true);
  });

  it("evaluates expressions after dynamic mathjs load", async () => {
    const result = await calculateExpression("2 + 2");
    expect(result.isValid).toBe(true);
    expect(result.result).toBe("4");
  });

  it("returns empty for plain search queries", async () => {
    const result = await calculateExpression("assessments");
    expect(result.isValid).toBe(false);
    expect(result.result).toBeNull();
  });
});
