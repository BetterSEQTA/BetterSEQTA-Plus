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
import { clearStuck, createWeightLabel, getClassByPattern, initStorage, letterToNumber, parseAssessments, parseGrade} from "./utils.ts";

// Storage
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

    // Ensure storage is ready for use
    await initStorage(api);

    // Clear any stuck "processing" states so they can retry
    clearStuck(api);

    api.seqta.onMount(".assessmentsWrapper", async () => {
      await waitForElm(
        "#main > .assessmentsWrapper .assessments [class*='AssessmentItem__AssessmentItem___']",
        true,
        10,
        1000,
      );

      await parseAssessments(api);

      // Find actual class names from the DOM
      const sampleAssessmentItem = document.querySelector(
        "[class*='AssessmentItem__AssessmentItem___']",
      );
      if (!sampleAssessmentItem) return;

      // Extract all necessary class patterns from a sample assessment item
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

      // Get Thermoscore classes
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

      // Find assessment list
      const assessmentsList = document.querySelector(
        "#main > .assessmentsWrapper .assessments [class*='AssessmentList__items___']",
      );
      if (!assessmentsList) return;

      // Get marks from React state to match with DOM elements
      const state = await ReactFiber.find(
        "[class*='AssessmentList__items___']",
      ).getState();
      const marks = state["marks"];
      if (!marks || !marks.length) return;

      // Parse and average grades

      // Get all assessment items (excluding the average we might have added)
      const assessmentItems = Array.from(
        assessmentsList.querySelectorAll(`[class*='AssessmentItem__AssessmentItem___']`),
      ).filter(
        (item) =>
          !item.querySelector(`[class*='AssessmentItem__title___']`)?.textContent?.includes("Subject Average"),
      );

      // Match marks to assessment items and calculate weighted average
      let weightedTotal = 0;
      let totalWeight = 0;
      let hasInaccurateWeighting = false;
      let count = 0;

      // Iterate through assessments for processing
      for (const assessmentItem of assessmentItems) {
        const gradeElement = assessmentItem.querySelector(
          `[class*='Thermoscore__text___']`,
        );

        if (!gradeElement) continue;

        const grade = parseGrade(gradeElement.textContent || "");
        if (grade <= 0) continue;

        const titleEl = assessmentItem.querySelector(
          `[class*='AssessmentItem__title___']`,
        );
        if (!titleEl) continue;

        const title = titleEl.textContent?.trim();
        if (!title) continue;

        // Get correlated assessment ID in order to fetch weightings
        const assessmentID = api.storage.assessments?.[title];
        const weighting = assessmentID
          ? api.storage.weightings?.[assessmentID]
          : undefined;


        // Creates a weighting label next to the average score
        createWeightLabel(assessmentItem, weighting)

        // Check if weighting is unavailable or still processing
        if (
          weighting === null ||
          weighting === undefined ||
          weighting === "N/A" ||
          weighting === "processing"
        ) {
          hasInaccurateWeighting = true;
          // Fall back to equal weighting if unavailable
          weightedTotal += grade;
          totalWeight += 1;
        } else {
          const weight = parseFloat(weighting);

          // If weight is a positive number, add to total
          if (!isNaN(weight) && weight >= 0) {
            weightedTotal += grade * weight;
            totalWeight += weight;
          } else {
            // Invalid weight, use equal weighting
            weightedTotal += grade;
            totalWeight += 1;
            hasInaccurateWeighting = true;
          }
        }
        count++;
      }

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

      // Prevent duplicate
      const existing = assessmentsList.querySelector(
        `[class*='AssessmentItem__title___']`,
      );
      if (existing?.textContent === "Subject Average") return;

      // Build warning message if needed
      let warningHTML = "";
      if (hasInaccurateWeighting) {
        warningHTML = /* html */ `
          <div style="margin-top: 4px; font-size: 11px; color: rgba(255, 255, 255, 0.6); opacity: 0.8; line-height: 1.3;">
            ⚠ Some weightings unavailable
          </div>
        `;
      }

      // Use the dynamic class names in the HTML template
      const averageElement = stringToHTML(/* html */ `
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
              <div class="${textClass}" title="${hasInaccurateWeighting ? display + ' (some weightings unavailable)' : display}">${display}</div>
            </div>
          </div>
        </div>
      `).firstChild;

      assessmentsList.insertBefore(averageElement!, assessmentsList.firstChild);
    });
  },
};

export default assessmentsAveragePlugin;
