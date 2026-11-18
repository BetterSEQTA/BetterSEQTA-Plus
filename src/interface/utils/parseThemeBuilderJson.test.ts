import { parseThemeBuilderJson } from "./parseThemeBuilderJson";

describe("parseThemeBuilderJson", () => {
  it("parses minimal theme.json", () => {
    const theme = parseThemeBuilderJson(
      JSON.stringify({
        name: "Test",
        CustomCSS: "body { color: red; }",
      }),
    );
    expect(theme.name).toBe("Test");
    expect(theme.CustomCSS).toContain("red");
    expect(theme.CustomImages).toHaveLength(0);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseThemeBuilderJson("{")).toThrow("Invalid JSON");
  });
});
