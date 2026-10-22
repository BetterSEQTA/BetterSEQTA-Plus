import type { TimetableSharePlainV1 } from "./relayPayload";
import { classRosterKey, classRefsFromTimetableItems } from "./classKeys";

export type RosterMember = {
  seqtaStudentId: number;
  personUuid?: string;
  cloudUserId?: string | null;
  updatedAt: number;
};

export type ClassRosterIndex = Record<string, Record<string, RosterMember>>;

export function emptyRosterIndex(): ClassRosterIndex {
  return {};
}

export function mergePayloadIntoRoster(
  index: ClassRosterIndex,
  payload: TimetableSharePlainV1,
  allowedSeqtaIds: ReadonlySet<number>,
): ClassRosterIndex {
  const senderId = payload.sender.seqtaId;
  if (!allowedSeqtaIds.has(senderId)) return index;

  let next: ClassRosterIndex = { ...index };
  const refs = classRefsFromTimetableItems(payload.classes);
  const updatedAt = Date.now();
  const member: RosterMember = {
    seqtaStudentId: senderId,
    personUuid: payload.sender.personUuid,
    cloudUserId: payload.sender.cloudUserId,
    updatedAt,
  };

  for (const ref of refs) {
    const key = classRosterKey(ref);
    if (!key) continue;
    const bucket = { ...(next[key] ?? {}) };
    bucket[String(senderId)] = member;
    next[key] = bucket;
  }
  return next;
}

export type ArchivedMembers = Record<string, { archivedAt: number }>;

export function removeMemberFromRoster(
  index: ClassRosterIndex,
  seqtaStudentId: number,
): ClassRosterIndex {
  const id = String(seqtaStudentId);
  const next: ClassRosterIndex = {};
  for (const [classKey, bucket] of Object.entries(index)) {
    if (!bucket[id]) {
      next[classKey] = bucket;
      continue;
    }
    const copy = { ...bucket };
    delete copy[id];
    if (Object.keys(copy).length > 0) next[classKey] = copy;
  }
  return next;
}

export function archiveMember(
  archived: ArchivedMembers,
  seqtaStudentId: number,
): ArchivedMembers {
  return {
    ...archived,
    [String(seqtaStudentId)]: { archivedAt: Date.now() },
  };
}

export function isMemberArchived(
  archived: ArchivedMembers,
  seqtaStudentId: number,
): boolean {
  return Boolean(archived[String(seqtaStudentId)]);
}

export function rosterPeersForClass(
  index: ClassRosterIndex,
  classKey: string,
  archived: ArchivedMembers = {},
): RosterMember[] {
  const bucket = index[classKey];
  if (!bucket) return [];
  return Object.values(bucket).filter(
    (m) => !isMemberArchived(archived, m.seqtaStudentId),
  );
}
