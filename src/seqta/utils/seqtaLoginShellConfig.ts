import {
  resolveSeqtaLoginRole,
  seqtaLoginEndpoint,
  type SeqtaLoginRole,
} from "@/seqta/utils/seqtaLoginApi";

export type SeqtaGoogleConfig = {
  client_id: string;
  scope?: string;
  cookiepolicy?: string;
};

export type SeqtaSamlConfig = {
  method: string;
  url: string;
  request: string;
  relaystate?: string;
  sigalg: string;
  signature: string;
  label?: string;
  autologin?: boolean;
};

export type SeqtaLoginShellConfig = {
  schoolName: string | null;
  message: string | null;
  logoUrl: string | null;
  backgroundUrl: string | null;
  google: SeqtaGoogleConfig | null;
  passwordResetEnabled: boolean;
  resetLink: string | null;
  saml: SeqtaSamlConfig[];
  basic: boolean;
  type: string | null;
};

export function seqtaBrandingUrl(
  fileId: string,
  role: SeqtaLoginRole = resolveSeqtaLoginRole(),
  origin: string = location.origin,
): string {
  const trimmed = fileId.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return trimmed.startsWith("/") ? `${origin}${trimmed}` : trimmed;
  }
  return `${origin}/seqta/${role}/branding?file=${encodeURIComponent(trimmed)}`;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function parseGoogleConfig(value: unknown): SeqtaGoogleConfig | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const clientId = readString(record, "client_id");
  if (!clientId) return null;
  return {
    client_id: clientId,
    scope: readString(record, "scope") ?? undefined,
    cookiepolicy: readString(record, "cookiepolicy") ?? undefined,
  };
}

function parseSamlConfig(value: unknown): SeqtaSamlConfig | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const method = readString(record, "method");
  const url = readString(record, "url");
  const request = readString(record, "request");
  const sigalg = readString(record, "sigalg");
  const signature = readString(record, "signature");
  if (!method || !url || !request || !sigalg || !signature) return null;

  return {
    method,
    url,
    request,
    sigalg,
    signature,
    relaystate: readString(record, "relaystate") ?? undefined,
    label: readString(record, "label") ?? undefined,
    autologin: record.autologin === true,
  };
}

/** Match SEQTA's rule for showing the forgot-password control. */
export function isPasswordResetAvailable(
  config: Pick<
    SeqtaLoginShellConfig,
    "passwordResetEnabled" | "resetLink" | "basic" | "type"
  >,
): boolean {
  if (config.resetLink) return true;
  return (
    config.basic &&
    config.passwordResetEnabled &&
    config.type !== "tutor"
  );
}

/** Parse the login probe payload returned before credentials are submitted. */
export function parseLoginShellConfig(
  payload: unknown,
  options: {
    role?: SeqtaLoginRole;
    origin?: string;
  } = {},
): SeqtaLoginShellConfig {
  const role = options.role ?? resolveSeqtaLoginRole();
  const origin = options.origin ?? location.origin;

  if (!payload || typeof payload !== "object") {
    return {
      schoolName: null,
      message: null,
      logoUrl: null,
      backgroundUrl: null,
      google: null,
      passwordResetEnabled: false,
      resetLink: null,
      saml: [],
      basic: false,
      type: null,
    };
  }

  const record = payload as Record<string, unknown>;
  const logoId = readString(record, "logo");
  const files = Array.isArray(record.files)
    ? record.files.filter((file): file is string => typeof file === "string")
    : [];
  const saml = Array.isArray(record.saml)
    ? record.saml
        .map(parseSamlConfig)
        .filter((entry): entry is SeqtaSamlConfig => entry !== null)
    : [];

  return {
    schoolName:
      readString(record, "site.name") ??
      readString(record, "siteName") ??
      null,
    message: readString(record, "message"),
    logoUrl: logoId ? seqtaBrandingUrl(logoId, role, origin) : null,
    backgroundUrl: files[0]
      ? seqtaBrandingUrl(files[0], role, origin)
      : null,
    google: parseGoogleConfig(record.google),
    passwordResetEnabled: record.reset === true,
    resetLink: readString(record, "reset_link"),
    saml,
    basic: record.basic === true,
    type: readString(record, "type"),
  };
}

export async function fetchLoginShellConfig(
  options: {
    role?: SeqtaLoginRole;
    origin?: string;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<SeqtaLoginShellConfig | null> {
  const role = options.role ?? resolveSeqtaLoginRole();
  const origin = options.origin ?? location.origin;
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(`${origin}${seqtaLoginEndpoint(role)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      credentials: "include",
      body: JSON.stringify({
        mode: "normal",
        query: null,
        redirect_url: origin,
      }),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { payload?: unknown };
    return parseLoginShellConfig(data.payload, { role, origin });
  } catch {
    return null;
  }
}
