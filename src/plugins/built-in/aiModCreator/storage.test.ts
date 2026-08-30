import browser from "webextension-polyfill";
import {
  deleteStoredMod,
  exportStoredMods,
  importStoredMods,
  loadStoredMods,
  setStoredModEnabled,
  upsertStoredMod,
} from "./storage";
import type { StoredModRecipe } from "./types";

const storedRecipe: StoredModRecipe = {
  schemaVersion: 1,
  id: "mod-1",
  name: "Test",
  description: "Test mod",
  enabled: false,
  route: "assessments",
  rootSelector: "#selected",
  operations: [{ type: "hide", selector: ":scope" }],
  createdAt: 1,
  updatedAt: 1,
};

describe("AI mod local storage", () => {
  it("immutably inserts, updates, toggles, and deletes recipes", async () => {
    await upsertStoredMod(storedRecipe);
    expect(await loadStoredMods()).toEqual([storedRecipe]);

    await setStoredModEnabled("mod-1", true);
    expect((await loadStoredMods())[0]).toMatchObject({
      id: "mod-1",
      enabled: true,
    });

    await upsertStoredMod({ ...storedRecipe, name: "Updated" });
    expect((await loadStoredMods())[0].name).toBe("Updated");

    await deleteStoredMod("mod-1");
    expect(await loadStoredMods()).toEqual([]);
  });

  it("round-trips validated import/export JSON", async () => {
    await upsertStoredMod(storedRecipe);
    const exported = await exportStoredMods();

    await browser.storage.local.clear?.();
    const imported = await importStoredMods(exported);

    expect(imported).toEqual([storedRecipe]);
    expect(await loadStoredMods()).toEqual([storedRecipe]);
  });

  it("does not overwrite storage when an import is invalid", async () => {
    await upsertStoredMod(storedRecipe);

    await expect(
      importStoredMods(
        JSON.stringify([
          {
            ...storedRecipe,
            operations: [{ type: "javascript", code: "alert(1)" }],
          },
        ]),
      ),
    ).rejects.toThrow();
    expect(await loadStoredMods()).toEqual([storedRecipe]);
  });
});
