import browser from "webextension-polyfill";
import { getOrCreateInstallId } from "@/seqta/utils/feedback/installId";
import { isAllowedFetchUrl } from "@/seqta/utils/allowedFetchUrl";
import {
  mergeGithubConfigFiles,
  normalizeRemoteConfigSnapshot,
} from "@/seqta/utils/remoteConfig/normalize";
import {
  BSPLUS_INSTALL_REGISTERED_AT_KEY,
  BSPLUS_REMOTE_CONFIG_ETAG_KEY,
  BSPLUS_REMOTE_CONFIG_FETCHED_AT_KEY,
  BSPLUS_REMOTE_CONFIG_LAST_HOSTNAME_KEY,
  BSPLUS_REMOTE_CONFIG_SNAPSHOT_KEY,
  BSPLUS_REMOTE_LAST_PRIMARY_OK_KEY,
  BS_STATUS_MANIFEST_URL,
  REGISTER_INTERVAL_MS,
  REMOTE_CONFIG_ALARM,
  REMOTE_CONFIG_POLL_MINUTES,
} from "@/seqta/utils/remoteConfig/storageKeys";
import type { RemoteConfigSnapshot } from "@/seqta/utils/remoteConfig/types";

type MessageSender = { (response?: unknown): void };

function extensionChannel(): string {
  if (typeof __UPDATE_CHANNEL__ !== "undefined") {
    if (__UPDATE_CHANNEL__ === "nightly") return "nightly";
    if (__UPDATE_CHANNEL__ === "stable") return "stable";
  }
  return "unknown";
}

function extensionVersion(): string {
  try {
    return browser.runtime.getManifest().version;
  } catch {
    return "0";
  }
}

