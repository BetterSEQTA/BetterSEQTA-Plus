import { BasePlugin } from "@/plugins/core/settings";
import { defineSettings, booleanSetting, Setting } from "@/plugins/core/settingsHelpers";
import { type Plugin } from "@/plugins/core/types";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { waitForElm } from "@/seqta/utils/waitForElm";

const settings = defineSettings({
  lettergrade: booleanSetting({
    default: false,
    title: "Letter Grades",
    description: "Display the average as a letter instead of a percentage"
  }),
});

class AssessmentsAveragePluginClass extends BasePlugin<typeof settings> {
  @Setting(settings.lettergrade)
  lettergrade!: boolean;
}

const instance = new AssessmentsAveragePluginClass();

const assessmentsAveragePlugin: Plugin<typeof settings> = {
  id: "assessments-average",
  name: "Assessment Averages",
  description: "Adds an average grade to the Assessments page",
  version: "1.0.0",
  disableToggle: true,
  settings: instance.settings,

  run: async (api) => {
    api.seqta.onMount(".assessmentsWrapper", async () => {
      await waitForElm(
        "#main > .assessmentsWrapper .assessments .AssessmentItem__AssessmentItem___2EZ95",
        true,
        10,
        1000
      )

      const assessmentsList = document.querySelector("#main > .assessmentsWrapper .assessments .AssessmentList__items___3LcmQ");
      if (!assessmentsList) return;

      const gradeElements = document.querySelectorAll(".Thermoscore__text___1NdvB");
      if (!gradeElements.length) return;

      // Parse and average grades
      const letterToNumber: Record<string, number> = {
        "A+": 100, A: 95, "A-": 90,
        "B+": 85, B: 80, "B-": 75,
        "C+": 70, C: 65, "C-": 60,
        "D+": 55, D: 50, "D-": 45,
        "E+": 40, E: 35, "E-": 30,
        F: 0,
      };

      function parseGrade(text: string): number {
        const str = text.trim().toUpperCase();
        if (str.includes("/")) {
          const [raw, max] = str.split("/").map(n => parseFloat(n));
          return (raw / max) * 100;
        }
        if (str.includes("%")) {
          return parseFloat(str.replace("%", "")) || 0;
        }
        return letterToNumber[str] ?? 0;
      }

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
      const numberToLetter = Object.entries(letterToNumber).reduce((acc, [k, v]) => {
        acc[v] = k;
        return acc;
      }, {} as Record<number, string>);

      const letterAvg = numberToLetter[rounded] ?? "N/A";
      const display = api.settings.lettergrade ? letterAvg : `${avg.toFixed(2)}%`;

      // Prevent duplicate
      const existing = assessmentsList.querySelector(".AssessmentItem__title___2bELn");
      if (existing?.textContent === "Subject Average") return;

      const averageElement = stringToHTML(/* html */ `
        <div class="AssessmentItem__AssessmentItem___2EZ95">
          <div class="AssessmentItem__metaContainer___dMKma">
            <div class="AssessmentItem__meta___WNSiK">
              <div class="AssessmentItem__simpleResult___iBCeC">
                <div class="AssessmentItem__title___2bELn">Subject Average</div>
              </div>
            </div>
          </div>
          <div class="Thermoscore__Thermoscore___2tWMi">
            <div class="Thermoscore__fill___35WjF" style="width: ${avg.toFixed(2)}%">
              <div class="Thermoscore__text___1NdvB" title="${display}">${display}</div>
            </div>
          </div>
        </div>
      `).firstChild;

      assessmentsList.insertBefore(averageElement!, assessmentsList.firstChild);
    });
  }
};

export default assessmentsAveragePlugin;
