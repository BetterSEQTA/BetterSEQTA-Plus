import {
  defaultCustomTimeRange,
  filterAssessmentsByTimeRange,
  getTimeRangeBounds,
  getTimeRangeLabel,
} from "./timeRange";
import type { Assessment } from "./types";

const assessment = (due: string): Assessment =>
  ({
    due,
    finalGrade: 80,
    subject: "Math",
  }) as Assessment;

describe("timeRange", () => {
  const ref = new Date("2026-08-20T12:00:00");

  it("uses calendar year start for this year", () => {
    const { start, end } = getTimeRangeBounds("ytd", undefined, ref);
    expect(start?.getFullYear()).toBe(2026);
    expect(start?.getMonth()).toBe(0);
    expect(start?.getDate()).toBe(1);
    expect(end).toBeNull();
  });

  it("filters custom ranges inclusively", () => {
    const custom = { from: "2026-03-01", to: "2026-03-31" };
    const items = [
      assessment("2026-02-28"),
      assessment("2026-03-01"),
      assessment("2026-03-31T23:59:00"),
      assessment("2026-04-01"),
    ];
    const filtered = filterAssessmentsByTimeRange(items, "custom", custom);
    expect(filtered.map((a) => a.due)).toEqual([
      "2026-03-01",
      "2026-03-31T23:59:00",
    ]);
  });

  it("labels custom ranges", () => {
    expect(
      getTimeRangeLabel("custom", defaultCustomTimeRange(ref)),
    ).toMatch(/2026/);
  });
});
