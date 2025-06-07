import type { Plugin } from "../../core/types";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { getAssessmentsData } from "./api";
import { renderSkeletonLoader, renderErrorState } from "./ui";
import styles from "./styles.css?inline";
import { delay } from "@/seqta/utils/delay";

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
    const menu = (await waitForElm(
      '[data-key="assessments"] > .sub > ul',
      true,
      100,
      60,
    )) as HTMLElement;
    const gridItem = document.createElement("li");
    gridItem.className = "item";
    const label = document.createElement("label");
    label.textContent = "Overview";
    gridItem.appendChild(label);
    menu.insertBefore(gridItem, menu.children[1] || null);

    if (window.location.hash.includes("/assessments/overview")) {
      loadGridView();
    }

    const clickHandler = (e: Event) => {
      e.preventDefault();
      loadGridView();
    };
    gridItem.addEventListener("click", clickHandler);

    async function loadGridView() {
      await delay(1);
      window.history.pushState({}, "", "/#?page=/assessments/overview");
      document.title = "Overview ― SEQTA Learn";
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
        const { renderGrid } = await import("./ui");
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
      gridItem.removeEventListener("click", clickHandler);
      gridItem.remove();
    };
  },
};

export default assessmentsOverviewPlugin;
