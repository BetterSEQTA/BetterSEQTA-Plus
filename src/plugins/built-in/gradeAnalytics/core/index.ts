import type { Plugin } from "@/plugins/core/types";
import MenuitemSVGKey from "@/seqta/content/MenuItemSVGKey.json";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import {
  ensureAnalyticsMenuOrder,
  insertMenuItemAfterKey,
  processMenuItemNode,
} from "@/seqta/utils/sidebarMenuIcons";
import {
  ChangeMenuItemPositions,
  MenuOptionsOpen,
} from "@/seqta/utils/Openers/OpenMenuOptions";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { applyMenuItemVisibility } from "@/seqta/utils/menuItemVisibility";
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

    const menuList = (await waitForElm("#menu > ul, #menu ul", true, 100, 60)) as HTMLElement;

    const analyticsItem = document.createElement("li");
    analyticsItem.className = "item";
    analyticsItem.classList.add(ANALYTICS_MENU_CLASS);
    analyticsItem.id = "analyticsbutton";
    analyticsItem.dataset.key = "analytics";
    analyticsItem.dataset.path = "/analytics";
    analyticsItem.dataset.betterseqta = "true";
    analyticsItem.innerHTML = `<label>${ANALYTICS_MENU_ICON}<span>Analytics</span></label>`;

    const syncAnalyticsMenu = () => {
      insertMenuItemAfterKey(menuList, analyticsItem, "courses");
      ensureAnalyticsMenuOrder();
      if (settingsState.menuorder.length > 0) {
        ChangeMenuItemPositions(settingsState.menuorder);
      }
      processMenuItemNode(analyticsItem);
      applyMenuItemVisibility();
    };

    syncAnalyticsMenu();

    const menuObserver = new MutationObserver(() => {
      if (MenuOptionsOpen || menuList.contains(analyticsItem)) return;
      syncAnalyticsMenu();
    });
    menuObserver.observe(menuList, { childList: true });

    analyticsItem.addEventListener("click", (e) => {
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
    });

    return () => {
      menuObserver.disconnect();
      analyticsItem.remove();
    };
  },
};

export default gradeAnalyticsPlugin;
