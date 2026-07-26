import browser from "webextension-polyfill";
import { getApiBase } from "@/seqta/utils/DevApiBase";
import { SettingsClicked } from "@/seqta/utils/Closers/closeExtensionPopup";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import {
  BSPLUS_PENDING_FEEDBACK_IDS_KEY,
  FEEDBACK_API_PATH,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  FEEDBACK_SCHEMA_VERSION,
  OPEN_FEEDBACK_SESSION_KEY,
  type FeedbackBrowser,
  type FeedbackCategory,
  type FeedbackChannel,
  type FeedbackProduct,
} from "./constants";
import { getOrCreateInstallId } from "./installId";

export class FeedbackApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "FeedbackApiError";
  }
}

export interface FeedbackStatusItem {
  id: string;
  status: string;
  category: string;
  subject: string | null;
  created_at: string;
  updated_at: string;
  has_response: boolean;
  response: string | null;
  responded_at: string | null;
}

export type FeedbackFormInput = {
  category: FeedbackCategory;
  subject: string;
  message: string;
  includeContact: boolean;
  contactName: string;
  contactEmail: string;
  includeInstance: boolean;
};

export function validateFeedbackForm(input: FeedbackFormInput): string | null {
  const message = input.message.trim();
  if (message.length < FEEDBACK_MESSAGE_MIN) {
    return `Please enter at least ${FEEDBACK_MESSAGE_MIN} characters.`;
  }
  if (message.length > FEEDBACK_MESSAGE_MAX) {
    return `Message must be at most ${FEEDBACK_MESSAGE_MAX} characters.`;
  }
  if (input.subject.trim().length > 120) return "Subject must be at most 120 characters.";
  if (input.includeContact) {
    if (!input.contactName.trim()) return "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail.trim())) {
      return "Please enter a valid email.";
    }
  }
  if (input.includeInstance) {
    const host = getInstanceHostname();
    if (!host) return "Instance hostname unavailable — open SEQTA first, or turn this off.";
  }
  return null;
}

export function getInstanceHostname(): string | null {
  try {
    const host = location.hostname?.toLowerCase();
    if (!host || host === "localhost") return null;
    return host.slice(0, 253);
  } catch {
    return null;
  }
}

function mapBrowser(ua: string): FeedbackBrowser {
  const n = ua.toLowerCase();
  if (n.includes("edg")) return "edge";
  if (n.includes("firefox")) return "firefox";
  if (n.includes("safari") && !n.includes("chrome")) return "safari";
  if (n.includes("chrome") || n.includes("chromium")) return "chrome";
  return "other";
}

function detectOs(): string {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown";
}

function channel(): FeedbackChannel {
  if (typeof __UPDATE_CHANNEL__ !== "undefined" && __UPDATE_CHANNEL__ === "nightly") {
    return "nightly";
  }
  if (typeof __UPDATE_CHANNEL__ !== "undefined" && __UPDATE_CHANNEL__ === "stable") {
    return "stable";
  }
  return "unknown";
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${getApiBase()}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  } catch {
    throw new FeedbackApiError("Could not reach the feedback server. Check your connection.", 0);
  }
}

async function throwApiError(res: Response): Promise<never> {
  let body: { error?: string; code?: string } = {};
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }
  if (res.status === 429) {
    throw new FeedbackApiError(
      "You've sent feedback too many times. Please try again later.",
      429,
      body.code ?? "RATE_LIMITED",
    );
  }
  throw new FeedbackApiError(body.error || `Request failed (${res.status}).`, res.status, body.code);
}

