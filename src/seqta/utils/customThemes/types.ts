import type { Theme } from "@/interface/types/Theme";
import type { CustomThemeStatus } from "./constants";

export type CustomThemeApiError = {
  code?: string;
  message?: string;
  details?: { errors?: string[]; warnings?: string[] };
};

export type CustomThemeApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: CustomThemeApiError | string | null;
  meta?: { timestamp?: number; version?: string };
};

export type CustomThemeOwner = Theme & {
  slug?: string;
  status?: CustomThemeStatus;
  theme_type?: "betterseqta" | "desqta";
  submission_notes?: string | null;
  rejection_reason?: string | null;
  reviewed_at?: number | null;
  published_at?: number | null;
};

export type CustomThemeFile = {
  id: string;
  file_path: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  created_at: number;
};

export type CustomThemeUploadFilePart = {
  fieldName: string;
  filename: string;
  mimeType: string;
  /** Base64-encoded file bytes */
  dataBase64: string;
};

export type CustomThemeUploadPayload = {
  themeZip?: CustomThemeUploadFilePart;
  looseFiles?: CustomThemeUploadFilePart[];
  submissionNotes?: string;
};

export type CustomThemeListResponse = {
  themes: CustomThemeOwner[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export type CustomThemeDetailResponse = {
  theme: CustomThemeOwner;
  files: CustomThemeFile[];
};

export type CustomThemeSubmitResponse = {
  theme: CustomThemeOwner;
  validation?: { valid: boolean; warnings: string[]; errors: string[] };
};
