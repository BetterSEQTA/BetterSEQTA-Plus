import browser from "webextension-polyfill";

/** Matches the contract in docs/CLOUD_SETTINGS_SYNC_SERVER.md */
export const CLOUD_SETTINGS_SYNC_SCHEMA_VERSION = 1;

/**
 * Client-only: last known remote `updated_at` for BS+ settings (from summary or sync responses).
 * Never uploaded; preserved on restore; used to decide when to pull a newer cloud backup.
 */
export const BSPLUS_CLOUD_KNOWN_REMOTE_UPDATED_AT_KEY =
  "bsplus_cloud_settings_known_remote_updated_at";

/**
 * Written by the service worker after applying a cloud settings envelope; the SEQTA page’s
 * ThemeManager reads and clears it (SW cannot share localforage/IndexedDB with the page).
 */
export const BSPLUS_PENDING_THEME_ENSURE_AFTER_CLOUD_KEY =
  "bsplus_pending_theme_ensure_after_cloud";

/**
 * Never uploaded to the cloud backup (OAuth and legacy keys).
 * IndexedDB (e.g. Global Search’s `betterseqta-index` database) is not part of
 * `chrome.storage.local` and is never included in this payload.
 */
export const KEYS_OMITTED_FROM_CLOUD_UPLOAD = [
  "bsplus_token",
  "bsplus_refresh_token",
  "bsplus_client_id",
  "bsplus_user",
  "cloudAccessToken",
  "cloudUsername",
] as const;

/**
 * Device-only caches / school-related data: never uploaded, never applied from a
 * cloud snapshot (local values are kept on restore).
 */
export const SENSITIVE_DEVICE_STORAGE_KEYS_EXACT = [
  "plugin.assessments-average.storage.assessments",
  "plugin.assessments-average.storage.weightings",
] as const;

/** e.g. any future `plugin.global-search.storage.*` keys in chrome.storage */
export const SENSITIVE_DEVICE_STORAGE_KEY_PREFIXES = ["plugin.global-search.storage."] as const;

const CLIENT_ONLY_CLOUD_KEYS_EXACT = [
  BSPLUS_CLOUD_KNOWN_REMOTE_UPDATED_AT_KEY,
  "bsplus_lastCloudPoll",
  BSPLUS_PENDING_THEME_ENSURE_AFTER_CLOUD_KEY,
] as const;

/** After restoring from cloud, keep local session so the user stays signed in. */
const AUTH_KEYS_TO_PRESERVE = [
  "bsplus_token",
  "bsplus_refresh_token",
  "bsplus_client_id",
  "bsplus_user",
] as const;

const OMIT_FROM_UPLOAD_EXACT = new Set<string>([
  ...KEYS_OMITTED_FROM_CLOUD_UPLOAD,
  ...SENSITIVE_DEVICE_STORAGE_KEYS_EXACT,
  ...CLIENT_ONLY_CLOUD_KEYS_EXACT,
]);

/** True if a storage key is part of the upload payload (and should trigger auto-upload when changed). */
export function isKeyIncludedInCloudUploadPayload(key: string): boolean {
  return !shouldOmitKeyFromCloudPayload(key);
}

function shouldOmitKeyFromCloudPayload(key: string): boolean {
  if (OMIT_FROM_UPLOAD_EXACT.has(key)) return true;
  for (const prefix of SENSITIVE_DEVICE_STORAGE_KEY_PREFIXES) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

function isSensitiveDeviceKey(key: string): boolean {
  if ((SENSITIVE_DEVICE_STORAGE_KEYS_EXACT as readonly string[]).includes(key)) return true;
  for (const prefix of SENSITIVE_DEVICE_STORAGE_KEY_PREFIXES) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

/** Auth + device-only caches + client-only cloud metadata to keep when merging a downloaded snapshot. */
function collectLocalKeysToPreserve(local: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of AUTH_KEYS_TO_PRESERVE) {
    if (local[k] !== undefined) out[k] = local[k];
  }
  for (const k of CLIENT_ONLY_CLOUD_KEYS_EXACT) {
    if (local[k] !== undefined) out[k] = local[k];
  }
  for (const [k, v] of Object.entries(local)) {
    if (isSensitiveDeviceKey(k)) out[k] = v;
  }
  return out;
}

/** Remove keys that must never come from the server blob (defense in depth). */
function stripExcludedKeysFromRemoteData(remote: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(remote)) {
    if (shouldOmitKeyFromCloudPayload(k)) continue;
    out[k] = v;
  }
  return out;
}

/** Stored theme id (`selectedTheme`); trims whitespace; empty string clears. */
export function normalizeThemeIdForSync(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim();
}

export function buildUploadPayload(all: Record<string, unknown>): {
  schemaVersion: number;
  themeId: string;
  data: Record<string, unknown>;
} {
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(all)) {
    if (shouldOmitKeyFromCloudPayload(k)) continue;
    filtered[k] = v;
  }
  const data = migrateLegacyToPluginSettings(filtered);
  const themeId = normalizeThemeIdForSync(all.selectedTheme);
  return {
    schemaVersion: CLOUD_SETTINGS_SYNC_SCHEMA_VERSION,
    themeId,
    data,
  };
}

