import {
  OUTLOOK_CALENDAR_ACCOUNTS_NOT_READY_HINT,
  OUTLOOK_CALENDAR_REFRESH_URL,
  OUTLOOK_CALENDAR_TOKEN_URL,
} from "@/config/outlookCalendar";

type OutlookTokenPayload = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

async function parseAccountsJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function extractTokens(json: Record<string, unknown>): OutlookTokenPayload {
  const access_token = json.access_token;
  if (typeof access_token !== "string" || !access_token) {
    throw new Error("Token response missing access_token");
  }
  return {
    access_token,
    refresh_token: typeof json.refresh_token === "string" ? json.refresh_token : undefined,
    expires_in: typeof json.expires_in === "number" ? json.expires_in : undefined,
  };
}

function formatAccountsTokenError(res: Response, json: Record<string, unknown>): string {
  if (res.status === 404 || res.status === 501) {
    return OUTLOOK_CALENDAR_ACCOUNTS_NOT_READY_HINT;
  }
  const err = typeof json.error === "string" ? json.error : "";
  const desc = typeof json.error_description === "string" ? json.error_description : "";
  return desc || err || `Accounts token API failed (${res.status})`;
}

export async function exchangeOutlookCodeViaAccounts(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<OutlookTokenPayload> {
  const res = await fetch(OUTLOOK_CALENDAR_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });
  const json = await parseAccountsJson(res);
  if (!res.ok) {
    throw new Error(formatAccountsTokenError(res, json));
  }
  return extractTokens(json);
}

export async function refreshOutlookTokenViaAccounts(
  refreshToken: string,
): Promise<OutlookTokenPayload> {
  const res = await fetch(OUTLOOK_CALENDAR_REFRESH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const json = await parseAccountsJson(res);
  if (!res.ok) {
    throw new Error(formatAccountsTokenError(res, json));
  }
  return extractTokens(json);
}
