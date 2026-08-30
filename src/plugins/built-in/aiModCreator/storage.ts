import browser from "webextension-polyfill";
import { parseStoredRecipes, validateStoredRecipes } from "./recipeSchema";
import type { StoredModRecipe } from "./types";

export const AI_MODS_STORAGE_KEY = "aiModCreator.mods";
export const OPENROUTER_API_KEY_STORAGE_KEY =
  "aiModCreator.openRouterApiKey";
export const OPENROUTER_MODEL_STORAGE_KEY = "aiModCreator.openRouterModelId";

async function writeStoredMods(
  recipes: StoredModRecipe[],
): Promise<StoredModRecipe[]> {
  const validated = validateStoredRecipes(recipes);
  await browser.storage.local.set({ [AI_MODS_STORAGE_KEY]: validated });
  return validated;
}

export async function loadStoredMods(): Promise<StoredModRecipe[]> {
  const result = await browser.storage.local.get(AI_MODS_STORAGE_KEY);
  const stored = result[AI_MODS_STORAGE_KEY];
  if (stored === undefined) return [];
  try {
    return validateStoredRecipes(stored);
  } catch (error) {
    console.error("[BetterSEQTA+] Ignoring invalid locally stored AI mods:", error);
    return [];
  }
}

export async function upsertStoredMod(
  recipe: StoredModRecipe,
): Promise<StoredModRecipe[]> {
  const [validated] = validateStoredRecipes([recipe]);
  const existing = await loadStoredMods();
  const next = existing.some((item) => item.id === validated.id)
    ? existing.map((item) => (item.id === validated.id ? validated : item))
    : [...existing, validated];
  return writeStoredMods(next);
}

export async function setStoredModEnabled(
  id: string,
  enabled: boolean,
): Promise<StoredModRecipe[]> {
  const existing = await loadStoredMods();
  const next = existing.map((item) =>
    item.id === id ? { ...item, enabled, updatedAt: Date.now() } : item,
  );
  return writeStoredMods(next);
}

export async function deleteStoredMod(
  id: string,
): Promise<StoredModRecipe[]> {
  const existing = await loadStoredMods();
  return writeStoredMods(existing.filter((item) => item.id !== id));
}

export async function exportStoredMods(): Promise<string> {
  return JSON.stringify(await loadStoredMods(), null, 2);
}

export async function importStoredMods(
  json: string,
): Promise<StoredModRecipe[]> {
  const imported = parseStoredRecipes(json);
  return writeStoredMods(imported);
}
