type PrefEntry = { name?: string; value?: unknown };

const NOTICES_FILTER = "notices.filters";
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

/** Parse `notices.filters` pref (space-separated label IDs). */
export function parseNoticesFilterPref(prefsPayload: unknown): string[] {
  if (!Array.isArray(prefsPayload)) return [];
  const raw = (prefsPayload as PrefEntry[]).find((item) => item?.name === NOTICES_FILTER)?.value;
  return typeof raw === "string" ? raw.split(" ").filter(Boolean) : [];
}

/** Label IDs from `load/notices` with `{ mode: "labels" }`. */
export async function fetchNoticeLabelIds(noticesUrl: string): Promise<string[]> {
  try {
    const res = await fetch(noticesUrl, {
      method: "POST",
      headers: JSON_HEADERS,
      credentials: "include",
      body: JSON.stringify({ mode: "labels" }),
    });
    if (!res.ok) return [];
    const payload = ((await res.json()) as { payload?: Array<{ id?: number }> })?.payload;
    if (!Array.isArray(payload)) return [];
    return payload
      .map((entry) => entry?.id)
      .filter((id): id is number => typeof id === "number" && !Number.isNaN(id))
      .map(String);
  } catch {
    return [];
  }
}

/** Pref filters when set; otherwise all label IDs from the labels API (native SEQTA home). */
export async function resolveNoticeFilterTokens(
  prefsPayload: unknown,
  noticesUrl: string,
): Promise<string[]> {
  const fromPref = parseNoticesFilterPref(prefsPayload);
  return fromPref.length > 0 ? fromPref : await fetchNoticeLabelIds(noticesUrl);
}

export function normalizeNoticeLabelId(label: unknown): string | null {
  if (typeof label === "number" && !Number.isNaN(label)) return String(label);
  if (typeof label === "string" && label.trim()) return label.trim();
  const id =
    label && typeof label === "object" ? (label as { id?: unknown }).id : undefined;
  if (typeof id === "number" && !Number.isNaN(id)) return String(id);
  if (typeof id === "string" && id.trim()) return id.trim();
  return null;
}

export function noticeMatchesLabelFilter(
  notice: { label?: unknown },
  filterTokens: string[],
): boolean {
  if (filterTokens.length === 0) return true;
  const id = normalizeNoticeLabelId(notice?.label);
  return (id !== null && filterTokens.includes(id)) ||
    filterTokens.includes(JSON.stringify(notice?.label));
}
