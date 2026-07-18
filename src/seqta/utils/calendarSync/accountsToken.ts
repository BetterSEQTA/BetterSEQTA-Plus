export type AccountsTokenPayload = {
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

function extractTokens(json: Record<string, unknown>): AccountsTokenPayload {
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

function formatAccountsTokenError(
  res: Response,
  json: Record<string, unknown>,
  notReadyHint: string,
  includeErrorDescription: boolean,
): string {
  if (res.status === 404 || res.status === 501) return notReadyHint;
  const err = typeof json.error === "string" ? json.error : "";
  const desc =
    includeErrorDescription && typeof json.error_description === "string"
      ? json.error_description
      : "";
  return desc || err || `Accounts token API failed (${res.status})`;
}

export async function exchangeAccountsCode(
  tokenUrl: string,
  code: string,
  redirectUri: string,
  codeVerifier: string,
  notReadyHint: string,
  includeErrorDescription = false,
): Promise<AccountsTokenPayload> {
  const res = await fetch(tokenUrl, {
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
    throw new Error(formatAccountsTokenError(res, json, notReadyHint, includeErrorDescription));
  }
  return extractTokens(json);
}

export async function refreshAccountsToken(
  refreshUrl: string,
  refreshToken: string,
  notReadyHint: string,
  includeErrorDescription = false,
): Promise<AccountsTokenPayload> {
  const res = await fetch(refreshUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const json = await parseAccountsJson(res);
  if (!res.ok) {
    throw new Error(formatAccountsTokenError(res, json, notReadyHint, includeErrorDescription));
  }
  return extractTokens(json);
}
