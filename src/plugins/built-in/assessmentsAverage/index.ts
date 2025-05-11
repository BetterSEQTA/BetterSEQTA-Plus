import { BasePlugin } from "@/plugins/core/settings";
import {
  booleanSetting,
  defineSettings,
  Setting,
} from "@/plugins/core/settingsHelpers";
import { type Plugin } from "@/plugins/core/types";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { waitForElm } from "@/seqta/utils/waitForElm";

// Define plugin settings, with an option to toggle letter grade display
const settings = defineSettings({
  lettergrade: booleanSetting({
    default: false,
    title: "Letter Grades",
    description: "Display the average as a letter instead of a percentage",
  }),
});

// Plugin class using the defined settings
class AssessmentsAveragePluginClass extends BasePlugin<typeof settings> {
  @Setting(settings.lettergrade)
  lettergrade!: boolean;
}

const instance = new AssessmentsAveragePluginClass();

// Define the plugin configuration
const assessmentsAveragePlugin: Plugin<typeof settings> = {
  id: "assessments-average",
  name: "Assessment Averages",
  description: "Adds an average grade to the Assessments page",
  version: "1.0.0",
  disableToggle: true,
  settings: instance.settings,

  run: async (api) => {
    api.seqta.onMount(".assessmentsWrapper", async () => {
      // Wait until an assessment item is loaded in the DOM
      await waitForElm(
        "#main > .assessmentsWrapper .assessments [class*='AssessmentItem__AssessmentItem___']",
        true,
        10,
        1000,
      );

      // Helper function to extract class names based on a given base pattern
      const getClassByPattern = (
        element: Element | Document,
        basePattern: string,
      ): string => {
        const classes = Array.from(element.querySelectorAll("*"))
          .flatMap((el) => Array.from(el.classList))
          .filter((className) => className.startsWith(basePattern));
        return classes.length ? classes[0] : "";
      };

      // Retrieve an example assessment item element
      const sampleAssessmentItem = document.querySelector(
        "[class*='AssessmentItem__AssessmentItem___']",
      );
      if (!sampleAssessmentItem) return;

      // Extract necessary class names from the sample item
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

      // Extract Thermoscore related class names
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

      // Find the list containing assessment items
      const assessmentsList = document.querySelector(
        "#main > .assessmentsWrapper .assessments [class*='AssessmentList__items___']",
      );
      if (!assessmentsList) return;

      // Find all grade text elements within Thermoscore components
      const gradeElements = document.querySelectorAll(
        "[class*='Thermoscore__text___']",
      );
      if (!gradeElements.length) return;

      // Map letter grades to numeric equivalents
      const letterToNumber: Record<string, number> = {
        "A+": 100,
        A: 95,
        "A-": 90,
        "B+": 85,
        B: 80,
        "B-": 75,
        "C+": 70,
        C: 65,
        "C-": 60,
        "D+": 55,
        D: 50,
        "D-": 45,
        "E+": 40,
        E: 35,
        "E-": 30,
        F: 0,
      };

      // Convert a grade string into a numeric value
      function parseGrade(text: string): number {
        const str = text.trim().toUpperCase();
        if (str.includes("/")) {
          const [raw, max] = str.split("/").map((n) => parseFloat(n));
          return (raw / max) * 100;
        }
        if (str.includes("%")) {
          return parseFloat(str.replace("%", "")) || 0;
        }
        return letterToNumber[str] ?? 0;
      }

      // Calculate the average grade from all available grades
      let total = 0;
      let count = 0;
      gradeElements.forEach((el) => {
        const grade = parseGrade(el.textContent || "");
        if (grade > 0) {
          total += grade;
          count++;
        }
      });

      if (!count) return;

      const avg = total / count;
      const rounded = Math.ceil(avg / 5) * 5;

      // Create reverse lookup for number to letter grade
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

      // Prevent inserting duplicate average item
      const existing = assessmentsList.querySelector(
        `[class*='AssessmentItem__title___']`,
      );
      if (existing?.textContent === "Subject Average") return;

      // Create the average grade item using dynamic classes
      const averageElement = stringToHTML(/* html */ `
        <div class="${assessmentItemClass}">
          <div class="${metaContainerClass}">
            <div class="${metaClass}">
              <div class="${simpleResultClass}">
                <div class="${titleClass}">Subject Average</div>
              </div>
            </div>
          </div>
          <div class="${thermoscoreClass}">
            <div class="${fillClass}" style="width: ${avg.toFixed(2)}%">
              <div class="${textClass}" title="${display}">${display}</div>
            </div>
          </div>
        </div>
      `).firstChild;

      // Insert the new average grade item at the top of the list
      assessmentsList.insertBefore(averageElement!, assessmentsList.firstChild);
    });
  },
};

export default assessmentsAveragePlugin;
