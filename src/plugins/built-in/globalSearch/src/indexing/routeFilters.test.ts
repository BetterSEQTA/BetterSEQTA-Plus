import { isAssessmentListRoute } from "./routeFilters";

describe("isAssessmentListRoute", () => {
  it("matches past and upcoming assessment list routes", () => {
    expect(isAssessmentListRoute("/seqta/student/assessment/list/past?")).toBe(
      true,
    );
    expect(
      isAssessmentListRoute("/seqta/student/assessment/list/upcoming?"),
    ).toBe(true);
  });

  it("does not match unrelated routes", () => {
    expect(isAssessmentListRoute("/seqta/student/load/courses")).toBe(false);
    expect(isAssessmentListRoute("/seqta/student/load/messages")).toBe(false);
    expect(isAssessmentListRoute("/seqta/student/assessment/save")).toBe(false);
  });
});
