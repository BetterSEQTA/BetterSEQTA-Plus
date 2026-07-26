import browser from "webextension-polyfill";
import { BSPLUS_INSTALL_ID_KEY } from "./constants";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidInstallId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function generateInstallId(): string {
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function getOrCreateInstallId(): Promise<string> {
  const stored = await browser.storage.local.get(BSPLUS_INSTALL_ID_KEY);
  const existing = stored[BSPLUS_INSTALL_ID_KEY];
  if (isValidInstallId(existing)) return existing;
  const installId = generateInstallId();
  await browser.storage.local.set({ [BSPLUS_INSTALL_ID_KEY]: installId });
  return installId;
}
