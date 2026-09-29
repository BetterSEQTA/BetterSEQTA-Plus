import browser from "webextension-polyfill";
import type { CustomThemeStatus } from "./constants";
import { formatThemeDate } from "./formatThemeDate";
import { normalizeCustomTheme } from "./normalizeCustomTheme";
import { formatEnvelopeErrorMessage, parseValidationErrors } from "./parseApiEnvelope";
import type {
  CustomThemeApiEnvelope,
  CustomThemeDetailResponse,
  CustomThemeListResponse,
  CustomThemeOwner,
  CustomThemeSubmitResponse,
  CustomThemeUploadPayload,
} from "./types";

export class CustomThemeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly validationErrors: string[] = [],
  ) {
    super(message);
    this.name = "CustomThemeApiError";
  }
}

const FETCH_TIMEOUT_MS = 25_000;
const EXTENSION_RELOAD_HINT =
  "Extension reloaded — refresh the SEQTA tab and reopen settings after `pnpm dev` updates, then try again.";

async function sendRuntimeMessage<T>(message: object): Promise<T> {
  try {
    if (!browser.runtime?.id) throw new Error(EXTENSION_RELOAD_HINT);
    return (await browser.runtime.sendMessage(message)) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/disconnected port|context invalidated|receiving end does not exist|message port closed/i.test(msg)) {
      throw new Error(EXTENSION_RELOAD_HINT);
    }
    throw err;
  }
}

function sendMessageWithTimeout<T>(message: object): Promise<T> {
  return Promise.race([
    sendRuntimeMessage<T>(message),
    new Promise<T>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              "Community themes request timed out — reload the SEQTA page after updating the extension.",
            ),
          ),
        FETCH_TIMEOUT_MS,
      );
    }),
  ]);
}

function throwFromEnvelope<T>(
  envelope: CustomThemeApiEnvelope<T> & { httpStatus?: number },
): never {
  const errObj =
    envelope.error && typeof envelope.error === "object" ? envelope.error : undefined;
  throw new CustomThemeApiError(
    formatEnvelopeErrorMessage(envelope),
    envelope.httpStatus ?? 0,
    errObj?.code,
    parseValidationErrors(errObj),
  );
}

export function formatCustomThemeStatus(status: CustomThemeStatus | string | undefined): string {
  const labels: Record<string, string> = {
    pending: "Pending review",
    approved: "Approved",
    rejected: "Rejected",
  };
  return labels[status ?? ""] ?? (status ? String(status) : "Unknown");
}

export function statusBadgeClass(status: CustomThemeStatus | string | undefined): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100";
    case "approved":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100";
    case "rejected":
      return "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100";
    default:
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  }
}

export { formatThemeDate };

export async function fetchCommunityThemes(options?: {
  page?: number;
  limit?: number;
  sort?: "popular" | "newest" | "name";
  search?: string;
}): Promise<CustomThemeListResponse> {
  const res = await sendMessageWithTimeout<
    CustomThemeApiEnvelope<{ themes?: unknown[]; pagination?: CustomThemeListResponse["pagination"] }>
  >({
    type: "fetchCustomThemes",
    page: options?.page ?? 1,
    limit: options?.limit ?? 20,
    sort: options?.sort ?? "popular",
    search: options?.search,
  });
  if (!res.success || !res.data?.themes) throwFromEnvelope(res);
  return {
    themes: res.data.themes
      .map((row) => normalizeCustomTheme(row as Record<string, unknown>))
      .filter((t) => t.id.length > 0),
    pagination: res.data.pagination,
  };
}

export async function fetchMyCustomThemes(options?: {
  page?: number;
  limit?: number;
  status?: CustomThemeStatus;
}): Promise<CustomThemeListResponse> {
  const res = await sendMessageWithTimeout<
    CustomThemeApiEnvelope<{ themes?: unknown[]; pagination?: CustomThemeListResponse["pagination"] }>
  >({
    type: "fetchMyCustomThemes",
    page: options?.page ?? 1,
    limit: options?.limit ?? 20,
    status: options?.status,
  });
  if (!res.success || !res.data?.themes) throwFromEnvelope(res);
  return {
    themes: res.data.themes
      .map((row) => normalizeCustomTheme(row as Record<string, unknown>))
      .filter((t) => t.id.length > 0),
    pagination: res.data.pagination,
  };
}

export async function fetchMyCustomThemeDetail(id: string): Promise<CustomThemeDetailResponse> {
  const res = await sendMessageWithTimeout<CustomThemeApiEnvelope<CustomThemeDetailResponse>>({
    type: "fetchMyCustomThemeDetail",
    themeId: id,
  });
  if (!res.success || !res.data?.theme) throwFromEnvelope(res);
  return {
    theme: normalizeCustomTheme(res.data.theme as unknown as Record<string, unknown>),
    files: Array.isArray(res.data.files) ? res.data.files : [],
  };
}

export async function submitCustomTheme(
  payload: CustomThemeUploadPayload,
): Promise<CustomThemeSubmitResponse> {
  const res = await sendMessageWithTimeout<
    CustomThemeApiEnvelope<CustomThemeSubmitResponse> & { httpStatus?: number }
  >({
    type: "submitCustomTheme",
    payload,
  });
  if (!res || typeof res !== "object" || !res.success || !res.data?.theme) {
    throwFromEnvelope(
      res && typeof res === "object"
        ? res
        : {
            success: false,
            data: null,
            error: "Empty response from extension background",
            httpStatus: 0,
          },
    );
  }
  return {
    theme: normalizeCustomTheme(res.data.theme as unknown as Record<string, unknown>),
    validation: res.data.validation,
  };
}

export async function replaceCustomThemeFiles(
  id: string,
  payload: CustomThemeUploadPayload,
): Promise<CustomThemeSubmitResponse> {
  const res = await sendMessageWithTimeout<CustomThemeApiEnvelope<CustomThemeSubmitResponse>>({
    type: "replaceCustomThemeFiles",
    themeId: id,
    payload,
  });
  if (!res.success || !res.data?.theme) throwFromEnvelope(res);
  return {
    theme: normalizeCustomTheme(res.data.theme as unknown as Record<string, unknown>),
    validation: res.data.validation,
  };
}

export async function updateCustomThemeMetadata(
  id: string,
  body: { name?: string; description?: string; submission_notes?: string },
): Promise<CustomThemeOwner> {
  const res = await sendMessageWithTimeout<CustomThemeApiEnvelope<{ theme?: unknown }>>({
    type: "updateCustomThemeMetadata",
    themeId: id,
    body,
  });
  if (!res.success || !res.data?.theme) throwFromEnvelope(res);
  return normalizeCustomTheme(res.data.theme as Record<string, unknown>);
}

export async function deleteCustomTheme(id: string): Promise<void> {
  const res = await sendMessageWithTimeout<CustomThemeApiEnvelope<{ id?: string }>>({
    type: "deleteCustomTheme",
    themeId: id,
  });
  if (!res.success) throwFromEnvelope(res);
}

export function canEditCustomTheme(theme: CustomThemeOwner): boolean {
  return theme.status === "pending" || theme.status === "rejected";
}
