import { getUserInfo } from "@/seqta/ui/AddBetterSEQTAElements";

type RawNotification = Record<string, unknown>;

export interface ArchivedNotification {
  notificationID: number;
  firstSavedAt: string;
  lastSeenAt: string;
  raw: RawNotification;
}

export type ArchiveMap = Record<string, ArchivedNotification>;
export type ArchivesByUser = Record<string, ArchiveMap>;

export async function resolveNotificationUserKey(): Promise<string | null> {
  try {
    const info = await getUserInfo();
    const id = info?.id ?? info?.personUUID ?? info?.username;
    if (id == null || id === "") return null;
    const label =
      info?.displayName ?? info?.name ?? info?.username ?? String(id);
    return `${location.hostname}:${id}:${String(label).slice(0, 64)}`;
  } catch {
    return null;
  }
}

export async function fetchAllNotifications(): Promise<RawNotification[]> {
  const res = await fetch(`${location.origin}/seqta/student/heartbeat?`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    credentials: "include",
    body: JSON.stringify({
      timestamp: "1970-01-01 00:00:00.0",
      hash: "#?page=/notifications",
    }),
  });
  if (!res.ok) return [];

  const json = (await res.json()) as {
    notifications?: RawNotification[];
    payload?: { notifications?: RawNotification[] };
  };
  const list = json.notifications ?? json.payload?.notifications;
  return Array.isArray(list) ? list : [];
}

function archiveTimestamp(
  item: ArchivedNotification & { timestamp?: string },
): number {
  const ms = new Date(
    String(item.raw?.timestamp ?? item.timestamp ?? 0),
  ).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function mergeNotificationsIntoArchive(
  existing: ArchiveMap,
  notifications: RawNotification[],
): { archive: ArchiveMap; changed: boolean } {
  const now = new Date().toISOString();
  let changed = false;
  const archive = { ...existing };

  for (const raw of notifications) {
    const notificationID = Number(raw.notificationID);
    if (!notificationID || Number.isNaN(notificationID)) continue;

    const key = String(notificationID);
    const prev = archive[key];
    archive[key] = prev
      ? { ...prev, lastSeenAt: now, raw: { ...prev.raw, ...raw } }
      : { notificationID, firstSavedAt: now, lastSeenAt: now, raw: { ...raw } };
    changed = true;
  }

  return { archive, changed };
}

export function listArchivedNotifications(
  archive: ArchiveMap,
): ArchivedNotification[] {
  return Object.values(archive).sort(
    (a, b) => archiveTimestamp(b) - archiveTimestamp(a),
  );
}

export function archivedToApiNotification(
  item: ArchivedNotification,
): RawNotification {
  return { ...item.raw, notificationID: item.notificationID };
}
