import { icon } from "@/lib/icon";
import { LogOut, Moon, Sun, Wrench } from "lucide-static";
import { waitForEngageMenuList } from "@/seqta/utils/waitForEngageMenuList";
import { addExtensionSettings } from "@/seqta/utils/adders/addExtensionSettings";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import { loadEngageHomePage } from "@/seqta/utils/loaders/loadEngageHomePage";
import { loadHomePage } from "@/seqta/utils/loaders/loadHomePage";
import { SendNewsPage } from "@/seqta/utils/sendNewsPage";
import { attachNotificationsPanelAnimation } from "@/seqta/utils/attachNotificationsPanelAnimation";
import { setupSettingsButton } from "@/seqta/utils/setupSettingsButton";
import { waitForElm } from "@/seqta/utils/waitForElm";

import { GetThresholdOfColor } from "@/seqta/ui/colors/getThresholdColour";
import { appendBackgroundToUI } from "./imageBackgrounds";
import { attachTooltip } from "@/seqta/utils/tooltip";
import { pageIcon } from "@/seqta/utils/pageIcons";
import { applyDefaultBackgroundOnce } from "./defaultBackground";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { settingsState } from "@/seqta/utils/listeners/settingsState";
import { updateAllColors } from "./colors/colorManager";
import {
  ensureThemeToggleSurprisePageScript,
  openThemeToggleSurprise,
  THEME_TOGGLE_SURPRISE_TRIGGER_AT,
} from "@/seqta/utils/openers/openThemeToggleSurprise";
import {
  ensureTitlebarFounderBadgeMounted,
  refreshTitlebarFounderBadge,
} from "@/seqta/ui/founderBadge/mountTitlebarFounderBadge";
import { isPerformanceMode } from "@/seqta/utils/performanceMode";
import { isFeatureDisabled } from "@/seqta/utils/remoteStatus";
import { rafThrottle } from "@/seqta/utils/rafThrottle";
import {
  installSidebarDrillReturn,
  runSidebarDrillReturn,
  getSidebarDrillDepth,
} from "@/seqta/ui/sidebar/sidebarDrillReturn";
import { getUserInfo } from "@/seqta/utils/userInfo";

const USER_AVATAR_SVG = `<svg class="userInfosvg" viewBox="0 0 24 24"><path fill="var(--text-primary)" d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z"></path></svg>`;

let lightDarkToggleStreak = 0;
let sidebarAccessibilityObserver: MutationObserver | null = null;
let sidebarTabOrderAnimationFrame: number | null = null;
let sidebarAccessibilityListenersAttached = false;

/** Marks menu rows that are off-screen in the drill stack (CSS blocks clicks). */
const BSPLUS_SIDEBAR_OFFSCREEN = "bsplus-sidebar-offscreen";

export async function AddBetterSEQTAElements() {
  if (isSeqtaEngageExperience()) {
    await waitForElm("#content");
    addExtensionSettings();
    if (settingsState.onoff) {
      await injectEngageHomeButton();
    }
    void setupEngageSettingsButton();
    void addEngageUserInfo();
    return;
  }

  if (settingsState.onoff) {
    if (settingsState.DarkMode) {
      document.documentElement.classList.add("dark");
    }

    const fragment = document.createDocumentFragment();
    const menu = document.getElementById("menu")!;
    const menuList = menu.firstChild as HTMLElement;

    if (!isFeatureDisabled("page.home")) {
      createHomeButton(fragment);
    }
    if (!isFeatureDisabled("page.news")) {
      createNewsButton(fragment, menu);
    }

    menuList.insertBefore(fragment, menuList.firstChild);

    try {
      await Promise.all([
        applyDefaultBackgroundOnce()
          .catch((error) => console.warn("[BetterSEQTA+] Default background failed:", error))
          .then(appendBackgroundToUI),
        handleUserInfoAndStudentData(),
      ]);
    } catch (error) {
      console.error("[BetterSEQTA+] Failed to initialize UI elements:", error);
    }

    setupEventListeners();
    await addDarkLightToggle();
    customizeMenuToggle();
    if (!isFeatureDisabled("ui.sidebar.styled")) {
      maybeSetupSidebarAccessibility();
    }
  }

  addExtensionSettings();
  await createSettingsButton();
  setupSettingsButton();
  attachNotificationsPanelAnimation();
}

