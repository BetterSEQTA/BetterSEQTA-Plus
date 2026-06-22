import type { Plugin } from "@/plugins/core/types";
import MenuitemSVGKey from "@/seqta/content/MenuItemSVGKey.json";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import { processMenuItemNode } from "@/seqta/utils/sidebarMenuIcons";
import { MenuOptionsOpen } from "@/seqta/utils/Openers/OpenMenuOptions";
import {
  applyMenuItemVisibility,
  isMenuItemHidden,
} from "@/seqta/utils/menuItemVisibility";
import { loadAnalyticsPage } from "../loadAnalyticsPage";
import styles from "../styles.css?inline";

const ANALYTICS_MENU_ICON = MenuitemSVGKey.analytics;

const ANALYTICS_MENU_CLASS = "betterseqta-grade-analytics-item";

const gradeAnalyticsPlugin: Plugin<{}> = {
  id: "grade-analytics",
  name: "Grade Analytics",
  description:
    "Adds an analytics page with grade trends, distribution charts, and assessment history",
  version: "1.0.0",
  settings: {},
  disableToggle: true,
  styles,

  run: async () => {
    if (isSeqtaEngageExperience()) {
      return () => {};
    }

    if (isMenuItemHidden("analytics")) {
      return () => {};
    }

    const menuList = (await waitForElm("#menu > ul, #menu ul", true, 100, 60)) as HTMLElement;

    const analyticsItem = document.createElement("li");
    analyticsItem.className = "item";
    analyticsItem.classList.add(ANALYTICS_MENU_CLASS);
    analyticsItem.id = "analyticsbutton";
    analyticsItem.dataset.key = "analytics";
    analyticsItem.dataset.path = "/analytics";
    analyticsItem.dataset.betterseqta = "true";
    analyticsItem.innerHTML = `<label>${ANALYTICS_MENU_ICON}<span>Analytics</span></label>`;

    const homeButton = document.getElementById("homebutton");
    if (homeButton?.parentElement === menuList) {
      homeButton.insertAdjacentElement("afterend", analyticsItem);
    } else {
      menuList.insertBefore(analyticsItem, menuList.firstChild);
    }

    processMenuItemNode(analyticsItem);
    applyMenuItemVisibility();

    const menuObserver = new MutationObserver(() => {
      if (MenuOptionsOpen) return;
      if (isMenuItemHidden("analytics")) return;
      if (!menuList.contains(analyticsItem)) {
        if (homeButton?.parentElement === menuList) {
          homeButton.insertAdjacentElement("afterend", analyticsItem);
        } else {
          menuList.insertBefore(analyticsItem, menuList.firstChild);
        }
        processMenuItemNode(analyticsItem);
        applyMenuItemVisibility();
      }
    });
    menuObserver.observe(menuList, { childList: true });

    const onClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        MenuOptionsOpen ||
        analyticsItem.classList.contains("draggable") ||
        target.closest(".onoffswitch, .editmenuoption-container")
      ) {
        return;
      }
      e.preventDefault();
      window.history.pushState({}, "", "/#?page=/analytics");
      void loadAnalyticsPage();
    };
    analyticsItem.addEventListener("click", onClick);

    return () => {
      menuObserver.disconnect();
      analyticsItem.removeEventListener("click", onClick);
      analyticsItem.remove();
    };
  },
};

export default gradeAnalyticsPlugin;
