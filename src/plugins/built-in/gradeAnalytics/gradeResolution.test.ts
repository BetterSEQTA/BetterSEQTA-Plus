import { describe, expect, it } from "vitest";
import { DEFAULT_ANALYTICS_GRADE_INFERENCE } from "./gradeInferenceSettings";
import {
  resolveGradeFromAssessmentPayload,
  rollupPercentFromCriteria,
} from "./gradeResolution";

describe("rollupPercentFromCriteria", () => {
  it("returns undefined when no criterion marks exist", () => {
    expect(rollupPercentFromCriteria([], DEFAULT_ANALYTICS_GRADE_INFERENCE)).toBeUndefined();
  });

  it("averages criterion percentages when weights are missing", () => {
    const result = rollupPercentFromCriteria(
      [
        { results: { percentage: 80 } },
        { results: { percentage: 60 } },
      ],
      DEFAULT_ANALYTICS_GRADE_INFERENCE,
    );
    expect(result).toBe(70);
  });

  it("uses weighted mean when weights are present on every part", () => {
    const result = rollupPercentFromCriteria(
      [
        { results: { percentage: 100 }, weight: 2 },
        { results: { percentage: 50 }, weight: 1 },
      ],
      DEFAULT_ANALYTICS_GRADE_INFERENCE,
    );
    expect(result).toBe(83.3);
  });

  it("maps rubric labels through custom bands when rollup is enabled", () => {
    const settings = {
      ...DEFAULT_ANALYTICS_GRADE_INFERENCE,
      useCustomGradeBands: true,
      gradeBands: [{ id: "1", label: "Excellent", percent: 95 }],
    };
    const result = rollupPercentFromCriteria(
      [{ results: { grade: "Excellent" } }, { results: { grade: "Excellent" } }],
      settings,
    );
    expect(result).toBe(95);
  });
});

describe("resolveGradeFromAssessmentPayload", () => {
  it("prefers SEQTA overall percentage", () => {
    const resolved = resolveGradeFromAssessmentPayload(
      {
        status: "MARKS_RELEASED",
        results: { percentage: 88 },
      },
      DEFAULT_ANALYTICS_GRADE_INFERENCE,
    );
    expect(resolved.finalGrade).toBe(88);
    expect(resolved.source).toBe("seqta");
  });

  it("does not rollup criteria unless the option is enabled", () => {
    const payload = {
      status: "MARKS_RELEASED",
      criteria: [
        { results: { percentage: 70 } },
        { results: { percentage: 90 } },
      ],
    };
    expect(
      resolveGradeFromAssessmentPayload(payload, DEFAULT_ANALYTICS_GRADE_INFERENCE)
        .finalGrade,
    ).toBe(70);

    const withRollup = {
      ...DEFAULT_ANALYTICS_GRADE_INFERENCE,
      rollupCriteriaGrades: true,
    };
    expect(
      resolveGradeFromAssessmentPayload(payload, withRollup).finalGrade,
    ).toBe(80);
    expect(resolveGradeFromAssessmentPayload(payload, withRollup).source).toBe(
      "criteriaRollup",
    );
  });

  it("uses custom bands for letter-only marks", () => {
    const settings = {
      ...DEFAULT_ANALYTICS_GRADE_INFERENCE,
      useCustomGradeBands: true,
      gradeBands: [{ id: "1", label: "Proficient", percent: 72 }],
    };
    const resolved = resolveGradeFromAssessmentPayload(
      {
        status: "MARKS_RELEASED",
        results: { grade: "Proficient" },
      },
      settings,
    );
    expect(resolved.finalGrade).toBe(72);
    expect(resolved.source).toBe("customBand");
  });
});
