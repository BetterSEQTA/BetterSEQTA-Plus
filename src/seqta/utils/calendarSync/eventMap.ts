import browser from "webextension-polyfill";

export interface EventMapEntry {
  id: string;
  date: string;
}

export type EventMapRecord = Record<string, string | EventMapEntry>;

export function eventMapKey(origin: string, seqtaKey: string): string {
  return `${origin}::${seqtaKey}`;
}

export function normalizeEventMapEntry(
  value: string | EventMapEntry | undefined,
): EventMapEntry | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return { id: value, date: "" };
  if (typeof value.id === "string" && value.id.length > 0) {
    return { id: value.id, date: value.date ?? "" };
  }
  return undefined;
}

export function getStoredEventId(
  value: string | EventMapEntry | undefined,
): string | undefined {
  return normalizeEventMapEntry(value)?.id;
}

export function lessonDateFromSeqtaKey(seqtaKey: string): string | undefined {
  for (const part of seqtaKey.split(":")) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
  }
  return undefined;
}

export function createCalendarStateStorage<T extends object>(storageKey: string) {
  async function read(): Promise<T> {
    const got = await browser.storage.local.get(storageKey);
    const raw = got[storageKey];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {} as T;
    return raw as T;
  }

  async function write(patch: Partial<T>): Promise<T> {
    const current = await read();
    const next = { ...current, ...patch };
    await browser.storage.local.set({ [storageKey]: next });
    return next;
  }

  async function clear(): Promise<void> {
    await browser.storage.local.remove(storageKey);
  }

  return { read, write, clear };
}
