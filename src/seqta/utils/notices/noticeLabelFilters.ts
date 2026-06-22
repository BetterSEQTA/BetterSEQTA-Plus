type PrefEntry = { name?: string; value?: unknown };

/** Parse `notices.filters` pref (space-separated label IDs). */
export function parseNoticesFilterPref(prefsPayload: unknown): string[] {
  if (!Array.isArray(prefsPayload)) return [];
  const values = (prefsPayload as PrefEntry[])
    .filter((item) => item?.name === "notices.filters")
    .map((item) => item?.value)
    .filter((v): v is string => typeof v === "string");
  if (values.length === 0) return [];
  return String(values[0]).split(" ").filter(Boolean);
}

/** Label IDs from `load/notices` with `{ mode: "labels" }`. */
export async function fetchNoticeLabelIds(noticesUrl: string): Promise<string[]> {
  try {
    const res = await fetch(noticesUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      credentials: "include",
      body: JSON.stringify({ mode: "labels" }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { payload?: Array<{ id?: number }> };
    const payload = json?.payload;
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
  if (fromPref.length > 0) return fromPref;
  return await fetchNoticeLabelIds(noticesUrl);
}

export function normalizeNoticeLabelId(label: unknown): string | null {
  if (typeof label === "number" && !Number.isNaN(label)) {
    return String(label);
  }
  if (typeof label === "string" && label.trim()) {
    return label.trim();
  }
  if (label && typeof label === "object") {
    const obj = label as Record<string, unknown>;
    if (typeof obj.id === "number" && !Number.isNaN(obj.id)) {
      return String(obj.id);
    }
    if (typeof obj.id === "string" && obj.id.trim()) {
      return obj.id.trim();
    }
  }
  return null;
}

export function noticeMatchesLabelFilter(
  notice: { label?: unknown },
  filterTokens: string[],
): boolean {
  if (filterTokens.length === 0) return true;
  const id = normalizeNoticeLabelId(notice?.label);
  if (id !== null && filterTokens.includes(id)) return true;
  return filterTokens.includes(JSON.stringify(notice?.label));
}
