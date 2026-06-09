import browser from "webextension-polyfill";
import { getAllPluginSettings } from "@/plugins";
import { getDefaultSettingsState } from "@/seqta/utils/defaultSettings";
import {
  isKeyIncludedInCloudUploadPayload,
  migrateLegacyToPluginSettings,
} from "@/seqta/utils/cloudSettingsSync";

/** Legacy top-level keys — never backfill; use `migrateLegacyToPluginSettings` instead. */
const LEGACY_STORAGE_KEYS = [
  "animatedbk",
  "bksliderinput",
  "assessmentsAverage",
  "lettergrade",
  "notificationCollector",
] as const;

/**
 * Keys where `undefined` in storage is intentional and must not be replaced by a
 * default (differs from the value we would write).
 */
const OPTIONAL_UNSET_MEANS_DEFAULT_KEYS = [
  "timeFormat",
  "selectedFont",
  "privacyStatementShown",
  "privacyStatementLastUpdated",
  "engageParentsAnnouncementShown",
  "bsCloudAutoSyncAnnouncementShown",
  "themeOfTheMonthDismissedMonth",
  "themeOfTheMonthLastSeenId",
  "justupdated",
  "devMode",
  "hideSensitiveContent",
  "mockNotices",
  "devGhReleaseVersionOverride",
  "lastSeenNightlyPublishedAt",
  "originalDarkMode",
  "profile_picture_revision",
] as const;

function buildDefaultPluginSettings(
  plugin: ReturnType<typeof getAllPluginSettings>[number],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, setting] of Object.entries(plugin.settings)) {
    const meta = setting as { type?: string; default?: unknown };
    if (meta.type === "component" || meta.type === "button") continue;
    out[key] = meta.default;
  }
  return out;
}

/**
 * Flat default map in upload shape (plugin-format only; no legacy keys).
 */
export function getSyncableStorageDefaults(): Record<string, unknown> {
  const flat: Record<string, unknown> = {
    ...getDefaultSettingsState(),
  };

  for (const key of LEGACY_STORAGE_KEYS) {
    delete flat[key];
  }
  for (const key of OPTIONAL_UNSET_MEANS_DEFAULT_KEYS) {
    delete flat[key];
  }

  for (const plugin of getAllPluginSettings()) {
    flat[`plugin.${plugin.pluginId}.settings`] =
      buildDefaultPluginSettings(plugin);
  }

  return flat;
}

function mergePluginSettingsDefaults(
  defaults: Record<string, unknown>,
  fromLegacy: unknown,
): Record<string, unknown> {
  if (!fromLegacy || typeof fromLegacy !== "object" || Array.isArray(fromLegacy)) {
    return defaults;
  }
  return { ...defaults, ...(fromLegacy as Record<string, unknown>) };
}

/**
 * Writes any missing cloud-syncable keys so uploads contain a full schema.
 * Never overwrites existing values. Missing plugin settings respect legacy keys.
 */
export async function ensureSyncableStorageDefaults(): Promise<void> {
  const existing = await browser.storage.local.get();
  const migratedFromExisting = migrateLegacyToPluginSettings({
    ...existing,
  });
  const defaults = getSyncableStorageDefaults();

  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(defaults)) {
    if (!isKeyIncludedInCloudUploadPayload(key)) continue;
    if (Object.prototype.hasOwnProperty.call(existing, key)) continue;

    if (key.startsWith("plugin.") && key.endsWith(".settings")) {
      patch[key] = mergePluginSettingsDefaults(
        value as Record<string, unknown>,
        migratedFromExisting[key],
      );
      continue;
    }

    patch[key] = value;
  }

  if (Object.keys(patch).length > 0) {
    await browser.storage.local.set(patch);
  }
}
