import { CustomThemeApiError } from "./client";
import { RATE_LIMIT_DAILY_MESSAGE, RATE_LIMIT_PENDING_MESSAGE } from "./constants";

export function formatCustomThemeApiError(err: unknown): string {
  if (err instanceof CustomThemeApiError) {
    if (err.status === 429) {
      return err.message.includes("pending") ? RATE_LIMIT_PENDING_MESSAGE : RATE_LIMIT_DAILY_MESSAGE;
    }
    if (err.validationErrors.length > 0) {
      return err.validationErrors.join("\n");
    }
    return err.message;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}
