import browser from "webextension-polyfill";
import { SYNCABLE_PLUGIN_SETTING_DEFAULTS } from "@/plugins/syncablePluginDefaults";
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
  "bsCloudAutoSyncAnnouncementShown",
  "themeOfTheMonthDismissedMonth",
  "themeOfTheMonthLastSeenId",
  "justupdated",
  "devMode",
  "verboseLogging",
  "hideSensitiveContent",
  "mockNotices",
  "homeUpcomingAssessmentsPerSubjectMax",
  "homeUpcomingIncludePast",
  "devGhReleaseVersionOverride",
  "lastSeenNightlyPublishedAt",
  "originalDarkMode",
  "profile_picture_revision",
] as const;

let defaultsEnsured = false;

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

  for (const [pluginId, settings] of Object.entries(
    SYNCABLE_PLUGIN_SETTING_DEFAULTS,
  )) {
    flat[`plugin.${pluginId}.settings`] = settings;
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
 * Writes any missing cloud-syncable keys locally for consistent diffing.
 * Never overwrites existing values. Missing plugin settings respect legacy keys.
 */
export async function ensureSyncableStorageDefaults(): Promise<void> {
  if (defaultsEnsured) return;

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

  defaultsEnsured = true;
}
