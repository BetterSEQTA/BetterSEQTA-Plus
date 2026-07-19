import { type Plugin } from "@/plugins/core/types";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { waitForElm } from "@/seqta/utils/waitForElm";
import {
  clearStuck,
  getClassByPattern,
  initStorage,
  injectWeightingsTab,
  letterToNumber,
  parseAssessments,
  processAssessments,
  type WeightingEntry,
} from "./utils.ts";
import { injectRubricCopyButtons, teardownRubricCopyButtons } from "./rubricCopy.ts";

interface weightingsStorage {
  weightings: Record<string, WeightingEntry>;
  assessments: Record<string, string>;
  weightingOverrides: Record<string, string>;
}

let overrideListenerController: AbortController | null = null;
let wrapperColourObserver: MutationObserver | null = null;
let wrapperColourObserverTimeout: ReturnType<typeof setTimeout> | null = null;

const assessmentsAveragePlugin = {
  run: async (api: Parameters<NonNullable<Plugin["run"]>>[0]) => {
    await initStorage(api);
    clearStuck(api);

    const { unregister: unregisterWrapperMount } = api.seqta.onMount(
      ".assessmentsWrapper",
      async () => {
      await waitForElm(
        "#main > .assessmentsWrapper .assessments [class*='AssessmentItem__AssessmentItem___']",
        true,
        10,
        1000,
      );

      // Wire listeners first so the very first re-render triggered by a
      // background handleWeightings completion can find them.
      overrideListenerController?.abort();
      overrideListenerController = new AbortController();
      document.addEventListener(
        "betterseqta:overrideChanged",
        () => renderSubjectAverage(api),
        { signal: overrideListenerController.signal },
      );
      document.addEventListener(
        "betterseqta:weightingsChanged",
        () => renderSubjectAverage(api),
        { signal: overrideListenerController.signal },
      );

      // Render immediately with whatever is already cached. Fresh entries
      // and stale-with-previous-value entries both contribute their numeric
      // weights, so the subject average appears without waiting on any
      // background PDF refetches.
      await renderSubjectAverage(api);

      // Kick off indexing in the background. Each completion dispatches
      // betterseqta:weightingsChanged, which triggers a fresh render.
      void parseAssessments(api);
      const wrapper = document.querySelector(".assessmentsWrapper");
      if (wrapper) {
        wrapperColourObserver?.disconnect();
        if (wrapperColourObserverTimeout) {
          clearTimeout(wrapperColourObserverTimeout);
        }
        wrapperColourObserver = new MutationObserver(() => {
          applySubjectColourToOverallResult();
        });
        wrapperColourObserver.observe(wrapper, { childList: true, subtree: true });
        wrapperColourObserverTimeout = setTimeout(() => {
          wrapperColourObserver?.disconnect();
          wrapperColourObserver = null;
          wrapperColourObserverTimeout = null;
        }, 10000);
      }
    },
    );
    const { unregister: unregisterSelectedMount } = api.seqta.onMount(
      "[class*='SelectedAssessment__']",
      () => {
      injectWeightingsTab(api);
      injectRubricCopyButtons();
    },
    );

    return () => {
      overrideListenerController?.abort();
      overrideListenerController = null;
      wrapperColourObserver?.disconnect();
      wrapperColourObserver = null;
      if (wrapperColourObserverTimeout) {
        clearTimeout(wrapperColourObserverTimeout);
        wrapperColourObserverTimeout = null;
      }
      teardownRubricCopyButtons();
      unregisterWrapperMount();
      unregisterSelectedMount();
    };
  },
};

