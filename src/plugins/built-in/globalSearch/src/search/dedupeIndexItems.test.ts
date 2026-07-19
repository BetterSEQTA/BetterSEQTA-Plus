import {
  assessmentDestinationKey,
  dedupeCombinedResultsByCourseNav,
  dedupeIndexItemsForSearch,
} from "./dedupeIndexItems";
import type { IndexItem } from "../indexing/types";

function makeItem(overrides: Partial<IndexItem> & Pick<IndexItem, "id">): IndexItem {
  return {
    text: "SAT 1: Differential Calculus",
    category: "assignments",
    content: "Subject: Mathematical Methods",
    dateAdded: 1,
    metadata: {},
    actionId: "assessment",
    renderComponentId: "assessment",
    ...overrides,
  };
}

describe("assessmentDestinationKey", () => {
  it("keys curated assignment items by assessment id", () => {
    const item = makeItem({
      id: "assignment-19748",
      metadata: { assessmentId: 19748 },
    });
    expect(assessmentDestinationKey(item)).toBe("assessment:19748");
  });

  it("keys passive past items by entity id", () => {
    const item = makeItem({
      id: "passive-past-19748",
      category: "past",
      actionId: "passive",
      renderComponentId: "passive",
      metadata: {
        entityId: 19748,
        route: "/seqta/student/assessment/list/past",
        source: "passive",
      },
    });
    expect(assessmentDestinationKey(item)).toBe("assessment:19748");
  });
});

describe("dedupeIndexItemsForSearch assessments", () => {
  it("keeps curated assignment over passive past duplicate", () => {
    const passive = makeItem({
      id: "passive-past-19748",
      category: "past",
      actionId: "passive",
      renderComponentId: "passive",
      dateAdded: 2,
      metadata: {
        entityId: 19748,
        route: "/seqta/student/assessment/list/past",
        source: "passive",
      },
    });
    const curated = makeItem({
      id: "assignment-19748",
      category: "assignments",
      actionId: "assessment",
      renderComponentId: "assessment",
      dateAdded: 1,
      metadata: {
        assessmentId: 19748,
        programmeId: 3705,
        metaclassId: 10337,
      },
    });

    const result = dedupeIndexItemsForSearch([passive, curated]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("assignment-19748");
  });

  it("preserves unrelated items", () => {
    const course = makeItem({
      id: "course-1",
      category: "courses",
      actionId: "course",
      renderComponentId: "course",
      metadata: { programmeId: 1, metaclassId: 2 },
    });
    const assignment = makeItem({
      id: "assignment-99",
      metadata: { assessmentId: 99 },
    });

    const result = dedupeIndexItemsForSearch([course, assignment]);
    expect(result).toHaveLength(2);
  });
});

describe("dedupeCombinedResultsByCourseNav assessments", () => {
  it("collapses hybrid results for the same assessment id", () => {
    const passive = makeItem({
      id: "passive-past-19748",
      category: "past",
      actionId: "passive",
      renderComponentId: "passive",
      metadata: {
        entityId: 19748,
        route: "/seqta/student/assessment/list/past",
        source: "passive",
      },
    });
    const curated = makeItem({
      id: "assignment-19748",
      metadata: { assessmentId: 19748, programmeId: 3705, metaclassId: 10337 },
    });

    const results = dedupeCombinedResultsByCourseNav([
      { type: "dynamic", id: passive.id, score: 0.9, item: passive },
      { type: "dynamic", id: curated.id, score: 0.8, item: curated },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("assignment-19748");
    expect(results[0].score).toBe(0.9);
  });
});
