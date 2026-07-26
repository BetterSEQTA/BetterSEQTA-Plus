export const FEEDBACK_SCHEMA_VERSION = 1;
export const BSPLUS_INSTALL_ID_KEY = "bsplus_install_id";
export const BSPLUS_PENDING_FEEDBACK_IDS_KEY = "bsplus_pending_feedback_ids";
export const FEEDBACK_API_PATH = "/api/bsplus/feedback";
export const OPEN_FEEDBACK_SESSION_KEY = "bsplus_open_feedback_id";

export const FEEDBACK_CATEGORIES = ["bug", "feature", "question", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export type FeedbackBrowser = "chrome" | "firefox" | "safari" | "edge" | "other";
export type FeedbackChannel = "stable" | "dev" | "nightly" | "unknown";
export type FeedbackProduct = "learn" | "engage" | "unknown";

export const FEEDBACK_MESSAGE_MIN = 10;
export const FEEDBACK_MESSAGE_MAX = 4000;
