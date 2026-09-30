import browser from "webextension-polyfill";

const SYNC_SCOPES_KEY = "plugin.timetable-classmates.storage.syncScopes";

export async function setScopeSyncOptIn(scope: string, optedIn: boolean): Promise<void> {
  const stored = await browser.storage.local.get(SYNC_SCOPES_KEY);
  const list = stored[SYNC_SCOPES_KEY];
  const scopes = new Set<string>(Array.isArray(list) ? list.filter((s) => typeof s === "string") : []);
  if (optedIn) scopes.add(scope);
  else scopes.delete(scope);
  await browser.storage.local.set({ [SYNC_SCOPES_KEY]: [...scopes] });
}

export async function hasAnySyncOptInScope(): Promise<boolean> {
  const stored = await browser.storage.local.get(SYNC_SCOPES_KEY);
  const list = stored[SYNC_SCOPES_KEY];
  return Array.isArray(list) && list.length > 0;
}
