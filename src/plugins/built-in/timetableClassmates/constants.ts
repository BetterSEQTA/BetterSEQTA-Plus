/** Fallback cap when host width is unknown. */
export const MAX_VISIBLE_CLASSMATE_AVATARS = 4;

const AVATAR_SLOT_PX = 22;
const OVERFLOW_CHIP_PX = 26;
const MAX_CLASSMATES_VISIBLE_CAP = 24;

/** Fit as many 20px avatars as the host width allows before "+N". */
export function maxClassmatesVisibleForWidth(widthPx: number): number {
  if (!Number.isFinite(widthPx) || widthPx <= 0) return MAX_VISIBLE_CLASSMATE_AVATARS;
  const fit = Math.floor((widthPx - OVERFLOW_CHIP_PX) / AVATAR_SLOT_PX);
  return Math.max(1, Math.min(fit, MAX_CLASSMATES_VISIBLE_CAP));
}

/** School-year rolling window (weeks ahead from current week). */
export const CLASSMATES_SCHOOL_YEAR_WEEKS = 52;

/** Re-sync with relay when enrollments unchanged but peers may have updated. */
export const CLASSMATES_PEER_REFRESH_MS = 8 * 60 * 60 * 1000;

/** While timetable is open, re-check enrollments on this interval. */
export const CLASSMATES_TIMETABLE_POLL_MS = 15 * 60 * 1000;

export const ACCOUNTS_BASE = "https://accounts.betterseqta.org";

export const TIMETABLE_CLASSMATES_CONSENT_VERSION = 3;
