import type { CustomThemeApiEnvelope, CustomThemeApiError } from "./types";

export function parseApiError(error: CustomThemeApiEnvelope<unknown>["error"]): string {
  if (!error) return "Request failed";
  if (typeof error === "string") return error;
  if (typeof error.message === "string" && error.message.length > 0) return error.message;
  if (typeof error.code === "string") return error.code;
  return "Request failed";
}

export function parseValidationErrors(error: CustomThemeApiError | null | undefined): string[] {
  if (!error?.details?.errors || !Array.isArray(error.details.errors)) return [];
  return error.details.errors.filter((e): e is string => typeof e === "string");
}

export function parseValidationWarnings(
  validation: { warnings?: unknown[] } | undefined,
): string[] {
  if (!validation?.warnings || !Array.isArray(validation.warnings)) return [];
  return validation.warnings.filter((w): w is string => typeof w === "string");
}