type StudentPerson = {
  firstname?: string;
  surname?: string;
  house?: string;
  year?: string | number;
  house_colour?: string;
};

function createHomeButton(fragment: DocumentFragment) {
  const container = document.getElementById("content")!;
  const div = document.createElement("div");
  div.classList.add("titlebar");
  container.append(div);

  fragment.appendChild(
    stringToHTML(
      /* html */ `<li class="item" data-key="home" id="homebutton" data-path="/home" data-betterseqta="true"><label>${pageIcon("home")}<span>Home</span></label></li>`,
    ).firstChild!,
  );
}

async function handleUserInfoAndStudentData() {
  try {
    const [userInfo, studentResponse] = await Promise.all([
      getUserInfo(),
      fetch(`${location.origin}/seqta/student/load/message/people`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ mode: "student" }),
      }),
    ]);

    updateUserInfo(userInfo);
    ensureTitlebarFounderBadgeMounted();
    await updateStudentInfo((await studentResponse.json()).payload as StudentPerson[], userInfo);
  } catch (error) {
    console.error("[BetterSEQTA+] Failed to handle user info and student data:", error);
  }
}

function updateUserInfo(info: Awaited<ReturnType<typeof getUserInfo>>) {
  const titlebar = document.getElementsByClassName("titlebar")[0];
  const meta = info.meta as { code?: string | null; governmentID?: string | null } | undefined;
  const metadata = [meta?.code, meta?.governmentID]
    .filter((value): value is string => Boolean(value))
    .join(" // ");
  const displayName = info.userDesc || info.userName || "";

  titlebar.append(
    stringToHTML(/* html */ `
      <div class="userInfosvgdiv bsplus-tooltip" tabindex="0" aria-label="Account">
        ${USER_AVATAR_SVG}
        <div class="bsplus-tooltip-bubble">
          <button class="bsplus-logout" type="button" aria-label="Log out">
            ${icon(LogOut, { size: 20 })}
          </button>
        </div>
      </div>
    `).firstChild!,
  );

  titlebar.append(
    stringToHTML(/* html */ `
      <div class="userInfo">
        <div class="userInfoText">
          <div class="userInfoNameRow">
            <div class="userInfoHouseWrap">
              <p class="userInfohouse userInfoCode" style="display: none;"></p>
              <span class="bsplus-founder-badge-slot" hidden></span>
            </div>
            <div class="userInfoDetails">
              ${displayName ? `<p class="userInfoName">${displayName}</p>` : ""}
              ${metadata ? `<p class="userInfoCode">${metadata}</p>` : ""}
            </div>
          </div>
        </div>
      </div>
    `).firstChild!,
  );

  const seqtaLogout = document.querySelector<HTMLElement>(".logout");
  if (seqtaLogout) seqtaLogout.style.display = "none";
  attachTooltip(titlebar.querySelector<HTMLElement>(".bsplus-tooltip")!);
  titlebar.querySelector<HTMLElement>(".bsplus-logout")?.addEventListener("click", () => {
    document.querySelector<HTMLElement>(".logout")?.click();
  });
}

async function updateStudentInfo(
  students: StudentPerson[],
  info: Awaited<ReturnType<typeof getUserInfo>>,
) {
  const userDesc = info.userDesc ?? "";
  const index = students.findIndex(
    (person) =>
      person.firstname == userDesc.split(" ")[0] && person.surname == userDesc.split(" ")[1],
  );

  const houseelement = document.getElementsByClassName("userInfohouse")[0] as
    | HTMLElement
    | undefined;

  if (!houseelement) return;

  const student = students[index] ?? {};
  let text = "";

  if (student.house) {
    text = `${student.year ?? ""}${student.house}`;

    if (student.house_colour) {
      houseelement.style.background = student.house_colour;
      try {
        const colorresult = GetThresholdOfColor(student.house_colour);
        houseelement.style.color = colorresult && colorresult > 300 ? "black" : "white";
      } catch {
        // Invalid color format, leave text color as default
      }
    }
  } else if (student.year != null && student.year !== "") {
    text = String(student.year);
  }

  houseelement.innerText = text;
  houseelement.style.display = text ? "block" : "none";
  refreshTitlebarFounderBadge();
}

