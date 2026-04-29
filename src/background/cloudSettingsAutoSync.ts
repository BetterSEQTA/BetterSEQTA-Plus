import browser from "webextension-polyfill";
import {
  applyDownloadedEnvelope,
  buildUploadPayload,
  BSPLUS_CLOUD_KNOWN_REMOTE_UPDATED_AT_KEY,
  BSPLUS_PENDING_THEME_ENSURE_AFTER_CLOUD_KEY,
  CLOUD_SETTINGS_SYNC_SCHEMA_VERSION,
  isKeyIncludedInCloudUploadPayload,
  resolveThemeIdForPostSyncDownload,
  setKnownRemoteUpdatedAt,
} from "@/seqta/utils/cloudSettingsSync";

const ACCOUNTS_BASE = "https://accounts.betterseqta.org";
export const CLOUD_SUMMARY_URL = `${ACCOUNTS_BASE}/api/user/cloud-summary`;
const CLOUD_SETTINGS_SYNC_URL = `${ACCOUNTS_BASE}/api/bsplus/settings/sync`;
const REFRESH_URL = `${ACCOUNTS_BASE}/api/bsplus/refresh`;

const UPLOAD_DEBOUNCE_MS = 2000;
const POLL_THROTTLE_MS = 24 * 60 * 60 * 1000;
const POLL_THROTTLE_KEY = "bsplus_lastCloudPoll";

type CloudSummaryResponse = {
  desqta?: unknown;
  bsplus?: { updated_at: string; schemaVersion: number } | null;
};

let reloadSeqtaPagesFn: (() => void) | null = null;
let suppressAutoUploadDuringRestore = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pollInFlight: Promise<void> | null = null;

function isAutoCloudSyncEnabled(all: Record<string, unknown>): boolean {
  return all.autoCloudSettingsSync !== false;
}

async function parseJsonResponse(r: Response): Promise<any> {
  const text = await r.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function getAccessToken(): Promise<string | null> {
  const { bsplus_token } = await browser.storage.local.get("bsplus_token");
  return typeof bsplus_token === "string" && bsplus_token.length > 0 ? bsplus_token : null;
}

async function tryRefreshTokens(): Promise<boolean> {
  const result = await browser.storage.local.get([
    "bsplus_refresh_token",
    "bsplus_client_id",
    "bsplus_user",
  ]);
  const refresh_token = result.bsplus_refresh_token as string | undefined;
  const client_id = result.bsplus_client_id as string | undefined;
  if (!refresh_token || !client_id) return false;

  try {
    const r = await fetch(REFRESH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token, client_id }),
    });
    const data = await parseJsonResponse(r);
    if (!r.ok || !data.access_token || !data.refresh_token) return false;

    await browser.storage.local.set({
      bsplus_token: data.access_token,
      bsplus_refresh_token: data.refresh_token,
      bsplus_user: data.user ?? result.bsplus_user,
    });
    return true;
  } catch {
    return false;
  }
}

function isServerTimestampNewer(serverIso: string, localIso: string | undefined): boolean {
  const a = Date.parse(serverIso);
  if (Number.isNaN(a)) return false;
  if (localIso === undefined || localIso === "") return true;
  const b = Date.parse(localIso);
  if (Number.isNaN(b)) return true;
  return a > b;
}

async function fetchCloudSummaryOnce(
  token: string,
): Promise<
  | { ok: true; data: CloudSummaryResponse }
  | { ok: false; unauthorized: boolean; error?: string }
