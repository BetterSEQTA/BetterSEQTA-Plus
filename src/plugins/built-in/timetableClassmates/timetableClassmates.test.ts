import {
  buildAvatarDisplayList,
  classRefsFromTimetableItems,
  classRosterKey,
} from "./classKeys";
import { buildSharePayload } from "./relayPayload";
import { buildIdentityBindingCanonical } from "./identityBinding";
import {
  mergePayloadIntoRoster,
  emptyRosterIndex,
  removeMemberFromRoster,
  archiveMember,
  rosterPeersForClass,
  isMemberArchived,
} from "./rosterMerge";

describe("identityBinding canonical", () => {
  it("matches betterseqta-accounts worker v1 format", () => {
    const canonical = buildIdentityBindingCanonical({
      version: 1,
      instanceHost: "learn.example.edu.au",
      seqtaStudentId: 18,
      seqtaPersonUuid: "03c5f6e3-b27e-42e1-bece-27c6526205a8",
      cloudUserId: "550E8400-E29B-41D4-A716-446655440000",
      seqtaAccountType: "student",
    });
    expect(canonical).toBe(
      [
        "v=1",
        "instance=learn.example.edu.au",
        "student=18",
        "person=03c5f6e3-b27e-42e1-bece-27c6526205a8",
        "cloud=550e8400-e29b-41d4-a716-446655440000",
        "type=student",
      ].join("\n"),
    );
  });
});

describe("classRosterKey", () => {
  it("prefers metaID", () => {
    expect(classRosterKey({ metaID: 14774 })).toBe("cr:v1:14774");
  });

  it("falls back to code and programmeID", () => {
    expect(classRosterKey({ code: "AEMAA1", programmeID: 6865 })).toBe(
      "cr:v1:AEMAA1:6865",
    );
  });
});

describe("classRefsFromTimetableItems", () => {
  it("dedupes and skips non-class types", () => {
    const refs = classRefsFromTimetableItems([
      { type: "class", metaID: 1, code: "A" },
      { type: "class", metaID: 1, code: "A" },
      { type: "appointment", metaID: 2, code: "B" },
    ]);
    expect(refs).toHaveLength(1);
    expect(refs[0].metaID).toBe(1);
  });
});

describe("relay share payload", () => {
  it("builds roster merge input", () => {
    const payload = buildSharePayload({
      instance: "school.example.edu.au",
      sender: { seqtaId: 18, personUuid: "uuid", cloudUserId: null },
      period: { from: "2026-01-01", until: "2026-12-31" },
      classes: [{ metaID: 1, code: "X" }],
    });
    expect(payload.sender.seqtaId).toBe(18);
    expect(payload.classes).toHaveLength(1);
  });
});

describe("rosterMerge", () => {
  it("only merges allowed senders", () => {
    const payload = buildSharePayload({
      instance: "school.example.edu.au",
      sender: { seqtaId: 99, personUuid: "u", cloudUserId: null },
      period: { from: "a", until: "b" },
      classes: [{ metaID: 5 }],
    });
    const next = mergePayloadIntoRoster(emptyRosterIndex(), payload, new Set([18]));
    expect(Object.keys(next)).toHaveLength(0);
  });

  it("merges peer into class bucket", () => {
    const payload = buildSharePayload({
      instance: "school.example.edu.au",
      sender: { seqtaId: 18, personUuid: "u", cloudUserId: "cloud" },
      period: { from: "a", until: "b" },
      classes: [{ metaID: 5 }],
    });
    const next = mergePayloadIntoRoster(emptyRosterIndex(), payload, new Set([18]));
    expect(next["cr:v1:5"]?.["18"]?.cloudUserId).toBe("cloud");
  });
});

describe("removeMemberFromRoster", () => {
  it("removes student from all class buckets", () => {
    const index = mergePayloadIntoRoster(
      emptyRosterIndex(),
      buildSharePayload({
        instance: "x",
        sender: { seqtaId: 2, personUuid: "a", cloudUserId: null },
        period: { from: "a", until: "b" },
        classes: [{ metaID: 1 }],
      }),
      new Set([2]),
    );
    const next = removeMemberFromRoster(index, 2);
    expect(rosterPeersForClass(next, "cr:v1:1")).toHaveLength(0);
  });
});

describe("archived members", () => {
  it("hides archived peers from class roster", () => {
    const index = mergePayloadIntoRoster(
      emptyRosterIndex(),
      buildSharePayload({
        instance: "x",
        sender: { seqtaId: 2, personUuid: "a", cloudUserId: null },
        period: { from: "a", until: "b" },
        classes: [{ metaID: 1 }],
      }),
      new Set([2]),
    );
    const archived = archiveMember({}, 2);
    expect(isMemberArchived(archived, 2)).toBe(true);
    expect(rosterPeersForClass(index, "cr:v1:1", archived)).toHaveLength(0);
  });
});

describe("buildAvatarDisplayList", () => {
  it("caps visible avatars and counts overflow", () => {
    const peers = [1, 2, 3, 4, 5, 6].map((id, i) => ({
      seqtaStudentId: id,
      updatedAt: i,
    }));
    const { visible, overflow } = buildAvatarDisplayList(peers, 0, 4);
    expect(visible).toHaveLength(4);
    expect(overflow).toBe(2);
  });

  it("excludes self", () => {
    const { visible } = buildAvatarDisplayList(
      [{ seqtaStudentId: 3, updatedAt: 1 }],
      3,
      4,
    );
    expect(visible).toHaveLength(0);
  });
});
