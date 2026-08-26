import { isSeqtaLoginPage } from "@/seqta/utils/isSeqtaEngage";
import { resolveSeqtaLoginRole } from "@/seqta/utils/seqtaLoginApi";

const SKIP_KEY = "bsplus-skip-ephemeral-logout";

function storageKey(host: string = location.hostname): string {
  return `bsplus-no-persist-session@${host}`;
}

export function markEphemeralSession(host: string = location.hostname): void {
  localStorage.setItem(storageKey(host), "1");
}

export function clearEphemeralSession(host: string = location.hostname): void {
  localStorage.removeItem(storageKey(host));
}

export function hasEphemeralSessionPending(
  host: string = location.hostname,
): boolean {
  return localStorage.getItem(storageKey(host)) === "1";
}

/** Skip auto-logout once after signing in without keep-me-logged-in. */
export function markSkipEphemeralLogoutOnNextLoad(): void {
  sessionStorage.setItem(SKIP_KEY, "1");
}

export function consumeSkipEphemeralLogout(): boolean {
  if (sessionStorage.getItem(SKIP_KEY) !== "1") return false;
  sessionStorage.removeItem(SKIP_KEY);
  return true;
}

export async function logoutSeqtaSession(
  fetchImpl: typeof fetch = fetch,
  origin: string = location.origin,
): Promise<void> {
  const role = resolveSeqtaLoginRole();
  await fetchImpl(`${origin}/seqta/${role}/logout`, {
    method: "POST",
    credentials: "include",
  });
}

/**
 * When the user signed in without keep-me-logged-in, log them out on the next
 * visit. The first authenticated load after login is skipped so reload succeeds.
 */
export async function enforceEphemeralSessionIfNeeded(
  fetchImpl: typeof fetch = fetch,
  reload: () => void = () => location.reload(),
): Promise<boolean> {
  if (isSeqtaLoginPage()) {
    clearEphemeralSession();
    return false;
  }

  if (!hasEphemeralSessionPending()) return false;
  if (consumeSkipEphemeralLogout()) return false;

  clearEphemeralSession();
  try {
    await logoutSeqtaSession(fetchImpl);
  } catch (error) {
    console.warn("[BetterSEQTA+] Ephemeral session logout failed:", error);
  }

  reload();
  return true;
}
