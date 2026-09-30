import { afterEach, beforeEach, expect, it, jest } from "@jest/globals";

jest.mock("@/seqta/ui/AddBetterSEQTAElements", () => ({
  getUserInfo: async () => ({ id: 12 }),
}));
jest.mock("@/seqta/utils/listeners/SettingsState", () => ({
  settingsState: { hideSensitiveContent: false },
}));
jest.mock("@/seqta/ui/dev/hideSensitiveContent", () => ({
  getMockGradeAnalyticsData: () => [],
}));

import { syncGradeAnalytics } from "./api";
import { loadAnalyticsCache, saveGradeInferenceSettings } from "./storage";
import { DEFAULT_ANALYTICS_GRADE_INFERENCE } from "./gradeInferenceSettings";

const origin = "https://school.seqta.com.au";

beforeEach(() => {
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { origin },
  });
});
afterEach(() => jest.restoreAllMocks());

it("removes cached custom rubric percentages when inference is disabled", async () => {
  jest.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
    Response.json({
      payload: String(url).includes("/load/subjects")
        ? []
        : [
            {
              id: 1,
              title: "Essay",
              subject: "English",
              due: "2026-07-20",
              status: "MARKS_RELEASED",
              results: { grade: "Highly accomplished" },
            },
          ],
    }),
  );
  await saveGradeInferenceSettings(origin, 12, {
    ...DEFAULT_ANALYTICS_GRADE_INFERENCE,
    useCustomGradeBands: true,
    gradeBands: [{ id: "band", label: "Highly accomplished", percent: 90 }],
  });
  expect((await syncGradeAnalytics()).assessments[0]).toMatchObject({
    finalGrade: 90,
    gradeSource: "customBand",
  });

  await saveGradeInferenceSettings(
    origin,
    12,
    DEFAULT_ANALYTICS_GRADE_INFERENCE,
  );
  const refreshed = await syncGradeAnalytics();
  expect(refreshed.assessments[0].finalGrade).toBeUndefined();
  expect(refreshed.assessments[0].gradeSource).toBeUndefined();
  expect(
    (await loadAnalyticsCache(origin, 12))?.assessments[0].finalGrade,
  ).toBeUndefined();
});
