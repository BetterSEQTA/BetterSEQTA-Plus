import { getTeachPathSegment, isTeachHomePath } from "./teachPath";

describe("teachPath", () => {
  it("reads the first path segment", () => {
    expect(getTeachPathSegment("/timetable/542/myday")).toBe("timetable");
    expect(getTeachPathSegment("/betterseqta-home")).toBe("betterseqta-home");
    expect(getTeachPathSegment("/studentSummary/brief")).toBe("studentSummary");
    expect(getTeachPathSegment("/")).toBeUndefined();
  });

  it("detects BetterSEQTA home route", () => {
    expect(isTeachHomePath("/betterseqta-home")).toBe(true);
    expect(isTeachHomePath("/timetable")).toBe(false);
  });

  it("treats welcome as a distinct first segment", () => {
    expect(getTeachPathSegment("/welcome")).toBe("welcome");
  });
});
