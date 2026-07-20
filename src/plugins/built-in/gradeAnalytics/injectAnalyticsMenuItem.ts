import MenuitemSVGKey from "@/seqta/content/MenuItemSVGKey.json";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import {
  ensureAnalyticsMenuOrder,
  insertMenuItemAfterKey,
} from "@/seqta/utils/Openers/analyticsMenuOrder";
import { processMenuItemNode } from "@/seqta/utils/sidebarMenuIcons";
import { ChangeMenuItemPositions } from "@/seqta/utils/Openers/menuOrder";
import { isMenuOptionsOpen } from "@/seqta/utils/Openers/menuOptionsState";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { applyMenuItemVisibility } from "@/seqta/utils/menuItemVisibility";
import { getNativeMenuList } from "@/seqta/ui/sidebar/parseNativeMenu";

const ANALYTICS_MENU_ICON = MenuitemSVGKey.analytics;
export const ANALYTICS_MENU_CLASS = "betterseqta-grade-analytics-item";
export const ANALYTICS_MENU_KEY = "analytics";

function loadAnalyticsPageLazy() {
  void import("./loadAnalyticsPage").then((m) => m.loadAnalyticsPage());
}

/**
 * Inject the Analytics sidebar row immediately (eager).
 * The analytics page chunk stays lazy until click / direct navigation.
 */
export async function injectAnalyticsMenuItem(): Promise<() => void> {
  if (isSeqtaEngageExperience()) {
    return () => {};
  }

  document
    .querySelectorAll(
      `#menu .${ANALYTICS_MENU_CLASS}, #menu [data-key="${ANALYTICS_MENU_KEY}"]`,
    )
    .forEach((node) => {
      // Only touch the native list copy — custom sidebar mirrors via sync.
      if (node.closest("#bsplus-sidebar-root")) return;
      node.remove();
    });

  await waitForElm(
    "#menu > ul:not(#bsplus-sidebar-root), #menu > ul",
    true,
    50,
    120,
  );

  let menuList = getNativeMenuList();
  if (!menuList) {
    menuList = (await waitForElm(
      "#menu > ul:not(#bsplus-sidebar-root), #menu ul",
      true,
      50,
      120,
    )) as HTMLElement;
  }

  const analyticsItem = document.createElement("li");
  analyticsItem.className = "item";
  analyticsItem.classList.add(ANALYTICS_MENU_CLASS);
  analyticsItem.id = "analyticsbutton";
  analyticsItem.dataset.key = ANALYTICS_MENU_KEY;
  analyticsItem.dataset.path = "/analytics";
  analyticsItem.dataset.betterseqta = "true";
  analyticsItem.innerHTML = `<label>${ANALYTICS_MENU_ICON}<span>Analytics</span></label>`;

  const syncAnalyticsMenu = () => {
    const list = getNativeMenuList() ?? menuList;
    if (!list) return;

    if (list.querySelector(':scope > [data-key="courses"]')) {
      insertMenuItemAfterKey(list, analyticsItem, "courses");
    } else if (list.querySelector(':scope > [data-key="home"]')) {
      insertMenuItemAfterKey(list, analyticsItem, "home");
    } else if (!list.contains(analyticsItem)) {
      list.insertBefore(analyticsItem, list.firstChild);
    }

    ensureAnalyticsMenuOrder();
    if (settingsState.menuorder.length > 0) {
      ChangeMenuItemPositions(settingsState.menuorder);
    }
    processMenuItemNode(analyticsItem);
    applyMenuItemVisibility();
    window.dispatchEvent(new CustomEvent("bsplus-native-menu-updated"));
  };

  syncAnalyticsMenu();

  const menuObserver = new MutationObserver(() => {
    const list = getNativeMenuList() ?? menuList;
    if (!list || isMenuOptionsOpen() || list.contains(analyticsItem)) return;
    syncAnalyticsMenu();
  });
  menuObserver.observe(menuList, { childList: true });

  const onClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      isMenuOptionsOpen() ||
      analyticsItem.classList.contains("draggable") ||
      target.closest(".onoffswitch, .editmenuoption-container")
    ) {
      return;
    }
    e.preventDefault();
    window.history.pushState({}, "", "/#?page=/analytics");
    loadAnalyticsPageLazy();
  };
  analyticsItem.addEventListener("click", onClick);

  return () => {
    menuObserver.disconnect();
    analyticsItem.removeEventListener("click", onClick);
    analyticsItem.remove();
  };
}
