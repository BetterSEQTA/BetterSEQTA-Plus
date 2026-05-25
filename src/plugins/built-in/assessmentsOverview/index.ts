import type { Plugin } from "../../core/types";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { getAssessmentsData } from "./api";
import { renderErrorState, renderGrid, renderSkeletonLoader } from "./ui";
import styles from "./styles.css?inline";
import { delay } from "@/seqta/utils/delay";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import {
  isEngageAssessmentOverviewRoute,
} from "@/seqta/utils/engageAssessmentStudent";
import { resolveEngageStudentId } from "./engageApi";

const OVERVIEW_MENU_CLASS = "betterseqta-assessments-overview-item";

function ensureOverviewMenuPosition(
  menu: HTMLElement,
  gridItem: HTMLElement,
) {
  if (menu.firstElementChild !== gridItem) {
    menu.insertBefore(gridItem, menu.firstChild);
  }
}

function isOverviewRoute() {
  if (isSeqtaEngageExperience()) {
    return isEngageAssessmentOverviewRoute();
  }
  return window.location.hash.includes("/assessments/overview");
}

async function waitForAssessmentsSubmenu(): Promise<HTMLElement> {
  if (!isSeqtaEngageExperience()) {
    return (await waitForElm(
      '[data-key="assessments"] > .sub > ul',
      true,
      100,
      60,
    )) as HTMLElement;
  }

  return (await waitForElm(
    '[data-key="assessments"] .sub ul, [data-key="assessments"] ul',
    true,
    100,
    350,
  )) as HTMLElement;
}

const assessmentsOverviewPlugin: Plugin<{}> = {
  id: "assessments-overview",
  name: "Assessments Overview",
  description:
    "Adds an overview option to the assessments page that organizes assessments by status",
  version: "1.0.0",
  settings: {},
  disableToggle: false,
  styles,

  run: async () => {
    const menu = await waitForAssessmentsSubmenu();
    const gridItem = document.createElement("li");
    gridItem.className = "item";
    gridItem.classList.add(OVERVIEW_MENU_CLASS);
    const label = document.createElement("label");
    label.textContent = "Overview";
    gridItem.appendChild(label);
    menu.insertBefore(gridItem, menu.firstChild);

    const menuObserver = new MutationObserver(() => {
      ensureOverviewMenuPosition(menu, gridItem);
    });
    menuObserver.observe(menu, { childList: true });

    if (isOverviewRoute()) {
      void loadGridView();
    }

    const clickHandler = (e: Event) => {
      e.preventDefault();
      void loadGridView();
    };
    gridItem.addEventListener("click", clickHandler);

    async function loadGridView() {
      await delay(1);

      if (isSeqtaEngageExperience()) {
        const studentId = await resolveEngageStudentId();
        window.history.pushState(
          {},
          "",
          `/#?page=/assessments/${studentId}/overview`,
        );
        document.title = "Overview ― SEQTA Engage";
      } else {
        window.history.pushState({}, "", "/#?page=/assessments/overview");
        document.title = "Overview ― SEQTA Learn";
      }

      const main = document.getElementById("main");
      if (!main) return;

      document
        .querySelectorAll('[data-key="assessments"] .item')
        .forEach((item) => {
          item.classList.remove("active");
        });
      gridItem.classList.add("active");
      document
        .querySelector('[data-key="assessments"]')
        ?.classList.add("active");

      main.innerHTML = '<div id="grid-view-container"></div>';
      const container = document.getElementById(
        "grid-view-container",
      ) as HTMLElement;

      renderSkeletonLoader(container);

      try {
        const data = await getAssessmentsData();
        renderGrid(container, data);
      } catch (err) {
        console.error("Failed to load assessments:", err);
        renderErrorState(
          container,
          err instanceof Error ? err.message : "Unknown error",
        );
      }
    }

    return () => {
      menuObserver.disconnect();
      gridItem.removeEventListener("click", clickHandler);
      gridItem.remove();
    };
  },
};

export default assessmentsOverviewPlugin;
