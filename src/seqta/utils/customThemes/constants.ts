export const CUSTOM_THEMES_BASE = "/api/custom-themes";

export const CUSTOM_THEME_STATUSES = ["pending", "approved", "rejected"] as const;
export type CustomThemeStatus = (typeof CUSTOM_THEME_STATUSES)[number];

export const PENDING_SUBMISSION_LIMIT = 5;
export const UPLOADS_PER_24H_LIMIT = 10;

export const RATE_LIMIT_PENDING_MESSAGE =
  "You can have at most 5 themes awaiting review. Wait for approval, rejection, or delete a pending submission.";
export const RATE_LIMIT_DAILY_MESSAGE =
  "You can submit at most 10 new themes per 24 hours. Try again later.";
