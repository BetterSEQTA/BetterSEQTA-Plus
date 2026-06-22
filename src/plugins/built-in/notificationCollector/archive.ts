import { getUserInfo } from "@/seqta/ui/AddBetterSEQTAElements";

export interface ArchivedNotification {
  notificationID: number;
  type: string;
  timestamp: string;
  title: string;
  subtitle: string;
  messageID?: number;
  assessmentID?: number;
  programmeID?: number;
  metaclassID?: number;
  subjectCode?: string;
  firstSavedAt: string;
  lastSeenAt: string;
}

export type ArchiveMap = Record<string, ArchivedNotification>;

export type ArchivesByUser = Record<string, ArchiveMap>;

type RawNotification = Record<string, unknown>;

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

function readString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export function normalizeArchivedNotification(
  raw: RawNotification,
  now = new Date().toISOString(),
): ArchivedNotification | null {
  const notificationID = Number(raw.notificationID);
  if (!notificationID || Number.isNaN(notificationID)) return null;

  const type = readString(raw.type) || "unknown";
  const timestamp = readString(raw.timestamp) || now;

  if (type === "message" && raw.message && typeof raw.message === "object") {
    const message = raw.message as Record<string, unknown>;
    return {
      notificationID,
      type,
      timestamp,
      title: readString(message.title) || "Message",
      subtitle: readString(message.subtitle),
      messageID: Number(message.messageID) || undefined,
      firstSavedAt: now,
      lastSeenAt: now,
    };
  }

  if (
    type === "coneqtassessments" &&
    raw.coneqtAssessments &&
    typeof raw.coneqtAssessments === "object"
  ) {
    const assessment = raw.coneqtAssessments as Record<string, unknown>;
    return {
      notificationID,
      type,
      timestamp,
      title: readString(assessment.title) || "Assessment",
      subtitle: readString(assessment.subtitle) || readString(assessment.subjectCode),
      assessmentID: Number(assessment.assessmentID) || undefined,
      programmeID: Number(assessment.programmeID) || undefined,
      metaclassID: Number(assessment.metaclassID) || undefined,
      subjectCode: readString(assessment.subjectCode) || undefined,
      firstSavedAt: now,
      lastSeenAt: now,
    };
  }

  return {
    notificationID,
    type,
    timestamp,
    title: readString(raw.title) || "Notification",
    subtitle: readString(raw.subtitle),
    firstSavedAt: now,
    lastSeenAt: now,
  };
}

export function mergeNotificationsIntoArchive(
  existing: ArchiveMap,
  notifications: RawNotification[],
): ArchiveMap {
  const now = new Date().toISOString();
  const merged: ArchiveMap = { ...existing };

  for (const raw of notifications) {
    const normalized = normalizeArchivedNotification(raw, now);
    if (!normalized) continue;

    const key = String(normalized.notificationID);
    const prev = merged[key];
    if (prev) {
      merged[key] = {
        ...prev,
        ...normalized,
        firstSavedAt: prev.firstSavedAt,
        lastSeenAt: now,
      };
    } else {
      merged[key] = normalized;
    }
  }

  return merged;
}

export function listArchivedNotifications(archive: ArchiveMap): ArchivedNotification[] {
  return Object.values(archive).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