let renderInFlight = false;
let renderQueued = false;
async function renderSubjectAverage(api: any) {
  if (renderInFlight) {
    // Coalesce: remember that fresh data arrived during this render and
    // re-run once the current pass finishes, so the UI catches up to the
    // latest storage state instead of silently dropping the event.
    renderQueued = true;
    return;
  }
  renderInFlight = true;

  try {
    const assessmentsList = document.querySelector(
      "#main > .assessmentsWrapper .assessments [class*='AssessmentList__items___']",
    );
    if (!assessmentsList) return;

    // Remove existing subject average before re-rendering
    Array.from(
      assessmentsList.querySelectorAll(`[class*='AssessmentItem__title___']`),
    )
      .find((el) => el.textContent === "Subject Average")
      ?.closest("[class*='AssessmentItem__AssessmentItem___']")
      ?.remove();

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

    const {
      weightedTotal,
      totalWeight,
      hasInaccurateWeighting,
      hasRefreshingWeighting,
      count,
    } = await processAssessments(api, assessmentItems);
    if (!count || totalWeight === 0) return;

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
    const display = api.settings.lettergrade ? letterAvg : `${avg.toFixed(2)}%`;
    let warningHTML = "";
    if (hasInaccurateWeighting) {
      warningHTML = /* html */ `
            <div style="margin-top: 4px; font-size: 11px; color: rgba(255, 255, 255, 0.6); opacity: 0.8; line-height: 1.3; white-space: nowrap;">
              ⚠ Some weightings unavailable
            </div>
          `;
    } else if (hasRefreshingWeighting) {
      warningHTML = /* html */ `
            <div style="margin-top: 4px; font-size: 11px; color: rgba(255, 255, 255, 0.55); opacity: 0.8; line-height: 1.3; white-space: nowrap;" title="Some weightings are being re-checked; the average may change shortly">
              ↻ Refreshing weightings
            </div>
          `;
    }
    const thermoscoreTitle = hasInaccurateWeighting
      ? `${display} (some weightings unavailable)`
      : hasRefreshingWeighting
        ? `${display} (re-checking weightings)`
        : display;
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
                <div class="${textClass}" title="${thermoscoreTitle}">${display}</div>
              </div>
            </div>
          </div>
        `).firstChild!,
      assessmentsList.firstChild,
    );
    applySubjectColourToOverallResult();
  } finally {
    renderInFlight = false;
    if (renderQueued) {
      renderQueued = false;
      void renderSubjectAverage(api);
    }
  }
}
function applySubjectColourToOverallResult() {
  const selectedAssessmentItem = document.querySelector(
    "[class*='AssessmentItem__AssessmentItem___'][class*='selected___']",
  ) || document.querySelector(
    "[class*='Collapsible__content___'] [class*='AssessmentItem__AssessmentItem___']",
  );
  const assessmentThermoscore = selectedAssessmentItem?.querySelector(
    "[class*='Thermoscore__Thermoscore___']",
  ) as HTMLElement | null;
  const overallResult = document.querySelector(
    "[class*='OverallResult__OverallResult___']",
  ) as HTMLElement | null;
  const assessableCriterionHeaders = document.querySelectorAll(
    "[class*='AssessableCriterion__header___']",
  );

  if (assessmentThermoscore && (overallResult || assessableCriterionHeaders.length > 0)) {
    const accentColour =
      getComputedStyle(assessmentThermoscore).getPropertyValue("--assessment-accent-colour").trim() ||
      getComputedStyle(assessmentThermoscore).getPropertyValue("--fill-colour").trim() ||
      getComputedStyle(assessmentThermoscore.closest("[class*='Collapsible__Collapsible___']") || assessmentThermoscore).getPropertyValue("--assessment-accent-colour").trim() ||
      getComputedStyle(assessmentThermoscore.closest("[class*='Collapsible__Collapsible___']") || assessmentThermoscore).getPropertyValue("--item-colour").trim();
    if (accentColour) {
      overallResult?.style.setProperty("--assessment-accent-colour", accentColour);
      overallResult?.style.setProperty("--fill-colour", accentColour);
      assessableCriterionHeaders.forEach((el) => {
        (el as HTMLElement).style.setProperty("--assessment-accent-colour", accentColour);
        (el as HTMLElement).style.setProperty("--fill-colour", accentColour);
      });
    }
  }
}

export default assessmentsAveragePlugin;
