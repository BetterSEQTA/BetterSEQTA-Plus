import type {
  RemoteConfigSnapshot,
  RemoteFeatureGate,
  RemoteGlobalConfig,
  RemoteThemeDirective,
} from "./types";

export const DEFAULT_REMOTE_CONFIG: RemoteConfigSnapshot = {
  configVersion: "0",
  source: "default",
  global: { mode: "on", allowLocalOverride: true },
  features: {},
  campaigns: [],
  remoteTheme: null,
};

function normalizeGlobal(raw: unknown): RemoteGlobalConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_REMOTE_CONFIG.global;
  const g = raw as Record<string, unknown>;
  return {
    mode: g.mode === "off" ? "off" : "on",
    allowLocalOverride: g.allowLocalOverride !== false,
    statusMessage: typeof g.statusMessage === "string" ? g.statusMessage : null,
    maintenance:
      g.maintenance && typeof g.maintenance === "object"
        ? (g.maintenance as RemoteGlobalConfig["maintenance"])
        : null,
    minExtensionVersion:
      typeof g.minExtensionVersion === "string" ? g.minExtensionVersion : null,
    forceUpdateUrl: typeof g.forceUpdateUrl === "string" ? g.forceUpdateUrl : null,
    disableCloudSync: g.disableCloudSync === true,
    disableThemeStore: g.disableThemeStore === true,
    disableFeedbackSubmit: g.disableFeedbackSubmit === true,
    hostnamePolicy:
      g.hostnamePolicy && typeof g.hostnamePolicy === "object"
        ? {
            mode:
              (g.hostnamePolicy as { mode?: string }).mode === "allowlist" ||
              (g.hostnamePolicy as { mode?: string }).mode === "denylist"
                ? ((g.hostnamePolicy as { mode: "allowlist" | "denylist" }).mode)
                : undefined,
            suffixes: Array.isArray((g.hostnamePolicy as { suffixes?: unknown }).suffixes)
              ? ((g.hostnamePolicy as { suffixes: string[] }).suffixes.filter(
                  (s) => typeof s === "string",
                ))
              : undefined,
          }
        : null,
  };
}

function normalizeFeatures(raw: unknown): Record<string, RemoteFeatureGate> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, RemoteFeatureGate> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    const mode = v.mode;
    if (
      mode !== "allow" &&
      mode !== "hide" &&
      mode !== "banner" &&
      mode !== "block" &&
      mode !== "greyout" &&
      mode !== "temp_hide"
    ) {
      continue;
    }
    const msg = v.message;
    out[key] = {
      mode,
      message:
        msg && typeof msg === "object" && typeof (msg as { body?: string }).body === "string"
          ? {
              title: typeof (msg as { title?: string }).title === "string"
                ? (msg as { title: string }).title
                : undefined,
              body: (msg as { body: string }).body,
              severity:
                (msg as { severity?: string }).severity === "warning" ||
                (msg as { severity?: string }).severity === "error" ||
                (msg as { severity?: string }).severity === "info"
                  ? ((msg as { severity: "info" | "warning" | "error" }).severity)
                  : undefined,
            }
          : undefined,
    };
  }
  return out;
}

function normalizeRemoteTheme(raw: unknown): RemoteThemeDirective | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const mode = r.mode;
  if (mode !== "off" && mode !== "optional" && mode !== "forced") return null;
  const packageId = typeof r.packageId === "string" ? r.packageId.trim() : "";
  const packageVersion =
    typeof r.packageVersion === "string" ? r.packageVersion.trim() : "";
  if (!packageId || !packageVersion) return null;
  if (mode === "off") return null;
  const msg = r.message;
  return {
    packageId,
    packageVersion,
    mode,
    activeFrom: typeof r.activeFrom === "string" ? r.activeFrom : undefined,
    activeTo: typeof r.activeTo === "string" ? r.activeTo : undefined,
    allowUserOptOut: r.allowUserOptOut !== false,
    message:
      msg && typeof msg === "object"
        ? {
            title: typeof (msg as { title?: string }).title === "string"
              ? (msg as { title: string }).title
              : undefined,
            body: typeof (msg as { body?: string }).body === "string"
              ? (msg as { body: string }).body
              : undefined,
          }
        : undefined,
  };
}

export function normalizeRemoteConfigSnapshot(raw: unknown): RemoteConfigSnapshot {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_REMOTE_CONFIG };
  const r = raw as Record<string, unknown>;
  const data =
    r.data && typeof r.data === "object" ? (r.data as Record<string, unknown>) : r;
  return {
    configVersion:
      typeof data.configVersion === "string" ? data.configVersion : "0",
    etag: typeof data.etag === "string" ? data.etag : undefined,
    source:
      data.source === "api" ||
      data.source === "github" ||
      data.source === "cache" ||
      data.source === "default"
        ? data.source
        : "cache",
    global: normalizeGlobal(data.global),
    features: normalizeFeatures(data.features),
    campaigns: Array.isArray(data.campaigns) ? (data.campaigns as RemoteConfigSnapshot["campaigns"]) : [],
    remoteTheme: normalizeRemoteTheme(data.remoteTheme),
  };
}

/** Merge GitHub manifest + partial files into one snapshot. */
export function mergeGithubConfigFiles(
  manifest: Record<string, unknown>,
  files: Record<string, unknown>,
): RemoteConfigSnapshot {
  return normalizeRemoteConfigSnapshot({
    configVersion: manifest.configVersion ?? manifest.updatedAt ?? "0",
    source: "github",
    global: files.global ?? {},
    features: files.features ?? {},
    campaigns: files.campaigns ?? [],
    remoteTheme: files.remoteTheme ?? null,
  });
}
