export type FeatureMode =
  | "allow"
  | "hide"
  | "banner"
  | "block"
  | "greyout"
  | "temp_hide";

export type RemoteFeatureGate = {
  mode?: FeatureMode;
  message?: { title?: string; body?: string; severity?: "info" | "warning" | "error" };
};

export type RemoteGlobalConfig = {
  mode?: "on" | "off";
  allowLocalOverride?: boolean;
  statusMessage?: string | null;
  maintenance?: { title?: string; body?: string } | null;
  minExtensionVersion?: string | null;
  forceUpdateUrl?: string | null;
  disableCloudSync?: boolean;
  disableThemeStore?: boolean;
  disableFeedbackSubmit?: boolean;
  hostnamePolicy?: {
    mode?: "allowlist" | "denylist";
    suffixes?: string[];
  } | null;
};

export type RemoteCampaignButton = {
  id: string;
  label: string;
  action: "dismiss" | "url" | "openSettingsSection";
  url?: string;
  section?: string;
};

export type RemoteCampaign = {
  id: string;
  priority?: number;
  activeFrom?: string;
  activeTo?: string;
  header?: { title?: string; subtitle?: string };
  hero?: { type?: "image" | "video"; url?: string; alt?: string };
  bodyHtml?: string;
  buttons?: RemoteCampaignButton[];
  requireAcknowledge?: boolean;
  minVersion?: string;
  maxVersion?: string;
};

export type RemoteConfigSnapshot = {
  configVersion: string;
  etag?: string;
  source?: "api" | "github" | "default" | "cache";
  global: RemoteGlobalConfig;
  features: Record<string, RemoteFeatureGate>;
  campaigns: RemoteCampaign[];
};

export type CampaignSeenRecord = Record<
  string,
  { seenAt: string; ack?: boolean }
>;
