import { BasePlugin } from "@/plugins/core/settings";
import {
  booleanSetting,
  defineSettings,
  Setting,
} from "@/plugins/core/settingsHelpers";
import { type Plugin } from "@/plugins/core/types";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { waitForElm } from "@/seqta/utils/waitForElm";
import ReactFiber from "@/seqta/utils/ReactFiber.ts";
import {
  clearStuck,
  getClassByPattern,
  initStorage,
  letterToNumber,
  parseAssessments,
  processAssessments,
} from "./utils.ts";

interface weightingsStorage {
  weightings: Record<string, string>;
  assessments: Record<string, string>;
}

const settings = defineSettings({
  lettergrade: booleanSetting({
    default: false,
    title: "Letter Grades",
    description: "Display the average as a letter instead of a percentage",
  }),
});

class AssessmentsAveragePluginClass extends BasePlugin<typeof settings> {
  @Setting(settings.lettergrade)
  lettergrade!: boolean;
}

const instance = new AssessmentsAveragePluginClass();

const assessmentsAveragePlugin: Plugin<typeof settings, weightingsStorage> = {
  id: "assessments-average",
  name: "Assessment Averages",
  description: "Adds an average grade to the Assessments page",
  version: "1.0.0",
  disableToggle: true,
  settings: instance.settings,

  run: async (api) => {
    await initStorage(api);
    clearStuck(api);

    api.seqta.onMount(".assessmentsWrapper", async () => {
      await waitForElm(
        "#main > .assessmentsWrapper .assessments [class*='AssessmentItem__AssessmentItem___']",
        true,
        10,
        1000,
      );

      await parseAssessments(api);

      const sampleAssessmentItem = document.querySelector(
        "[class*='AssessmentItem__AssessmentItem___']",
      );
      if (!sampleAssessmentItem) return;

      const assessmentItemClass =
        Array.from(sampleAssessmentItem.classList).find((c) =>
          c.startsWith("AssessmentItem__AssessmentItem___"),
        ) || "";

      const metaContainerClass = getClassByPattern(
        sampleAssessmentItem,
        "AssessmentItem__metaContainer___",
      );
      const metaClass = getClassByPattern(
        sampleAssessmentItem,
        "AssessmentItem__meta___",
      );
      const simpleResultClass = getClassByPattern(
        sampleAssessmentItem,
        "AssessmentItem__simpleResult___",
      );
      const titleClass = getClassByPattern(
        sampleAssessmentItem,
        "AssessmentItem__title___",
      );

      const thermoscoreElement = document.querySelector(
        "[class*='Thermoscore__Thermoscore___']",
      );
      if (!thermoscoreElement) return;

      const thermoscoreClass =
        Array.from(thermoscoreElement.classList).find((c) =>
          c.startsWith("Thermoscore__Thermoscore___"),
        ) || "";
      const fillClass = getClassByPattern(
        thermoscoreElement,
        "Thermoscore__fill___",
      );
      const textClass = getClassByPattern(
        thermoscoreElement,
        "Thermoscore__text___",
      );

      const assessmentsList = document.querySelector(
        "#main > .assessmentsWrapper .assessments [class*='AssessmentList__items___']",
      );
      if (!assessmentsList) return;

      const state = await ReactFiber.find(
        "[class*='AssessmentList__items___']",
      ).getState();
      const marks = state["marks"];
      if (!marks || !marks.length) return;

      const assessmentItems = Array.from(
        assessmentsList.querySelectorAll(
          `[class*='AssessmentItem__AssessmentItem___']`,
        ),
      ).filter(
        (item) =>
          !item
            .querySelector(`[class*='AssessmentItem__title___']`)
            ?.textContent?.includes("Subject Average"),
      );

      const { weightedTotal, totalWeight, hasInaccurateWeighting, count } =
        await processAssessments(api, assessmentItems);

      if (!count || totalWeight === 0) return;

      const avg = weightedTotal / totalWeight;
      const rounded = Math.ceil(avg / 5) * 5;
      const numberToLetter = Object.entries(letterToNumber).reduce(
        (acc, [k, v]) => {
          acc[v] = k;
          return acc;
        },
        {} as Record<number, string>,
      );

      const letterAvg = numberToLetter[rounded] ?? "N/A";
      const display = api.settings.lettergrade
        ? letterAvg
        : `${avg.toFixed(2)}%`;

      const existing = assessmentsList.querySelector(
        `[class*='AssessmentItem__title___']`,
      );
      if (existing?.textContent === "Subject Average") return;

      let warningHTML = "";
      if (hasInaccurateWeighting) {
        warningHTML = /* html */ `
          <div style="margin-top: 4px; font-size: 11px; color: rgba(255, 255, 255, 0.6); opacity: 0.8; line-height: 1.3;">
            ⚠ Some weightings unavailable
          </div>
        `;
      }

      assessmentsList.insertBefore(
        stringToHTML(/* html */ `
        <div class="${assessmentItemClass}">
          <div class="${metaContainerClass}">
            <div class="${metaClass}">
              <div class="${simpleResultClass}">
                <div class="${titleClass}">Subject Average</div>
                ${warningHTML}
              </div>
            </div>
          </div>
          <div class="${thermoscoreClass}">
            <div class="${fillClass}" style="width: ${avg.toFixed(2)}%">
              <div class="${textClass}" title="${hasInaccurateWeighting ? display + " (some weightings unavailable)" : display}">${display}</div>
            </div>
          </div>
        </div>
      `).firstChild!,
        assessmentsList.firstChild,
      );
    });
  },
};

export default assessmentsAveragePlugin;