export async function getSnapshotForUpload(): Promise<{
  schemaVersion: number;
  themeId: string;
  data: Record<string, unknown>;
}> {
  const all = await browser.storage.local.get();
  return buildUploadPayload(all as Record<string, unknown>);
}

/** Theme to ensure is installed locally after a downloaded envelope (explicit field overrides `data.selectedTheme`). */
export function resolveThemeIdForPostSyncDownload(envelope: unknown): string | undefined {
  if (envelope && typeof envelope === "object" && "themeId" in envelope) {
    const top = normalizeThemeIdForSync(
      (envelope as Record<string, unknown>).themeId,
    );
    if (top) return top;
  }

  let remoteFlat: Record<string, unknown>;
  if (
    envelope &&
    typeof envelope === "object" &&
    "data" in envelope &&
    (envelope as { data?: unknown }).data !== undefined &&
    typeof (envelope as { data?: unknown }).data === "object" &&
    (envelope as { data?: unknown }).data !== null &&
    !Array.isArray((envelope as { data?: unknown }).data)
  ) {
    remoteFlat = (envelope as { data: Record<string, unknown> }).data;
  } else if (envelope && typeof envelope === "object" && !Array.isArray(envelope)) {
    remoteFlat = envelope as Record<string, unknown>;
  } else {
    return undefined;
  }

  const migrated = migrateLegacyToPluginSettings(remoteFlat);
  const fromData = normalizeThemeIdForSync(migrated.selectedTheme);
  return fromData === "" ? undefined : fromData;
}

export async function setKnownRemoteUpdatedAt(iso: string | undefined): Promise<void> {
  if (!iso || typeof iso !== "string") return;
  await browser.storage.local.set({ [BSPLUS_CLOUD_KNOWN_REMOTE_UPDATED_AT_KEY]: iso });
}

/**
 * Migrate legacy storage keys to plugin settings format.
 * Only applies migrations for keys present in the data; does not overwrite
 * existing plugin settings if the legacy key is absent.
 */
function migrateLegacyToPluginSettings(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data };

  function ensurePluginSettings(pluginId: string): Record<string, unknown> {
    const key = `plugin.${pluginId}.settings`;
    if (!result[key] || typeof result[key] !== "object") {
      result[key] = {};
    }
    return result[key] as Record<string, unknown>;
  }

  // animatedbk -> plugin.animated-background.settings.enabled
  if ("animatedbk" in result) {
    const settings = ensurePluginSettings("animated-background");
    if (settings.enabled === undefined) {
      settings.enabled = !!result.animatedbk;
    }
    delete result.animatedbk;
  }

  // bksliderinput -> plugin.animated-background.settings.speed
  // Legacy: string "0"-"100", New: float 0.1-2.0
  if ("bksliderinput" in result) {
    const settings = ensurePluginSettings("animated-background");
    if (settings.speed === undefined) {
      const legacy = parseFloat(String(result.bksliderinput));
      if (!isNaN(legacy)) {
        settings.speed = Math.round((0.1 + (legacy / 100) * 1.9) * 100) / 100;
      }
    }
    delete result.bksliderinput;
  }

  // assessmentsAverage -> plugin.assessments-average.settings.enabled
  if ("assessmentsAverage" in result) {
    const settings = ensurePluginSettings("assessments-average");
    if (settings.enabled === undefined) {
      settings.enabled = !!result.assessmentsAverage;
    }
    delete result.assessmentsAverage;
  }

  // lettergrade -> plugin.assessments-average.settings.lettergrade
  if ("lettergrade" in result) {
    const settings = ensurePluginSettings("assessments-average");
    if (settings.lettergrade === undefined) {
      settings.lettergrade = !!result.lettergrade;
    }
    delete result.lettergrade;
  }

  // notificationCollector -> plugin.notificationCollector.settings.enabled
  if ("notificationCollector" in result && typeof result.notificationCollector === "boolean") {
    const settings = ensurePluginSettings("notificationCollector");
    if (settings.enabled === undefined) {
      settings.enabled = result.notificationCollector;
    }
    delete result.notificationCollector;
  }

  return result;
}

/**
 * Apply the downloaded cloud snapshot by setting each key individually,
 * preserving auth keys and device-only sensitive caches.
 * Legacy keys are automatically migrated to plugin settings format.
 */
export async function applyDownloadedEnvelope(envelope: unknown): Promise<void> {
  let remoteFlat: Record<string, unknown>;
  if (
    envelope &&
    typeof envelope === "object" &&
    "data" in envelope &&
    (envelope as { data?: unknown }).data !== undefined &&
    typeof (envelope as { data?: unknown }).data === "object" &&
    (envelope as { data?: unknown }).data !== null &&
    !Array.isArray((envelope as { data?: unknown }).data)
  ) {
    remoteFlat = (envelope as { data: Record<string, unknown> }).data;
  } else if (envelope && typeof envelope === "object" && !Array.isArray(envelope)) {
    remoteFlat = envelope as Record<string, unknown>;
  } else {
    throw new Error("Invalid cloud settings payload");
  }

  const migrated = migrateLegacyToPluginSettings(remoteFlat);
  const remoteSanitized = stripExcludedKeysFromRemoteData(migrated);
  await browser.storage.local.set(remoteSanitized);
}