export async function submitFeedback(form: FeedbackFormInput): Promise<{ id: string }> {
  const err = validateFeedbackForm(form);
  if (err) throw new FeedbackApiError(err, 422);

  const installId = await getOrCreateInstallId();
  const host = getInstanceHostname();
  const product: FeedbackProduct = isSeqtaEngageExperience() ? "engage" : "learn";
  const version = browser.runtime.getManifest().version.slice(0, 32);
  const browserName = mapBrowser(navigator.userAgent);
  const browserVersion = navigator.userAgent.match(
    /(?:Edg|OPR|Firefox|Chrome|Version)\/([\d.]+)/,
  )?.[1];

  const payload = {
    schemaVersion: FEEDBACK_SCHEMA_VERSION,
    installId,
    category: form.category,
    subject: form.subject.trim() || undefined,
    message: form.message.trim(),
    extension: {
      version,
      browser: browserName,
      browserVersion,
      os: detectOs(),
      channel: channel(),
    },
    contact: form.includeContact
      ? {
          include: true as const,
          name: form.contactName.trim().slice(0, 80),
          email: form.contactEmail.trim().slice(0, 254),
        }
      : { include: false as const },
    instance:
      form.includeInstance && host
        ? { include: true as const, hostname: host, product }
        : { include: false as const },
    context: {
      page: "settings",
      locale: navigator.language,
      darkMode: !!settingsState.DarkMode,
    },
    clientSubmittedAt: new Date().toISOString(),
  };

  const res = await apiFetch(FEEDBACK_API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status !== 201 && res.status !== 200) await throwApiError(res);
  const data = (await res.json()) as { id?: string };
  if (!data?.id) throw new FeedbackApiError("Unexpected response from the feedback server.", res.status);
  return { id: data.id };
}

export async function fetchFeedbackStatusList(limit = 10): Promise<FeedbackStatusItem[]> {
  const installId = await getOrCreateInstallId();
  const url = `${FEEDBACK_API_PATH}/status?installId=${encodeURIComponent(installId)}&limit=${Math.min(20, Math.max(1, limit))}`;
  const res = await apiFetch(url);
  if (!res.ok) await throwApiError(res);
  const data = (await res.json()) as { items?: FeedbackStatusItem[] };
  return Array.isArray(data.items) ? data.items : [];
}

export async function fetchFeedbackStatusItem(id: string): Promise<FeedbackStatusItem> {
  const installId = await getOrCreateInstallId();
  const url = `${FEEDBACK_API_PATH}/status?installId=${encodeURIComponent(installId)}&id=${encodeURIComponent(id)}`;
  const res = await apiFetch(url);
  if (!res.ok) await throwApiError(res);
  return (await res.json()) as FeedbackStatusItem;
}

export function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    received: "Received",
    triaged: "Triaged",
    in_progress: "In progress",
    resolved: "Resolved",
    wontfix: "Won't fix",
    spam: "Closed",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function categoryLabel(category: FeedbackCategory | string): string {
  const labels: Record<string, string> = {
    bug: "Bug report",
    feature: "Feature request",
    question: "Question",
    other: "Other",
  };
  return labels[category] ?? category;
}

export function hasReply(item: FeedbackStatusItem): boolean {
  return !!item.has_response && !!item.response?.trim();
}

async function getPendingIds(): Promise<string[]> {
  const stored = await browser.storage.local.get(BSPLUS_PENDING_FEEDBACK_IDS_KEY);
  const raw = stored[BSPLUS_PENDING_FEEDBACK_IDS_KEY];
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is string => typeof id === "string" && id.startsWith("fb_")))];
}

export async function addPendingFeedbackId(id: string): Promise<void> {
  if (!id.startsWith("fb_")) return;
  const ids = await getPendingIds();
  if (ids.includes(id)) return;
  await browser.storage.local.set({ [BSPLUS_PENDING_FEEDBACK_IDS_KEY]: [...ids, id] });
}

export async function removePendingFeedbackIds(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const drop = new Set(ids);
  const next = (await getPendingIds()).filter((id) => !drop.has(id));
  await browser.storage.local.set({ [BSPLUS_PENDING_FEEDBACK_IDS_KEY]: next });
}

export async function findPendingFeedbackWithReplies(): Promise<FeedbackStatusItem[]> {
  const pending = await getPendingIds();
  if (!pending.length) return [];
  const set = new Set(pending);
  try {
    return (await fetchFeedbackStatusList(20)).filter((i) => set.has(i.id) && hasReply(i));
  } catch {
    return [];
  }
}

export function requestOpenFeedbackInSettings(feedbackId: string): void {
  try {
    sessionStorage.setItem(OPEN_FEEDBACK_SESSION_KEY, feedbackId);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("bsplus:open-feedback", { detail: { id: feedbackId } }));
}

export function consumeOpenFeedbackRequest(): string | null {
  try {
    const id = sessionStorage.getItem(OPEN_FEEDBACK_SESSION_KEY);
    if (id) sessionStorage.removeItem(OPEN_FEEDBACK_SESSION_KEY);
    return id;
  } catch {
    return null;
  }
}

export function openExtensionSettingsPopup(): void {
  if (SettingsClicked) return;
  document.getElementById("AddedSettings")?.click();
}
