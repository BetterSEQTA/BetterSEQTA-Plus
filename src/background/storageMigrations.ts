import semver from "semver";
import browser from "@/lib/browser";

function crossedUpgrade(previousVersion: string, boundary: string): boolean {
  const prev = semver.coerce(previousVersion);
  const curr = semver.coerce(browser.runtime.getManifest().version);
  return prev != null && curr != null && !semver.lt(curr, boundary) && semver.lt(prev, boundary);
}

/** One-time storage patches when crossing 3.6.5 / 3.6.6 / 3.7.0 (see git history on main). */
export async function runStorageMigrations(previousVersion: string): Promise<void> {
  if (crossedUpgrade(previousVersion, "3.6.5")) {
    try {
      const key = "plugin.global-search.settings";
      const got = await browser.storage.local.get(key);
      const existing = (got[key] ?? {}) as Record<string, unknown>;
      await browser.storage.local.set({
        [key]: {
          ...existing,
          enabled: true,
          transparencyEffects: true,
          runIndexingOnLoad: true,
          passiveIndexing: true,
        },
      });
    } catch (e) {
      console.warn("[BetterSEQTA+] Global Search 3.6.5 settings migration failed:", e);
    }
  }

  if (crossedUpgrade(previousVersion, "3.6.6")) {
    try {
      await browser.storage.local.set({
        themeOfTheMonthDisabled: false,
        themeOfTheMonthLastSeenId: undefined,
      });
    } catch (e) {
      console.warn("[BetterSEQTA+] Theme of the Month 3.6.6 reset migration failed:", e);
    }
  }

  if (crossedUpgrade(previousVersion, "3.7.0")) {
    try {
      await browser.storage.local.set({
        themeOfTheMonthLastSeenId: undefined,
        themeOfTheMonthDismissedMonth: undefined,
      });
    } catch (e) {
      console.warn("[BetterSEQTA+] Theme of the Month 3.7.0 dismissal migration failed:", e);
    }
  }
}
