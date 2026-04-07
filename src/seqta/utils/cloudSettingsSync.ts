import browser from "webextension-polyfill";

/** Matches the contract in docs/CLOUD_SETTINGS_SYNC_SERVER.md */
export const CLOUD_SETTINGS_SYNC_SCHEMA_VERSION = 1;

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
]);

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

/** Auth + device-only caches to keep when merging a downloaded snapshot. */
function collectLocalKeysToPreserve(local: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of AUTH_KEYS_TO_PRESERVE) {
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

export function buildUploadPayload(all: Record<string, unknown>): {
  schemaVersion: number;
  data: Record<string, unknown>;
} {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(all)) {
    if (shouldOmitKeyFromCloudPayload(k)) continue;
    data[k] = v;
  }
  return { schemaVersion: CLOUD_SETTINGS_SYNC_SCHEMA_VERSION, data };
}

export async function getSnapshotForUpload(): Promise<{
  schemaVersion: number;
  data: Record<string, unknown>;
}> {
  const all = await browser.storage.local.get();
  return buildUploadPayload(all as Record<string, unknown>);
}

/**
 * Replace local extension storage with the downloaded snapshot, except auth keys
 * and device-only sensitive caches, which are preserved from the current device.
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

  const local = await browser.storage.local.get();
  const preserved = collectLocalKeysToPreserve(local);
  const remoteSanitized = stripExcludedKeysFromRemoteData(remoteFlat);

  await browser.storage.local.clear();
  await browser.storage.local.set({ ...remoteSanitized, ...preserved });
}