async function parseJson(r: Response): Promise<unknown> {
  const text = await r.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

async function readLastHostname(): Promise<string | undefined> {
  const stored = await browser.storage.local.get(BSPLUS_REMOTE_CONFIG_LAST_HOSTNAME_KEY);
  const hostname = stored[BSPLUS_REMOTE_CONFIG_LAST_HOSTNAME_KEY];
  return typeof hostname === "string" && hostname.length > 0 ? hostname : undefined;
}

async function fetchGithubSnapshot(): Promise<RemoteConfigSnapshot | null> {
  try {
    const manifestRes = await fetch(BS_STATUS_MANIFEST_URL, { cache: "no-store" });
    if (!manifestRes.ok) return null;
    const manifest = (await parseJson(manifestRes)) as Record<string, unknown> | null;
    if (!manifest?.files || typeof manifest.files !== "object") return null;
    const base =
      BS_STATUS_MANIFEST_URL.replace(/manifest\.json$/, "") ||
      "https://raw.githubusercontent.com/BetterSEQTA/BS-Status/main/config/";
    const files: Record<string, unknown> = {};
    for (const [key, fileName] of Object.entries(
      manifest.files as Record<string, string>,
    )) {
      if (typeof fileName !== "string") continue;
      const url = fileName.startsWith("http") ? fileName : `${base}${fileName}`;
      if (!isAllowedFetchUrl(url)) continue;
      const fr = await fetch(url, { cache: "no-store" });
      if (!fr.ok) continue;
      files[key] = await parseJson(fr);
    }
    return mergeGithubConfigFiles(manifest, files);
  } catch (e) {
    console.warn("[BetterSEQTA+] GitHub remote config fallback failed:", e);
    return null;
  }
}

async function registerInstall(
  apiBase: string,
  primaryOk: boolean,
  force = false,
): Promise<void> {
  if (!primaryOk) return;
  const stored = await browser.storage.local.get(BSPLUS_INSTALL_REGISTERED_AT_KEY);
  const last = Number(stored[BSPLUS_INSTALL_REGISTERED_AT_KEY] ?? 0);
  if (!force && Date.now() - last < REGISTER_INTERVAL_MS) return;

  const installId = await getOrCreateInstallId();
  const { bsplus_token, bsplus_user } = await browser.storage.local.get([
    "bsplus_token",
    "bsplus_user",
  ]);
  const userId =
    bsplus_user && typeof bsplus_user === "object" && "id" in bsplus_user
      ? String((bsplus_user as { id: string }).id)
      : undefined;

  const hostname = await readLastHostname();

  const body = {
    installId,
    extension: {
      version: extensionVersion(),
      channel: extensionChannel(),
      browser: "chrome",
    },
    userId,
    lastSeenAt: new Date().toISOString(),
    ...(hostname ? { hostname } : {}),
  };

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (typeof bsplus_token === "string" && bsplus_token.length > 0) {
      headers.Authorization = `Bearer ${bsplus_token}`;
    }
    const r = await fetch(`${apiBase}/api/bsplus/installs/register`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (r.ok) {
      await browser.storage.local.set({
        [BSPLUS_INSTALL_REGISTERED_AT_KEY]: Date.now(),
      });
    }
  } catch (e) {
    console.warn("[BetterSEQTA+] install register failed:", e);
  }
}

export async function refreshRemoteConfig(apiBase: () => string): Promise<{
  snapshot: RemoteConfigSnapshot;
  fromNetwork: boolean;
  primaryOk: boolean;
}> {
  const base = apiBase();
  const installId = await getOrCreateInstallId();
  const hostname = await readLastHostname();
  const params = new URLSearchParams({
    installId,
    extensionVersion: extensionVersion(),
    channel: extensionChannel(),
  });
  if (hostname) params.set("hostname", hostname);

  const stored = await browser.storage.local.get([
    BSPLUS_REMOTE_CONFIG_SNAPSHOT_KEY,
    BSPLUS_REMOTE_CONFIG_ETAG_KEY,
  ]);
  const etag = stored[BSPLUS_REMOTE_CONFIG_ETAG_KEY] as string | undefined;
  const prior = stored[BSPLUS_REMOTE_CONFIG_SNAPSHOT_KEY];

  let primaryOk = false;
  let snapshot: RemoteConfigSnapshot | null = null;

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (etag) headers["If-None-Match"] = etag;
    const r = await fetch(`${base}/api/bsplus/remote-config?${params}`, {
      cache: "no-store",
      headers,
    });
    if (r.status === 304 && prior) {
      primaryOk = true;
      snapshot = normalizeRemoteConfigSnapshot(prior);
      snapshot.source = "cache";
    } else if (r.ok) {
      primaryOk = true;
      const json = await parseJson(r);
      snapshot = normalizeRemoteConfigSnapshot(json);
      snapshot.source = "api";
      const newEtag = r.headers.get("ETag") ?? snapshot.etag;
      if (newEtag) snapshot.etag = newEtag;
      await browser.storage.local.set({
        [BSPLUS_REMOTE_CONFIG_SNAPSHOT_KEY]: snapshot,
        [BSPLUS_REMOTE_CONFIG_FETCHED_AT_KEY]: Date.now(),
        [BSPLUS_REMOTE_LAST_PRIMARY_OK_KEY]: true,
        ...(newEtag ? { [BSPLUS_REMOTE_CONFIG_ETAG_KEY]: newEtag } : {}),
      });
    }
  } catch (e) {
    console.warn("[BetterSEQTA+] remote-config primary fetch failed:", e);
  }

  if (!snapshot) {
    snapshot = await fetchGithubSnapshot();
    if (snapshot) {
      await browser.storage.local.set({
        [BSPLUS_REMOTE_CONFIG_SNAPSHOT_KEY]: snapshot,
        [BSPLUS_REMOTE_CONFIG_FETCHED_AT_KEY]: Date.now(),
        [BSPLUS_REMOTE_LAST_PRIMARY_OK_KEY]: false,
      });
    } else if (prior) {
      snapshot = normalizeRemoteConfigSnapshot(prior);
      snapshot.source = "cache";
    } else {
      snapshot = normalizeRemoteConfigSnapshot(null);
    }
  }

  if (primaryOk) {
    await browser.storage.local.set({ [BSPLUS_REMOTE_LAST_PRIMARY_OK_KEY]: true });
  }

  void registerInstall(base, primaryOk);
  return { snapshot, fromNetwork: primaryOk, primaryOk };
}

export function initRemoteConfigBackground(apiBase: () => string): void {
  void refreshRemoteConfig(apiBase);

  browser.alarms.create(REMOTE_CONFIG_ALARM, {
    periodInMinutes: REMOTE_CONFIG_POLL_MINUTES,
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === REMOTE_CONFIG_ALARM) void refreshRemoteConfig(apiBase);
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.bsplus_token || changes.bsplus_user) {
      void (async () => {
        const lastPrimary = await browser.storage.local.get(BSPLUS_REMOTE_LAST_PRIMARY_OK_KEY);
        const primaryOk = lastPrimary[BSPLUS_REMOTE_LAST_PRIMARY_OK_KEY] === true;
        if (primaryOk) {
          await registerInstall(apiBase(), true, true);
        } else {
          const res = await refreshRemoteConfig(apiBase);
          if (res.primaryOk) await registerInstall(apiBase(), true, true);
        }
      })();
    }
  });
}