function createNewsButton(fragment: DocumentFragment, menu: HTMLElement) {
  fragment.appendChild(
    stringToHTML(
      `<li class="item" data-key="news" id="newsbutton" data-path="/news" data-betterseqta="true"><label>${pageIcon("news")}<span>News</span></label></li>`,
    ).firstChild!,
  );

  const iconCover = document.createElement("div");
  iconCover.classList.add("icon-cover");
  iconCover.id = "icon-cover";
  menu.appendChild(iconCover);
}

function setupEventListeners() {
  const menuCover = document.querySelector("#icon-cover");
  const homebutton = document.getElementById("homebutton");
  const newsbutton = document.getElementById("newsbutton");

  const activateMenuAction = (button: HTMLElement, action: () => void) => {
    if (button.classList.contains("draggable") || button.classList.contains("active")) {
      return;
    }

    action();
  };

  homebutton?.addEventListener("click", () => {
    activateMenuAction(homebutton, loadHomePage);
  });

  newsbutton?.addEventListener("click", () => {
    activateMenuAction(newsbutton, SendNewsPage);
  });

  menuCover?.addEventListener("click", () => {
    location.href = "../#?page=/home";
    loadHomePage();
    (document.getElementById("menu")!.firstChild! as HTMLElement).classList.remove("noscroll");
  });
}

async function createSettingsButton(parent?: Element) {
  if (document.getElementById("AddedSettings")) return;

  const target =
    parent ??
    document.getElementById("content") ??
    document.getElementById("container") ??
    document.body;
  target.append(
    stringToHTML(/* html */ `
      <button class="addedButton" id="AddedSettings" type="button" aria-label="BetterSEQTA+ settings">
        ${icon(Wrench)}
      </button>
    `).firstChild!,
  );
}

async function injectEngageHomeButton() {
  if (document.getElementById("homebutton")) return;

  const menuList = await waitForEngageMenuList();
  if (!menuList || document.getElementById("homebutton")) return;

  const li = stringToHTML(
    /* html */ `<li class="item" data-key="home" id="homebutton" data-path="/home" data-betterseqta="true"><label>${pageIcon("home")}<span>Home</span></label></li>`,
  ).firstChild as HTMLElement;
  menuList.insertBefore(li, menuList.firstElementChild);

  document.getElementById("homebutton")?.addEventListener("click", () => {
    const btn = document.getElementById("homebutton") as HTMLElement;
    if (btn.classList.contains("draggable") || btn.classList.contains("active")) {
      return;
    }
    window.location.replace(`${location.origin}/#?page=/home`);
    void loadEngageHomePage();
  });
}

