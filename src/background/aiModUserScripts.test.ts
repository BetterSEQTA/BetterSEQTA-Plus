import { buildExecutionSource } from "./aiModUserScripts";
import type { StoredModRecipe } from "@/plugins/built-in/aiModCreator/types";

const baseRecipe: StoredModRecipe = {
  schemaVersion: 1,
  id: "mod-test",
  enabled: true,
  route: "welcome",
  rootSelector: "#titlebar",
  name: "Test mod",
  description: "Test",
  operations: [],
  advancedScript: `
    const house = select('.userInfohouse');
    if (!house) throw new Error('Missing .userInfohouse inside selected root');
    return () => {};
  `,
  createdAt: 1,
  updatedAt: 1,
};

describe("advanced user script injection source", () => {
  it("does not declare select twice in the generated runtime", () => {
    const source = buildExecutionSource(baseRecipe);
    expect(source.match(/\bconst select\b/g)?.length).toBe(1);
    expect(source.match(/\bconst selectAll\b/g)?.length).toBe(1);
  });

  it("throws when the selected root is missing", () => {
    const source = buildExecutionSource(baseRecipe);
    expect(source).toContain("AI mod root not found on this page");
  });
});
