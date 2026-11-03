import browser from "@/lib/browser";

export type RemoteStatus = {
  off: boolean;
  message: string | null;
  disabledFeatures: string[];
  sites: Record<string, string[]>;
};

const STATUS_URL =
  "https://raw.githubusercontent.com/BetterSEQTA/BS-Status/main/config/status.json";
export const REMOTE_STATUS_KEY = "bsplus_remote_status";
const PAUSE_CHOICE_KEY = "bsplus_pause_choice";

type PauseChoice = { message: string; runAnyway: boolean };

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((key): key is string => typeof key === "string") : [];
}

export function normalizeRemoteStatus(raw: unknown): RemoteStatus {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const sites = r.sites && typeof r.sites === "object" ? r.sites : {};
  return {
    off: r.off === true,
    message: typeof r.message === "string" && r.message.trim() ? r.message : null,
    disabledFeatures: stringList(r.disabledFeatures),
    sites: Object.fromEntries(
      Object.entries(sites).map(([host, keys]) => [host.toLowerCase(), stringList(keys)]),
    ),
  };
}

export async function readRemoteStatus(): Promise<RemoteStatus> {
  const stored = await browser.storage.local.get(REMOTE_STATUS_KEY);
  return normalizeRemoteStatus(stored[REMOTE_STATUS_KEY]);
}

let status = normalizeRemoteStatus(null);
let pauseChoice: PauseChoice | null = null;

export const pauseMessage = (): string => status.message ?? "BetterSEQTA+ is paused for now.";

export const getRemoteStatus = (): RemoteStatus => status;

export const isFeatureDisabled = (key: string): boolean =>
  status.disabledFeatures.includes(key) ||
  !!status.sites[location.hostname.toLowerCase()]?.includes(key);

const currentPauseChoice = (): PauseChoice | null =>
  status.off && pauseChoice?.message === pauseMessage() ? pauseChoice : null;

export const isPaused = (): boolean => status.off && !currentPauseChoice()?.runAnyway;

export const hasSeenPause = (): boolean => currentPauseChoice() !== null;

export async function choosePause(runAnyway: boolean): Promise<void> {
  pauseChoice = { message: pauseMessage(), runAnyway };
  await browser.storage.local.set({ [PAUSE_CHOICE_KEY]: pauseChoice });
}

export async function loadRemoteStatus(): Promise<void> {
  status = await readRemoteStatus();
  const stored = await browser.storage.local.get(PAUSE_CHOICE_KEY);
  pauseChoice = (stored[PAUSE_CHOICE_KEY] as PauseChoice | undefined) ?? null;
}

export async function refreshRemoteStatus(): Promise<void> {
  const res = await browser.runtime
    .sendMessage({ type: "fetchFromUrl", url: STATUS_URL })
    .catch(() => null);
  if (!res?.data && res?.httpStatus !== 404) return;
  await browser.storage.local.set({ [REMOTE_STATUS_KEY]: normalizeRemoteStatus(res.data) });
}
