export interface GoogleCalendarEventMapEntry {
  id: string;
  date: string;
}

export function normalizeEventMapEntry(
  value: string | GoogleCalendarEventMapEntry | undefined,
): GoogleCalendarEventMapEntry | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return { id: value, date: "" };
  if (typeof value.id === "string" && value.id.length > 0) {
    return { id: value.id, date: value.date ?? "" };
  }
  return undefined;
}

export function getStoredEventId(
  value: string | GoogleCalendarEventMapEntry | undefined,
): string | undefined {
  return normalizeEventMapEntry(value)?.id;
}

export function lessonDateFromSeqtaKey(seqtaKey: string): string | undefined {
  const parts = seqtaKey.split(":");
  for (const part of parts) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
  }
  return undefined;
}