async function getEngageUserInfo() {
  const response = await fetch(`${location.origin}/seqta/parent/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      mode: "normal",
      query: null,
      redirect_url: location.origin + "/",
    }),
  });
  return (await response.json()).payload as {
    userDesc: string | null;
    userName: string | null;
    userCode: string | null;
    email: string | null;
    type: string | null;
  };
}

async function addEngageUserInfo() {
  const content = (await waitForElm("#content")) as HTMLElement;

  let info: Awaited<ReturnType<typeof getEngageUserInfo>>;
  try {
    info = await getEngageUserInfo();
  } catch (error) {
    console.error("[BetterSEQTA+] Failed to get Engage user info:", error);
    return;
  }

  const displayName = info.userDesc || info.userName || "";
  const subText = info.userCode || info.email || "";

  const titlebar = document.createElement("div");
  titlebar.classList.add("titlebar", "engage-titlebar");

  titlebar.append(
    stringToHTML(/* html */ `
      <div class="userInfo">
        <div class="userInfoText">
          <div class="userInfoNameRow">
            <span class="bsplus-founder-badge-slot" hidden></span>
            <div class="userInfoDetails">
              ${displayName ? `<p class="userInfoName">${displayName}</p>` : ""}
              ${subText ? `<p class="userInfoCode">${subText}</p>` : ""}
            </div>
          </div>
        </div>
      </div>
    `).firstChild!,
  );

  ensureTitlebarFounderBadgeMounted();

  const iconNode = stringToHTML(/* html */ `
    <div class="userInfosvgdiv bsplus-tooltip" id="engage-logouttooltip-wrap" tabindex="0" aria-label="Account">
      ${USER_AVATAR_SVG}
      <div class="bsplus-tooltip-bubble">
        <button class="bsplus-logout" type="button" aria-label="Log out">
          ${icon(LogOut, { size: 20 })}
        </button>
      </div>
    </div>
  `).firstChild!;

  titlebar.append(iconNode);
  content.appendChild(titlebar);
  attachTooltip(iconNode as HTMLElement);

  titlebar.querySelector<HTMLElement>(".bsplus-logout")?.addEventListener("click", async () => {
    await fetch(`${location.origin}/seqta/parent/logout`, { method: "POST" });
    location.reload();
  });
}

async function mountEngageToolbarControls(parent?: Element) {
  // React can remount the notifications chrome — recreate missing controls.
  if (!document.getElementById("LightDarkModeButton")) {
    await addDarkLightToggle(parent);
  }
  if (!document.getElementById("AddedSettings")) {
    await createSettingsButton(parent);
  }
  setupSettingsButton();
  attachNotificationsPanelAnimation();
}

async function setupEngageSettingsButton() {
  let mounting = false;

  const tryMount = async () => {
    if (mounting || document.getElementById("AddedSettings")) return;
    mounting = true;
    try {
      try {
        const notificationsWrapper = await waitForElm(
          "#content > div.connectedNotificationsWrapper > div",
          true,
          100,
          40,
        );
        const parent = notificationsWrapper.parentElement!;
        await mountEngageToolbarControls(parent);
      } catch {
        await mountEngageToolbarControls();
      }
    } finally {
      mounting = false;
    }
  };

  await tryMount();

  // Re-inject if Engage's React shell wipes the toolbar controls.
  const content = document.getElementById("content");
  if (!content || (content as HTMLElement).dataset.bsplusEngageSettingsWatch === "1") {
    return;
  }
  (content as HTMLElement).dataset.bsplusEngageSettingsWatch = "1";

  let engageRemountTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedTryMount = () => {
    if (engageRemountTimer) clearTimeout(engageRemountTimer);
    engageRemountTimer = setTimeout(
      () => {
        engageRemountTimer = null;
        if (document.getElementById("AddedSettings")) return;
        void tryMount();
      },
      isPerformanceMode() ? 300 : 80,
    );
  };

  const observer = new MutationObserver(debouncedTryMount);
  observer.observe(content, { childList: true, subtree: !isPerformanceMode() });
}

function GetLightDarkModeString() {
  return settingsState.DarkMode ? "Switch to light theme" : "Switch to dark theme";
}

async function addDarkLightToggle(parent?: Element) {
  const toggleTarget = parent ?? document.getElementById("content")!;
  toggleTarget.append(
    stringToHTML(/* html */ `
      <button class="addedButton DarkLightButton" id="LightDarkModeButton" type="button" aria-label="${GetLightDarkModeString()}">
        ${icon(settingsState.DarkMode ? Sun : Moon)}
      </button>
    `).firstChild!,
  );

  updateAllColors();

  const lightDarkModeButtonElement = document.getElementById("LightDarkModeButton")!;

  ensureThemeToggleSurprisePageScript();

  lightDarkModeButtonElement.addEventListener("click", () => {
    lightDarkToggleStreak += 1;

    if (lightDarkToggleStreak >= THEME_TOGGLE_SURPRISE_TRIGGER_AT) {
      lightDarkToggleStreak = 0;
      openThemeToggleSurprise();
      return;
    }

    if (settingsState.originalDarkMode !== undefined && settingsState.selectedTheme) {
      return;
    }

    settingsState.DarkMode = !settingsState.DarkMode;
    updateAllColors();

    lightDarkModeButtonElement.innerHTML = icon(settingsState.DarkMode ? Sun : Moon);
    lightDarkModeButtonElement.setAttribute("aria-label", GetLightDarkModeString());
  });
}

function customizeMenuToggle() {
  const menuToggle = document.getElementById("menuToggle")!;
  menuToggle.innerHTML = "";

  for (let i = 0; i < 3; i++) {
    const line = document.createElement("div");
    line.className = "hamburger-line";
    menuToggle.appendChild(line);
  }
}

function maybeSetupSidebarAccessibility() {
  setupSidebarAccessibility();
}

function setupSidebarAccessibility() {
  updateSidebarAccessibility();

  const menu = document.getElementById("menu");
  if (!menu) return;

  sidebarAccessibilityObserver?.disconnect();
  const throttledA11yUpdate = rafThrottle(scheduleSidebarAccessibilityUpdate);
  sidebarAccessibilityObserver = new MutationObserver(() => {
    throttledA11yUpdate();
  });
  sidebarAccessibilityObserver.observe(menu, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  if (!sidebarAccessibilityListenersAttached) {
    document.addEventListener("keydown", handleSidebarKeyboardActivation);
    sidebarAccessibilityListenersAttached = true;
  }

  installSidebarDrillReturn(menu);
}

function scheduleSidebarAccessibilityUpdate() {
  if (sidebarTabOrderAnimationFrame !== null) {
    cancelAnimationFrame(sidebarTabOrderAnimationFrame);
  }

  // Double rAF: SEQTA applies drill state on the next frame after click.
  sidebarTabOrderAnimationFrame = requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      sidebarTabOrderAnimationFrame = null;
      updateSidebarAccessibility();
    });
  });
}

function handleSidebarKeyboardActivation(event: KeyboardEvent) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const menuItem = target.closest("#menu li, #menu section") as HTMLElement | null;
  if (!menuItem) return;

  if (event.key === "Tab") {
    if (target !== menuItem) return;
    const menu = document.getElementById("menu");
    if (!menu) return;

    const visibleList = getVisibleSidebarList(menu);
    if (!visibleList) return;

    const visibleEntries = getDirectSidebarEntries(visibleList);
    if (visibleEntries.length === 0) return;

    const boundaryEntry = event.shiftKey
      ? visibleEntries[0]
      : visibleEntries[visibleEntries.length - 1];

    if (boundaryEntry !== menuItem) return;

    const parentEntry = getSidebarListParentEntry(visibleList);
    if (!parentEntry) return;

    event.preventDefault();
    const depthBefore = getSidebarDrillDepth(menu);
    if (depthBefore > 0) {
      runSidebarDrillReturn(menu, depthBefore - 1);
    }
    parentEntry.classList.remove("active");
    scheduleSidebarAccessibilityUpdate();
    requestAnimationFrame(() => {
      parentEntry.focus();
    });
    return;
  }

  if (event.key !== "Enter" && event.key !== " ") return;

  event.preventDefault();

  const childSubmenu = menuItem.querySelector(":scope > .sub > ul") as HTMLElement | null;

  menuItem.click();
  scheduleSidebarAccessibilityUpdate();

  if (childSubmenu) {
    focusFirstSidebarSubmenuEntry(menuItem);
  }
}

/** Folder rows on the path to the currently open sidebar list. */
function getDrillFolderChain(menu: HTMLElement, visibleList: HTMLElement | null): Set<HTMLElement> {
  const chain = new Set<HTMLElement>();
  let list: HTMLElement | null = visibleList;

  while (list && menu.contains(list)) {
    const folder = getSidebarListParentEntry(list);
    if (!folder || !menu.contains(folder)) break;
    chain.add(folder);

    const containerUl = folder.parentElement;
    if (!(containerUl instanceof HTMLElement)) break;
    const parentSub = containerUl.closest(".sub");
    if (!parentSub || !menu.contains(parentSub)) break;
    const parentFolder = parentSub.parentElement;
    if (!(parentFolder instanceof HTMLElement) || !menu.contains(parentFolder)) {
      break;
    }
    chain.add(parentFolder);
    list = parentFolder.parentElement instanceof HTMLElement ? parentFolder.parentElement : null;
  }

  return chain;
}

function isSidebarEditMode(): boolean {
  const menu = document.getElementById("menu");
  return (
    document.querySelector(".editmenuoption-container") != null ||
    menu?.classList.contains("bsplus-sidebar-edit-mode") === true
  );
}

function clearSidebarAccessibilityLocks() {
  const menu = document.getElementById("menu");
  if (!menu) return;

  const entries = menu.querySelectorAll("li, section");
  for (const entry of entries) {
    if (!(entry instanceof HTMLElement)) continue;
    entry.classList.remove(BSPLUS_SIDEBAR_OFFSCREEN);
  }
}

function updateSidebarAccessibility() {
  if (isSidebarEditMode()) {
    clearSidebarAccessibilityLocks();
    return;
  }

  const menu = document.getElementById("menu");
  if (!menu) return;

  const visibleList = getVisibleSidebarList(menu);
  const visibleEntries = new Set(visibleList ? getDirectSidebarEntries(visibleList) : []);
  if (document.body?.classList.contains("icon-only-sidebar")) {
    const rootList = menu.querySelector(":scope > ul") as HTMLElement | null;
    if (rootList) getDirectSidebarEntries(rootList).forEach((entry) => visibleEntries.add(entry));
  }
  const drillFolders = getDrillFolderChain(menu, visibleList);
  const menuEntries = menu.querySelectorAll("li.item, section.item, li, section");

  for (const entry of menuEntries) {
    if (!(entry instanceof HTMLElement)) continue;

    const label = entry.querySelector(":scope > label") as HTMLLabelElement | null;
    if (!label) continue;

    const interactive = visibleEntries.has(entry) || drillFolders.has(entry);

    if (!interactive) {
      // Keep rows in normal layout — offscreen position/opacity snaps cause a
      // pop-in when drilling back to the root list. Visual hide uses translateX
      // in sidebar-animation.scss; keyboard uses tabindex only.
      entry.classList.remove(BSPLUS_SIDEBAR_OFFSCREEN);
      entry.tabIndex = -1;
      label.tabIndex = -1;
      continue;
    }

    entry.classList.remove(BSPLUS_SIDEBAR_OFFSCREEN);
    entry.tabIndex = 0;
    label.tabIndex = -1;

    if (!entry.hasAttribute("role")) {
      entry.setAttribute("role", "button");
    }

    const accessibleLabel = label.textContent?.trim();
    if (accessibleLabel) {
      entry.setAttribute("aria-label", accessibleLabel);
    }
  }
}

function getDirectSidebarEntries(list: HTMLElement) {
  return Array.from(list.querySelectorAll(":scope > li, :scope > section")).filter(
    (entry): entry is HTMLElement => entry instanceof HTMLElement,
  );
}

function getVisibleSidebarList(menu: HTMLElement) {
  let currentList = menu.querySelector(":scope > ul") as HTMLElement | null;

  while (currentList) {
    const activeSubmenuParent = currentList.querySelector(
      ":scope > li.hasChildren.active, :scope > section.hasChildren.active",
    ) as HTMLElement | null;

    if (!activeSubmenuParent) {
      return currentList;
    }

    const nextList = activeSubmenuParent.querySelector(":scope > .sub > ul") as HTMLElement | null;

    if (!nextList) {
      return currentList;
    }

    currentList = nextList;
  }

  return null;
}

function getSidebarListParentEntry(list: HTMLElement) {
  const sub = list.closest(".sub");
  return sub?.parentElement instanceof HTMLElement ? sub.parentElement : null;
}

function focusFirstSidebarSubmenuEntry(parentEntry: HTMLElement) {
  const menu = document.getElementById("menu");
  if (!menu) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!parentEntry.classList.contains("active")) return;

      const visibleList = getVisibleSidebarList(menu);
      if (!visibleList || getSidebarListParentEntry(visibleList) !== parentEntry) {
        return;
      }

      const firstEntry = getDirectSidebarEntries(visibleList).find(
        (entry) => entry.offsetParent !== null && window.getComputedStyle(entry).display !== "none",
      );

      firstEntry?.focus({ preventScroll: true });
    });
  });
}
