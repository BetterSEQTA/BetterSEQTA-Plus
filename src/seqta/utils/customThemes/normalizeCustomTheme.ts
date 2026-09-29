import type { CustomThemeOwner } from "./types";

function pickString(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "";
}

function pickOptionalString(row: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string") return v;
  }
  return undefined;
}

function pickNumber(row: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}

/** Normalize a custom-themes API row into a store-compatible Theme shape. */
export function normalizeCustomTheme(row: Record<string, unknown>): CustomThemeOwner {
  const id = pickString(row, "id");
  const coverImage =
    pickString(row, "coverImage", "cover_image") ||
    (id ? `https://betterseqta.org/api/images/custom-themes/${id}/images/banner.webp` : "");
  const marqueeImage = pickOptionalString(row, "marqueeImage", "marquee_image");

  const tagsRaw = row.tags;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.filter((t): t is string => typeof t === "string")
    : undefined;

  const statusRaw = row.status;
  const status =
    statusRaw === "pending" || statusRaw === "approved" || statusRaw === "rejected"
      ? statusRaw
      : undefined;

  const themeTypeRaw = row.theme_type ?? row.themeType;
  const theme_type =
    themeTypeRaw === "betterseqta" || themeTypeRaw === "desqta" ? themeTypeRaw : undefined;

  return {
    id,
    name: pickString(row, "name") || "Untitled theme",
    description: pickString(row, "description"),
    coverImage,
    marqueeImage,
    theme_json_url: pickOptionalString(row, "theme_json_url", "themeJsonUrl"),
    author: pickOptionalString(row, "author"),
    download_count: pickNumber(row, "download_count", "downloadCount") ?? 0,
    tags,
    created_at: pickNumber(row, "created_at", "createdAt"),
    updated_at: pickNumber(row, "updated_at", "updatedAt"),
    published_at: pickNumber(row, "published_at", "publishedAt"),
    slug: pickOptionalString(row, "slug"),
    status,
    theme_type,
    submission_notes:
      typeof row.submission_notes === "string"
        ? row.submission_notes
        : typeof row.submissionNotes === "string"
          ? row.submissionNotes
          : null,
    rejection_reason:
      typeof row.rejection_reason === "string"
        ? row.rejection_reason
        : typeof row.rejectionReason === "string"
          ? row.rejectionReason
          : null,
    reviewed_at: pickNumber(row, "reviewed_at", "reviewedAt") ?? null,
  };
}