> {
  try {
    const r = await fetch(CLOUD_SUMMARY_URL, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = (await parseJsonResponse(r)) as CloudSummaryResponse;
    if (r.status === 401) return { ok: false, unauthorized: true };
    if (!r.ok) {
      return {
        ok: false,
        unauthorized: false,
        error: (data as { error?: string })?.error ?? `Summary failed (${r.status})`,
      };
    }
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      unauthorized: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

async function fetchCloudSummaryWithAuthRetry(
  token: string,
): Promise<CloudSummaryResponse | null> {
  let t = token;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetchCloudSummaryOnce(t);
    if (res.ok) return res.data;
    if (res.unauthorized && attempt === 0) {
      const refreshed = await tryRefreshTokens();
      if (!refreshed) break;
      const next = await getAccessToken();
      if (!next) break;
      t = next;
      continue;
    }
    if (res.error) console.warn("[BS+ cloud sync] cloud-summary:", res.error);
    break;
  }
  return null;
}

type PutResult =
  | { ok: true; updated_at?: string }
  | { ok: false; unauthorized: boolean; error?: string };

async function putSettingsOnce(token: string): Promise<PutResult> {
  try {
    const all = await browser.storage.local.get();
    const payload = buildUploadPayload(all as Record<string, unknown>);
    const r = await fetch(CLOUD_SETTINGS_SYNC_URL, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await parseJsonResponse(r);
    if (r.status === 401) return { ok: false, unauthorized: true };
    if (!r.ok) {
      return {
        ok: false,
        unauthorized: false,
        error: data?.error ?? `Upload failed (${r.status})`,
      };
    }
    const updated_at = data?.updated_at as string | undefined;
    await setKnownRemoteUpdatedAt(updated_at);
    return { ok: true, updated_at };
  } catch (e) {
    return {
      ok: false,
      unauthorized: false,
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}

export async function performCloudSettingsUploadWithRetry(
  token: string,
): Promise<{ success: boolean; error?: string; updated_at?: string }> {
  let t = token;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await putSettingsOnce(t);
    if (res.ok) return { success: true, updated_at: res.updated_at };
    if (res.unauthorized && attempt === 0) {
      const refreshed = await tryRefreshTokens();
      if (!refreshed) return { success: false, error: "Not authenticated" };
      const next = await getAccessToken();
      if (!next) return { success: false, error: "Not authenticated" };
      t = next;
      continue;
    }
    return { success: false, error: res.error ?? "Upload failed" };
  }
  return { success: false, error: "Upload failed" };
}

type GetResult =
  | { ok: true; updated_at?: string }
  | { ok: false; notFound?: boolean; unauthorized: boolean; error?: string };

async function getSettingsAndApplyOnce(token: string): Promise<GetResult> {
  try {
    const r = await fetch(CLOUD_SETTINGS_SYNC_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await parseJsonResponse(r);
    if (r.status === 401) return { ok: false, unauthorized: true };
    if (r.status === 404) {
      return {
        ok: false,
        notFound: true,
        unauthorized: false,
        error: "No settings backup found in the cloud",
      };
    }
    if (!r.ok) {
      return {
        ok: false,
        unauthorized: false,
        error: data?.error ?? `Download failed (${r.status})`,
      };
    }
    const themeIdToEnsure = resolveThemeIdForPostSyncDownload(data);
    await applyDownloadedEnvelope(data);
    if (themeIdToEnsure) {
      await browser.storage.local.set({
        [BSPLUS_PENDING_THEME_ENSURE_AFTER_CLOUD_KEY]: themeIdToEnsure,
      });
    } else {
      await browser.storage.local.remove(BSPLUS_PENDING_THEME_ENSURE_AFTER_CLOUD_KEY);
    }
    reloadSeqtaPagesFn?.();
    const updated_at = data?.updated_at as string | undefined;
    await setKnownRemoteUpdatedAt(updated_at);
    return { ok: true, updated_at };
  } catch (e) {
    return {
      ok: false,
      unauthorized: false,
      error: e instanceof Error ? e.message : "Download failed",
    };
  }
}

export async function performCloudSettingsDownloadWithRetry(
  token: string,
): Promise<{ success: boolean; notFound?: boolean; error?: string; updated_at?: string }> {
  suppressAutoUploadDuringRestore = true;
  try {
    let t = token;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await getSettingsAndApplyOnce(t);
      if (res.ok) return { success: true, updated_at: res.updated_at };
      if (res.unauthorized && attempt === 0) {
        const refreshed = await tryRefreshTokens();
        if (!refreshed) return { success: false, error: "Not authenticated" };
        const next = await getAccessToken();
        if (!next) return { success: false, error: "Not authenticated" };
        t = next;
        continue;
      }
      return {
        success: false,
        notFound: res.notFound,
        error: res.error ?? "Download failed",
      };
    }
    return { success: false, error: "Download failed" };
  } finally {
    suppressAutoUploadDuringRestore = false;
  }
}

async function maybeUploadBaseline(token: string): Promise<void> {
  const res = await performCloudSettingsUploadWithRetry(token);
  if (!res.success) {
    console.warn("[BS+ cloud sync] Baseline upload failed:", res.error);
  }
}

async function downloadIfNeeded(token: string): Promise<void> {
  const res = await performCloudSettingsDownloadWithRetry(token);
  if (!res.success && !res.notFound) {
    console.warn("[BS+ cloud sync] Auto-download failed:", res.error);
  }
}

async function runCloudSettingsPollInner(): Promise<void> {
  const all = (await browser.storage.local.get()) as Record<string, unknown>;
  if (!isAutoCloudSyncEnabled(all)) return;

  let token = await getAccessToken();
  if (!token) return;

  const summary = await fetchCloudSummaryWithAuthRetry(token);
  if (!summary) return;

  const bsplus = summary.bsplus;
  const watermark = all[BSPLUS_CLOUD_KNOWN_REMOTE_UPDATED_AT_KEY] as string | undefined;

  if (
    bsplus &&
    typeof bsplus.schemaVersion === "number" &&
    bsplus.schemaVersion > CLOUD_SETTINGS_SYNC_SCHEMA_VERSION
  ) {
    console.warn(
      "[BS+ cloud sync] Server schemaVersion newer than client; skip auto-download",
    );
    return;
  }

  token = (await getAccessToken()) ?? token;

  if (!watermark) {
    if (!bsplus?.updated_at) {
      await maybeUploadBaseline(token);
      return;
    }
    await downloadIfNeeded(token);
    return;
  }

  if (!bsplus?.updated_at) return;

  if (isServerTimestampNewer(bsplus.updated_at, watermark)) {
    await downloadIfNeeded(token);
  }
}

export function runCloudSettingsPoll(): Promise<void> {
  if (pollInFlight) return pollInFlight;
  pollInFlight = (async () => {
    try {
      const { [POLL_THROTTLE_KEY]: last } = await browser.storage.local.get(POLL_THROTTLE_KEY);
      if (Date.now() - (Number(last) || 0) < POLL_THROTTLE_MS) return;
      await browser.storage.local.set({ [POLL_THROTTLE_KEY]: Date.now() });
      await runCloudSettingsPollInner();
    } catch (e) {
      console.error("[BS+ cloud sync] Poll error:", e);
    } finally {
      pollInFlight = null;
    }
  })();
  return pollInFlight;
}

function clearUploadDebounce(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

function scheduleDebouncedUpload(): void {
  if (suppressAutoUploadDuringRestore) return;
  clearUploadDebounce();
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runDebouncedUploadJob();
  }, UPLOAD_DEBOUNCE_MS);
}

async function runDebouncedUploadJob(): Promise<void> {
  const all = (await browser.storage.local.get()) as Record<string, unknown>;
  if (!isAutoCloudSyncEnabled(all)) return;
  const token = await getAccessToken();
  if (!token) return;
  const res = await performCloudSettingsUploadWithRetry(token);
  if (!res.success) {
    console.warn("[BS+ cloud sync] Auto-upload failed:", res.error);
  }
}

async function syncAutoUploadWithStorage(): Promise<void> {
  const all = (await browser.storage.local.get()) as Record<string, unknown>;
  if (!isAutoCloudSyncEnabled(all)) {
    clearUploadDebounce();
  }
}

function onStorageChanged(
  changes: Record<string, browser.storage.StorageChange>,
  area: string,
): void {
  if (area !== "local") return;

  if (Object.prototype.hasOwnProperty.call(changes, "autoCloudSettingsSync")) {
    void syncAutoUploadWithStorage();
  }

  const keys = Object.keys(changes);
  if (!keys.some((k) => isKeyIncludedInCloudUploadPayload(k))) return;

  void (async () => {
    const all = (await browser.storage.local.get()) as Record<string, unknown>;
    if (!isAutoCloudSyncEnabled(all)) return;
    if (suppressAutoUploadDuringRestore) return;
    if (!(await getAccessToken())) return;
    scheduleDebouncedUpload();
  })();
}

export function initCloudSettingsAutoSync(deps: { reloadSeqtaPages: () => void }): void {
  reloadSeqtaPagesFn = deps.reloadSeqtaPages;
  browser.storage.onChanged.addListener(onStorageChanged);
}

