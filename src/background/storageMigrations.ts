import semver from "semver";
import browser from "@/lib/browser";

function crossedUpgrade(previousVersion: string, boundary: string): boolean {
  const prev = semver.coerce(previousVersion);
  const curr = semver.coerce(browser.runtime.getManifest().version);
  return prev != null && curr != null && !semver.lt(curr, boundary) && semver.lt(prev, boundary);
}

/** One-time storage patches when crossing 3.6.5 / 3.6.6 / 3.7.0 / 3.7.7 (see git history on main). */
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
      await browser.storage.local.set({ themeOfTheMonthDisabled: false });
      await browser.storage.local.remove("themeOfTheMonthLastSeenId");
    } catch (e) {
      console.warn("[BetterSEQTA+] Theme of the Month 3.6.6 reset migration failed:", e);
    }
  }

  if (crossedUpgrade(previousVersion, "3.7.0")) {
    try {
      await browser.storage.local.remove([
        "themeOfTheMonthLastSeenId",
        "themeOfTheMonthDismissedMonth",
      ]);
    } catch (e) {
      console.warn("[BetterSEQTA+] Theme of the Month 3.7.0 dismissal migration failed:", e);
    }
  }

  if (crossedUpgrade(previousVersion, "3.7.7")) {
    try {
      await browser.storage.local.remove([
        "bsplus_remote_config_snapshot",
        "bsplus_remote_config_etag",
        "bsplus_remote_config_fetched_at",
        "bsplus_remote_config_last_hostname",
        "bsplus_remote_last_primary_ok",
        "bsplus_campaign_seen",
        "bsplus_local_override_onoff",
        "bsplus_features_hidden_until_version",
        "bsplus_install_registered_at",
        "bsplus_remote_theme_before_v1",
        "bsplus_remote_theme_state_v1",
        "bsplus_remote_theme_user_off",
      ]);
    } catch (e) {
      console.warn("[BetterSEQTA+] 3.7.7 storage cleanup migration failed:", e);
    }
  }
}