export function createRemoteConfigHandlers(apiBase: () => string): Record<
  string,
  (request: unknown, sendResponse: MessageSender) => boolean
> {
  function handleRefresh(_req: unknown, sendResponse: MessageSender): boolean {
    void refreshRemoteConfig(apiBase)
      .then((res) => sendResponse(res))
      .catch((err) =>
        sendResponse({
          error: err instanceof Error ? err.message : "Refresh failed",
        }),
      );
    return true;
  }

  function handleGetSnapshot(_req: unknown, sendResponse: MessageSender): boolean {
    void browser.storage.local
      .get(BSPLUS_REMOTE_CONFIG_SNAPSHOT_KEY)
      .then((stored) => {
        sendResponse({
          snapshot: normalizeRemoteConfigSnapshot(
            stored[BSPLUS_REMOTE_CONFIG_SNAPSHOT_KEY],
          ),
        });
      });
    return true;
  }

  function handleSetPageContext(req: { hostname?: string }, sendResponse: MessageSender): boolean {
    const hostname = typeof req.hostname === "string" ? req.hostname.trim() : "";
    if (hostname) {
      void browser.storage.local
        .set({ [BSPLUS_REMOTE_CONFIG_LAST_HOSTNAME_KEY]: hostname })
        .then(() => sendResponse({ ok: true }));
    } else {
      sendResponse({ ok: false });
    }
    return true;
  }

  function handleFetchRemoteThemePackage(
    req: { packageId?: string },
    sendResponse: MessageSender,
  ): boolean {
    const packageId = typeof req.packageId === "string" ? req.packageId.trim() : "";
    if (!packageId) {
      sendResponse({ error: "Missing packageId" });
      return false;
    }
    void (async () => {
      try {
        const hostname = await readLastHostname();
        const params = new URLSearchParams({
          installId: await getOrCreateInstallId(),
          extensionVersion: extensionVersion(),
          channel: extensionChannel(),
        });
        if (hostname) params.set("hostname", hostname);
        const base = apiBase();
        const url = `${base}/api/bsplus/remote-theme-packages/${encodeURIComponent(packageId)}?${params}`;
        if (!isAllowedFetchUrl(url)) {
          sendResponse({ error: "URL not allowed" });
          return;
        }
        const r = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
        if (!r.ok) {
          sendResponse({ error: `HTTP ${r.status}` });
          return;
        }
        const json = await parseJson(r);
        if (!json || typeof json !== "object") {
          sendResponse({ error: "Invalid package response" });
          return;
        }
        sendResponse({ package: json });
      } catch (e) {
        sendResponse({
          error: e instanceof Error ? e.message : "Fetch failed",
        });
      }
    })();
    return true;
  }

  function handleFetchRemoteThemePackageUrl(
    req: { url?: string },
    sendResponse: MessageSender,
  ): boolean {
    const url = typeof req.url === "string" ? req.url.trim() : "";
    if (!url || !isAllowedFetchUrl(url)) {
      sendResponse({ error: "URL not allowed" });
      return false;
    }
    void (async () => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) {
          sendResponse({ error: `HTTP ${r.status}` });
          return;
        }
        const theme = await parseJson(r);
        if (!theme || typeof theme !== "object") {
          sendResponse({ error: "Invalid theme JSON" });
          return;
        }
        sendResponse({ theme });
      } catch (e) {
        sendResponse({
          error: e instanceof Error ? e.message : "Fetch failed",
        });
      }
    })();
    return true;
  }

  return {
    refreshRemoteConfig: handleRefresh,
    getRemoteConfigSnapshot: handleGetSnapshot,
    setRemoteConfigPageContext: handleSetPageContext,
    fetchRemoteThemePackage: handleFetchRemoteThemePackage,
    fetchRemoteThemePackageUrl: handleFetchRemoteThemePackageUrl,
  };
}

export async function isRemoteCloudSyncDisabled(): Promise<boolean> {
  const stored = await browser.storage.local.get(BSPLUS_REMOTE_CONFIG_SNAPSHOT_KEY);
  const snap = normalizeRemoteConfigSnapshot(stored[BSPLUS_REMOTE_CONFIG_SNAPSHOT_KEY]);
  return snap.global.disableCloudSync === true;
}
