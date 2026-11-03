import browser from "@/lib/browser";

export type RemoteStatus = {
  off: boolean;
  message: string | null;
  disabledFeatures: string[];
};

const STATUS_URL =
  "https://raw.githubusercontent.com/BetterSEQTA/BS-Status/main/config/status.json";
export const REMOTE_STATUS_KEY = "bsplus_remote_status";

export function normalizeRemoteStatus(raw: unknown): RemoteStatus {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    off: r.off === true,
    message: typeof r.message === "string" && r.message.trim() ? r.message : null,
    disabledFeatures: Array.isArray(r.disabledFeatures)
      ? r.disabledFeatures.filter((key): key is string => typeof key === "string")
      : [],
  };
}

export async function readRemoteStatus(): Promise<RemoteStatus> {
  const stored = await browser.storage.local.get(REMOTE_STATUS_KEY);
  return normalizeRemoteStatus(stored[REMOTE_STATUS_KEY]);
}

let status = normalizeRemoteStatus(null);

export const getRemoteStatus = (): RemoteStatus => status;

export const isFeatureDisabled = (key: string): boolean => status.disabledFeatures.includes(key);

export async function loadRemoteStatus(): Promise<void> {
  status = await readRemoteStatus();
}

export async function refreshRemoteStatus(): Promise<void> {
  const res = await browser.runtime
    .sendMessage({ type: "fetchFromUrl", url: STATUS_URL })
    .catch(() => null);
  if (!res?.data && res?.httpStatus !== 404) return;
  await browser.storage.local.set({ [REMOTE_STATUS_KEY]: normalizeRemoteStatus(res.data) });
}
