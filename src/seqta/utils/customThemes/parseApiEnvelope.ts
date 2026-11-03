import type { CustomThemeApiEnvelope, CustomThemeApiError } from "./types";

export function parseApiError(
  error: CustomThemeApiEnvelope<unknown>["error"],
  httpStatus?: number,
  envelope?: Record<string, unknown>,
): string {
  if (typeof error === "string" && error.length > 0) return error;
  if (error && typeof error === "object") {
    const err = error as CustomThemeApiError;
    if (err.message) return err.message;
    if (err.code) return err.code;
  }
  if (envelope?.message && typeof envelope.message === "string") return envelope.message;
  if (httpStatus && httpStatus > 0) return `Request failed (HTTP ${httpStatus})`;
  return "Request failed";
}

export function parseValidationErrors(error: CustomThemeApiError | null | undefined): string[] {
  if (!error?.details?.errors || !Array.isArray(error.details.errors)) return [];
  return error.details.errors.filter((e): e is string => typeof e === "string");
}

export function formatEnvelopeErrorMessage(
  envelope: CustomThemeApiEnvelope<unknown> & { httpStatus?: number },
): string {
  const status = envelope.httpStatus ?? 0;
  const envRecord = envelope as Record<string, unknown>;
  const errObj =
    envelope.error && typeof envelope.error === "object"
      ? (envelope.error as CustomThemeApiError)
      : undefined;
  const base = parseApiError(envelope.error, status, envRecord);
  const validationErrors = parseValidationErrors(errObj);
  const code = errObj?.code ?? (typeof envRecord.code === "string" ? envRecord.code : undefined);
  const parts = [base];
  if (code && !base.includes(code)) parts.push(`[${code}]`);
  if (status > 0 && !base.includes(`HTTP ${status}`)) parts.push(`(HTTP ${status})`);
  if (validationErrors.length) parts.push(validationErrors.join("\n"));
  return parts.join(" ").trim() || `Request failed (HTTP ${status || "unknown"})`;
}

/** Normalize fetch JSON into the custom-themes API envelope (incl. Laravel validation bodies). */
export function normalizeCustomThemeApiResponse(
  body: unknown,
  httpStatus: number,
  rawText?: string,
): Record<string, unknown> {
  if (!body || typeof body !== "object") {
    const snippet = rawText?.trim().slice(0, 280);
    return {
      success: false,
      data: null,
      error: {
        message: snippet
          ? `Unexpected response (HTTP ${httpStatus}): ${snippet}`
          : `Unexpected response (HTTP ${httpStatus})`,
      },
      httpStatus,
    };
  }

  const record = body as Record<string, unknown>;
  if (record.success === true) return { ...record, httpStatus };

  let error = record.error;
  if (!error) {
    const flat =
      record.errors && typeof record.errors === "object"
        ? flattenValidationMap(record.errors as Record<string, unknown>)
        : [];
    const topMessage = typeof record.message === "string" ? record.message : "";
    if (flat.length > 0) {
      error = { message: flat.join("; "), details: { errors: flat } };
    } else if (topMessage) {
      error = { message: topMessage };
    }
  }
  if (!error) error = { message: `Request failed (HTTP ${httpStatus})` };

  return { success: false, data: record.data ?? null, error, httpStatus, meta: record.meta };
}

function flattenValidationMap(errors: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const [field, value] of Object.entries(errors)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.length > 0) out.push(`${field}: ${item}`);
      }
    } else if (typeof value === "string" && value.length > 0) {
      out.push(`${field}: ${value}`);
    }
  }
  return out;
}
