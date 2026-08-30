/** @jest-environment jsdom */
/**
 * Unit-test runtime only. Production advanced mods run through the background
 * User Scripts API because page/content CSP blocks eval/new Function.
 */
import { runAdvancedMod, stopAdvancedMod } from "./advancedModRuntime";
import type { StoredModRecipe } from "./types";

describe("advanced mod runtime", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    stopAdvancedMod("test-mod");
  });

  it("runs an advanced script scoped to the selected root", () => {
    document.body.innerHTML = `
      <div id="root">
        <p class="label">House</p>
        <p class="target">ID</p>
      </div>
    `;
    const root = document.getElementById("root")!;
    const label = root.querySelector(".label")!;
    const target = root.querySelector(".target")!;

    const recipe: StoredModRecipe = {
      schemaVersion: 1,
      id: "test-mod",
      enabled: true,
      route: "",
      rootSelector: "#root",
      name: "Move label",
      description: "Moves label next to target",
      operations: [],
      advancedScript: `
        const label = select('.label');
        const target = select('.target');
        target.parentNode.insertBefore(label, target);
        return () => {
          root.prepend(label);
        };
      `,
      createdAt: 1,
      updatedAt: 1,
    };

    runAdvancedMod(recipe);
    expect(target.previousElementSibling).toBe(label);

    stopAdvancedMod("test-mod");
    expect(root.firstElementChild).toBe(label);
  });

  it("stops a previously started mod before restarting it", () => {
    document.body.innerHTML = `<div id="root"><span class="badge">Y11HA</span></div>`;
    const recipe: StoredModRecipe = {
      schemaVersion: 1,
      id: "test-mod",
      enabled: true,
      route: "",
      rootSelector: "#root",
      name: "Hide badge",
      description: "Hides badge",
      operations: [],
      advancedScript: `
        const badge = select('.badge');
        badge.hidden = true;
        return () => { badge.hidden = false; };
      `,
      createdAt: 1,
      updatedAt: 1,
    };

    runAdvancedMod(recipe);
    expect(document.querySelector(".badge")).toHaveProperty("hidden", true);
    runAdvancedMod(recipe);
    expect(document.querySelector(".badge")).toHaveProperty("hidden", true);
    stopAdvancedMod("test-mod");
    expect(document.querySelector(".badge")).toHaveProperty("hidden", false);
  });
});
