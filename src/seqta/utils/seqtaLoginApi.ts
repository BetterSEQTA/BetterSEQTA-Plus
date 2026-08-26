import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";

export type SeqtaLoginRole = "student" | "parent";

export type SeqtaLoginCredentials = {
  username: string;
  password: string;
};

export type SeqtaLoginResult =
  | { success: true; payload: unknown }
  | { success: false; error: string };

type ResolveSeqtaLoginRoleOptions = {
  isEngage?: boolean;
  pathname?: string;
  href?: string;
};

/** Infer student vs parent login endpoint from the current SEQTA shell. */
export function resolveSeqtaLoginRole(
  options: ResolveSeqtaLoginRoleOptions = {},
): SeqtaLoginRole {
  const isEngage = options.isEngage ?? isSeqtaEngageExperience();
  if (isEngage) return "parent";

  const path = options.pathname ?? "";
  const href = options.href ?? "";
  if (/\/parent\b/i.test(path) || /\/parent\b/i.test(href)) {
    return "parent";
  }
  return "student";
}

export function seqtaLoginEndpoint(role: SeqtaLoginRole): string {
  return `/seqta/${role}/login`;
}

export function buildSeqtaLoginBody(
  credentials: SeqtaLoginCredentials,
  redirectUrl: string = location.origin,
): Record<string, string | null> {
  return {
    mode: "normal",
    query: null,
    redirect_url: redirectUrl,
    username: credentials.username.trim(),
    password: credentials.password,
  };
}

/** Parse SEQTA login JSON — status `"200"` / `200` means authenticated. */
export function parseSeqtaLoginResponse(data: unknown): SeqtaLoginResult {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Unexpected response from server" };
  }

  const record = data as Record<string, unknown>;
  const status = record.status;
  if (status === "200" || status === 200) {
    return { success: true, payload: record.payload };
  }

  const payload = record.payload;
  if (payload && typeof payload === "object") {
    const payloadRecord = payload as Record<string, unknown>;
    for (const key of ["message", "error", "reason"]) {
      const value = payloadRecord[key];
      if (typeof value === "string" && value.trim()) {
        return { success: false, error: value.trim() };
      }
    }
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return { success: false, error: record.message.trim() };
  }

  return { success: false, error: "Invalid username or password" };
}

export async function submitSeqtaLogin(
  credentials: SeqtaLoginCredentials,
  options: {
    role?: SeqtaLoginRole;
    redirectUrl?: string;
    fetchImpl?: typeof fetch;
    origin?: string;
  } = {},
): Promise<SeqtaLoginResult> {
  const role = options.role ?? resolveSeqtaLoginRole();
  const endpoint = seqtaLoginEndpoint(role);
  const origin = options.origin ?? location.origin;
  const fetchImpl = options.fetchImpl ?? fetch;

  const response = await fetchImpl(`${origin}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    credentials: "include",
    body: JSON.stringify(
      buildSeqtaLoginBody(credentials, options.redirectUrl ?? origin),
    ),
  });

  if (!response.ok) {
    return {
      success: false,
      error: `Login failed (HTTP ${response.status})`,
    };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Unexpected response from server" };
  }

  return parseSeqtaLoginResponse(data);
}
