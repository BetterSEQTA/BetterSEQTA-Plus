export type ClassRef = {
  metaID?: number;
  code?: string;
  programmeID?: number;
};

export function classRosterKey(ref: ClassRef): string | null {
  if (ref.metaID != null && Number.isFinite(ref.metaID)) {
    return `cr:v1:${ref.metaID}`;
  }
  const code = ref.code?.trim();
  if (code && ref.programmeID != null && Number.isFinite(ref.programmeID)) {
    return `cr:v1:${code}:${ref.programmeID}`;
  }
  if (code) return `cr:v1:code:${code}`;
  return null;
}

export function isSyncableClassLesson(item: {
  type?: string;
  metaID?: number;
  code?: string;
}): boolean {
  const type = item.type?.trim().toLowerCase();
  if (type && type !== "class") return false;
  return item.metaID != null || Boolean(item.code?.trim());
}

export function classRefsFromTimetableItems(
  items: Array<{
    type?: string;
    metaID?: number;
    code?: string;
    programmeID?: number;
  }>,
): ClassRef[] {
  const seen = new Set<string>();
  const out: ClassRef[] = [];
  for (const item of items) {
    if (!isSyncableClassLesson(item)) continue;
    const key = classRosterKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      metaID: item.metaID,
      code: item.code,
      programmeID: item.programmeID,
    });
  }
  return out;
}

export type AvatarListInput = {
  seqtaStudentId: number;
  cloudUserId?: string | null;
  updatedAt: number;
};

export type AvatarListResult = {
  visible: AvatarListInput[];
  overflow: number;
  allSorted: AvatarListInput[];
};

export function buildAvatarDisplayList(
  peers: AvatarListInput[],
  selfSeqtaId: number,
  maxVisible: number,
): AvatarListResult {
  const filtered = peers
    .filter((p) => p.seqtaStudentId !== selfSeqtaId)
    .sort((a, b) => {
      const aCloud = a.cloudUserId ? 1 : 0;
      const bCloud = b.cloudUserId ? 1 : 0;
      if (bCloud !== aCloud) return bCloud - aCloud;
      return b.updatedAt - a.updatedAt;
    });
  const visible = filtered.slice(0, maxVisible);
  return {
    visible,
    overflow: Math.max(0, filtered.length - visible.length),
    allSorted: filtered,
  };
}
