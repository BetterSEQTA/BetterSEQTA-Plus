import { PRODUCTION_API_BASE, resolveApiBase } from "./apiBasePolicy";

describe("resolveApiBase", () => {
  it("uses production during extension dev builds", () => {
    expect(resolveApiBase("development", "http://localhost:3000")).toBe(PRODUCTION_API_BASE);
    expect(resolveApiBase("development", null)).toBe(PRODUCTION_API_BASE);
  });

  it("honors session override in production builds", () => {
    expect(resolveApiBase("production", "https://staging.example.test")).toBe(
      "https://staging.example.test",
    );
    expect(resolveApiBase("production", null)).toBe(PRODUCTION_API_BASE);
  });
});
