import { addExtensionSettings } from "@/seqta/utils/Adders/AddExtensionSettings";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import { loadHomePage } from "@/seqta/utils/Loaders/LoadHomePage";
import { SendNewsPage } from "@/seqta/utils/SendNewsPage";
import { setupSettingsButton } from "@/seqta/utils/setupSettingsButton";
import { waitForElm } from "@/seqta/utils/waitForElm";

import { GetThresholdOfColor } from "@/seqta/ui/colors/getThresholdColour";
import { appendBackgroundToUI } from "./ImageBackgrounds";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { updateAllColors } from "./colors/Manager";
import { delay } from "@/seqta/utils/delay";

let cachedUserInfo: any = null;

let LightDarkModeSnakeEggButton = 0;
let sidebarAccessibilityObserver: MutationObserver | null = null;
let sidebarTabOrderAnimationFrame: number | null = null;
let sidebarAccessibilityListenersAttached = false;

export async function getUserInfo() {
  if (cachedUserInfo) return cachedUserInfo;

  try {
    const response = await fetch(`${location.origin}/seqta/student/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        mode: "normal",
        query: null,
        redirect_url: location.origin,
      }),
    });

    cachedUserInfo = (await response.json()).payload;
    return cachedUserInfo;
  } catch (error) {
    console.error("[BetterSEQTA+] Failed to get user info:", error);
    throw error;
  }
}

export async function AddBetterSEQTAElements() {
  if (isSeqtaEngageExperience()) {
    await waitForElm("#content");
    addExtensionSettings();
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

    createHomeButton(fragment, menuList);
    createNewsButton(fragment, menu);

    menuList.insertBefore(fragment, menuList.firstChild);

    try {
      await Promise.all([
        appendBackgroundToUI(),
        handleUserInfo(),
        handleStudentData(),
      ]);
    } catch (error) {
      console.error("[BetterSEQTA+] Failed to initialize UI elements:", error);
    }

    setupEventListeners();
    await addDarkLightToggle();
    customizeMenuToggle();
    setupSidebarAccessibility();
  }

  addExtensionSettings();
  await createSettingsButton();
  setupSettingsButton();
}

function createHomeButton(fragment: DocumentFragment, _: HTMLElement) {
  const container = document.getElementById("content")!;
  const div = document.createElement("div");
  div.classList.add("titlebar");
  container.append(div);

  fragment.appendChild(
    stringToHTML(
      /* html */ `<li class="item" data-key="home" id="homebutton" data-path="/home" data-betterseqta="true"><label><svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" /></svg><span>Home</span></label></li>`,
    ).firstChild!,
  );
}

async function handleUserInfo() {
  try {
    updateUserInfo(await getUserInfo());
  } catch (error) {
    console.error("[BetterSEQTA+] Failed to handle user info:", error);
  }
}

function updateUserInfo(info: {
  basic: boolean;
  clientIP: string[] | null;
  email: string | null;
  id: number | null;
  lastAccessedTime: number | null;
  meta: {
    code: string | null;
    governmentID: string | null;
  };
  personUUID: string | null;
  status: number | null;
  synergeticCommunityUrl: string | null;
  type: string | null;
  userCode: string | null;
  userDesc: string | null;
  userName: string | null;
}) {
  const titlebar = document.getElementsByClassName("titlebar")[0];
  const metadata = [info.meta.code, info.meta.governmentID]
    .filter((value): value is string => Boolean(value))
    .join(" // ");
  const displayName = info.userDesc || info.userName || "";

  titlebar.append(
    stringToHTML(/* html */ `
      <div class="userInfosvgdiv tooltip">
        <svg class="userInfosvg" viewBox="0 0 24 24"><path fill="var(--text-primary)" d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z"></path></svg>
        <div class="tooltiptext topmenutooltip" id="logouttooltip"></div>
      </div>
    `).firstChild!,
  );

  titlebar.append(
    stringToHTML(/* html */ `
      <div class="userInfo">
        <div class="userInfoText">
          <div style="display: flex; align-items: center;">
            <p class="userInfohouse userInfoCode" style="display: none;"></p>
            ${displayName ? `<p class="userInfoName">${displayName}</p>` : ""}
          </div>
          ${metadata ? `<p class="userInfoCode">${metadata}</p>` : ""}
        </div>
      </div>
    `).firstChild!,
  );

  document
    .getElementById("logouttooltip")!
    .appendChild(document.getElementsByClassName("logout")[0]);
}

async function handleStudentData() {
  try {
    const response = await fetch(
      `${location.origin}/seqta/student/load/message/people`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ mode: "student" }),
      },
    );

    await updateStudentInfo((await response.json()).payload);
  } catch (error) {
    console.error("[BetterSEQTA+] Failed to handle student data:", error);
  }
}

async function updateStudentInfo(students: any) {
  const info = await getUserInfo();
  const index = students.findIndex(
    (person: any) =>
      person.firstname == info.userDesc.split(" ")[0] &&
      person.surname == info.userDesc.split(" ")[1],
  );

  const houseelement = document.getElementsByClassName(
    "userInfohouse",
  )[0] as HTMLElement | undefined;

  if (!houseelement) return;

  const student = students[index] ?? {};
  let text = "";

  if (student.house) {
    text = `${student.year ?? ""}${student.house}`;

    if (student.house_colour) {
      houseelement.style.background = student.house_colour;
      try {
        const colorresult = GetThresholdOfColor(student.house_colour);
        houseelement.style.color =
          colorresult && colorresult > 300 ? "black" : "white";
      } catch {
        // Invalid color format, leave text color as default
      }
    }
  } else if (student.year) {
    text = student.year;
  }

  houseelement.innerText = text;
  houseelement.style.display = text ? "block" : "none";
}

function createNewsButton(fragment: DocumentFragment, menu: HTMLElement) {
  fragment.appendChild(
    stringToHTML(
      '<li class="item" data-key="news" id="newsbutton" data-path="/news" data-betterseqta="true"><label><svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M20 3H4C2.89 3 2 3.89 2 5V19C2 20.11 2.89 21 4 21H20C21.11 21 22 20.11 22 19V5C22 3.89 21.11 3 20 3M5 7H10V13H5V7M19 17H5V15H19V17M19 13H12V11H19V13M19 9H12V7H19V9Z" /></svg><span>News</span></label></li>',
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
    if (
      button.classList.contains("draggable") ||
      button.classList.contains("active")
    ) {
      return;
    }

    action();
  };

  homebutton?.addEventListener("click", function () {
    activateMenuAction(homebutton, () => {
      loadHomePage();
    });
  });

  newsbutton?.addEventListener("click", function () {
    activateMenuAction(newsbutton, () => {
      SendNewsPage();
    });
  });

  menuCover?.addEventListener("click", function () {
    location.href = "../#?page=/home";
    loadHomePage();
    (
      document.getElementById("menu")!.firstChild! as HTMLElement
    ).classList.remove("noscroll");
  });
}

async function createSettingsButton(parent?: Element) {
  const target = parent ?? document.getElementById("content")!;
  target.append(
    stringToHTML(/* html */ `
      <button class="addedButton tooltip" id="AddedSettings">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <g><g><path d="M23.182,6.923c-.29,0-3.662,2.122-4.142,2.4l-2.8-1.555V4.511l4.257-2.456a.518.518,0,0,0,.233-.408.479.479,0,0,0-.233-.407,6.511,6.511,0,1,0-3.327,12.107,6.582,6.582,0,0,0,6.148-4.374,5.228,5.228,0,0,0,.333-1.542A.461.461,0,0,0,23.182,6.923Z"></path><path d="M9.73,10.418,7.376,12.883c-.01.01-.021.016-.03.025L1.158,19.1a2.682,2.682,0,1,0,3.793,3.793l4.583-4.582,0,0,4.1-4.005-.037-.037A9.094,9.094,0,0,1,9.73,10.418ZM3.053,21.888A.894.894,0,1,1,3.946,21,.893.893,0,0,1,3.053,21.888Z"></path></g></g>
        </svg>
        ${settingsState.onoff ? '<div class="tooltiptext topmenutooltip">BetterSEQTA+ Settings</div>' : ""}
      </button>
    `).firstChild!,
  );
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
  const content = await waitForElm("#content") as HTMLElement;

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
          ${displayName ? `<p class="userInfoName">${displayName}</p>` : ""}
          ${subText ? `<p class="userInfoCode">${subText}</p>` : ""}
        </div>
      </div>
    `).firstChild!,
  );

  const iconNode = stringToHTML(/* html */ `
    <div class="userInfosvgdiv tooltip" id="engage-logouttooltip-wrap">
      <svg class="userInfosvg" viewBox="0 0 24 24"><path fill="var(--text-primary)" d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z"></path></svg>
      <div class="tooltiptext topmenutooltip" id="engage-logouttooltip">
        <button class="logout engage-logout">
          <svg style="width:20px;height:20px;vertical-align:middle;" viewBox="0 0 24 24"><path fill="currentColor" d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.58L17 17L22 12M4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z"/></svg>
        </button>
      </div>
    </div>
  `).firstChild!;

  titlebar.append(iconNode);
  content.appendChild(titlebar);

  titlebar.querySelector<HTMLElement>(".engage-logout")?.addEventListener("click", async () => {
    await fetch(`${location.origin}/seqta/parent/logout`, { method: "POST" });
    location.reload();
  });
}

async function setupEngageSettingsButton() {
  try {
    const notificationsWrapper = await waitForElm(
      "#content > div.connectedNotificationsWrapper > div",
    );
    const parent = notificationsWrapper.parentElement!;
    await addDarkLightToggle(parent);
    await createSettingsButton(parent);
    setupSettingsButton();
  } catch {
    await addDarkLightToggle();
    await createSettingsButton();
    setupSettingsButton();
  }
}

function GetLightDarkModeString() {
  return settingsState.DarkMode
    ? "Switch to light theme"
    : "Switch to dark theme";
}

async function addDarkLightToggle(parent?: Element) {
  const SUN_ICON_SVG = /* html */ `<defs><clipPath id="__lottie_element_80"><rect width="24" height="24" x="0" y="0"></rect></clipPath></defs><g clip-path="url(#__lottie_element_80)"><g style="display: block;" transform="matrix(1,0,0,1,12,12)" opacity="1"><g opacity="1" transform="matrix(1,0,0,1,0,0)"><path fill-opacity="1" d=" M0,-4 C-2.2100000381469727,-4 -4,-2.2100000381469727 -4,0 C-4,2.2100000381469727 -2.2100000381469727,4 0,4 C2.2100000381469727,4 4,2.2100000381469727 4,0 C4,-2.2100000381469727 2.2100000381469727,-4 0,-4z"></path></g></g><g style="display: block;" transform="matrix(1,0,0,1,12,12)" opacity="1"><g opacity="1" transform="matrix(1,0,0,1,0,0)"><path fill-opacity="1" d=" M0,6 C-3.309999942779541,6 -6,3.309999942779541 -6,0 C-6,-3.309999942779541 -3.309999942779541,-6 0,-6 C3.309999942779541,-6 6,-3.309999942779541 6,0 C6,3.309999942779541 3.309999942779541,6 0,6z M8,-3.309999942779541 C8,-3.309999942779541 8,-8 8,-8 C8,-8 3.309999942779541,-8 3.309999942779541,-8 C3.309999942779541,-8 0,-11.3100004196167 0,-11.3100004196167 C0,-11.3100004196167 -3.309999942779541,-8 -3.309999942779541,-8 C-3.309999942779541,-8 -8,-8 -8,-8 C-8,-8 -8,-3.309999942779541 -8,-3.309999942779541 C-8,-3.309999942779541 -11.3100004196167,0 -11.3100004196167,0 C-11.3100004196167,0 -8,3.309999942779541 -8,3.309999942779541 C-8,3.309999942779541 -8,8 -8,8 C-8,8 -3.309999942779541,8 -3.309999942779541,8 C-3.309999942779541,8 0,11.3100004196167 0,11.3100004196167 C0,11.3100004196167 3.309999942779541,8 3.309999942779541,8 C3.309999942779541,8 8,8 8,8 C8,8 8,3.309999942779541 8,3.309999942779541 C8,3.309999942779541 11.3100004196167,0 11.3100004196167,0 C11.3100004196167,0 8,-3.309999942779541 8,-3.309999942779541z"></path></g></g></g>`;
  const MOON_ICON_SVG = /* html */ `<defs><clipPath id="__lottie_element_263"><rect width="24" height="24" x="0" y="0"></rect></clipPath></defs><g clip-path="url(#__lottie_element_263)"><g style="display: block;" transform="matrix(1.5,0,0,1.5,7,12)" opacity="1"><g opacity="1" transform="matrix(1,0,0,1,0,0)"><path fill-opacity="1" d=" M0,-4 C-2.2100000381469727,-4 -1.2920000553131104,-2.2100000381469727 -1.2920000553131104,0 C-1.2920000553131104,2.2100000381469727 -2.2100000381469727,4 0,4 C2.2100000381469727,4 4,2.2100000381469727 4,0 C4,-2.2100000381469727 2.2100000381469727,-4 0,-4z"></path></g></g><g style="display: block;" transform="matrix(-1,0,0,-1,12,12)" opacity="1"><g opacity="1" transform="matrix(1,0,0,1,0,0)"><path fill-opacity="1" d=" M0,6 C-3.309999942779541,6 -6,3.309999942779541 -6,0 C-6,-3.309999942779541 -3.309999942779541,-6 0,-6 C3.309999942779541,-6 6,-3.309999942779541 6,0 C6,3.309999942779541 3.309999942779541,6 0,6z M8,-3.309999942779541 C8,-3.309999942779541 8,-8 8,-8 C8,-8 3.309999942779541,-8 3.309999942779541,-8 C3.309999942779541,-8 0,-11.3100004196167 0,-11.3100004196167 C0,-11.3100004196167 -3.309999942779541,-8 -3.309999942779541,-8 C-3.309999942779541,-8 -8,-8 -8,-8 C-8,-8 -8,-3.309999942779541 -8,-3.309999942779541 C-8,-3.309999942779541 -11.3100004196167,0 -11.3100004196167,0 C-11.3100004196167,0 -8,3.309999942779541 -8,3.309999942779541 C-8,3.309999942779541 -8,8 -8,8 C-8,8 -3.309999942779541,8 -3.309999942779541,8 C-3.309999942779541,8 0,11.3100004196167 0,11.3100004196167 C0,11.3100004196167 3.309999942779541,8 3.309999942779541,8 C3.309999942779541,8 8,8 8,8 C8,8 8,3.309999942779541 8,3.309999942779541 C8,3.309999942779541 11.3100004196167,0 11.3100004196167,0 C11.3100004196167,0 8,-3.309999942779541 8,-3.309999942779541z"></path></g></g></g>`;

  const toggleTarget = parent ?? document.getElementById("content")!;
  toggleTarget.append(
    stringToHTML(/* html */ `
      <button class="addedButton DarkLightButton tooltip" id="LightDarkModeButton">
        <svg xmlns="http://www.w3.org/2000/svg">${settingsState.DarkMode ? SUN_ICON_SVG : MOON_ICON_SVG}</svg>
        <div class="tooltiptext topmenutooltip" id="darklighttooliptext">${GetLightDarkModeString()}</div>
      </button>
    `).firstChild!,
  );

  updateAllColors();

  const lightDarkModeButtonElement = document.getElementById(
    "LightDarkModeButton",
  )!;

  lightDarkModeButtonElement.addEventListener("click", async () => {
    const darklightText = document.getElementById("darklighttooliptext");

    LightDarkModeSnakeEggButton += 1;

    if (LightDarkModeSnakeEggButton >= 10) {
      window.open("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "_blank");
      LightDarkModeSnakeEggButton = 0;
    }

    if (
      settingsState.originalDarkMode !== undefined &&
      settingsState.selectedTheme
    ) {
      darklightText!.innerText = "Locked by current theme";
      await delay(1000);
      darklightText!.innerText = GetLightDarkModeString();
      return;
    }

    settingsState.DarkMode = !settingsState.DarkMode;
    updateAllColors();

    const svgElement = lightDarkModeButtonElement.querySelector("svg")!;
    svgElement.innerHTML = settingsState.DarkMode
      ? SUN_ICON_SVG
      : MOON_ICON_SVG;
    darklightText!.innerText = GetLightDarkModeString();
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

function setupSidebarAccessibility() {
  updateSidebarAccessibility();

  const menu = document.getElementById("menu");
  if (!menu) return;

  sidebarAccessibilityObserver?.disconnect();
  sidebarAccessibilityObserver = new MutationObserver(() => {
    scheduleSidebarAccessibilityUpdate();
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
}

function scheduleSidebarAccessibilityUpdate() {
  if (sidebarTabOrderAnimationFrame !== null) {
    cancelAnimationFrame(sidebarTabOrderAnimationFrame);
  }

  sidebarTabOrderAnimationFrame = requestAnimationFrame(() => {
    sidebarTabOrderAnimationFrame = null;
    updateSidebarAccessibility();
  });
}

function handleSidebarKeyboardActivation(event: KeyboardEvent) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const menuItem = target.closest("#menu li, #menu section") as
    | HTMLElement
    | null;
  if (!menuItem || target !== menuItem) return;

  if (event.key === "Tab") {
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
    parentEntry.classList.remove("active");
    scheduleSidebarAccessibilityUpdate();
    requestAnimationFrame(() => {
      parentEntry.focus();
    });
    return;
  }

  if (event.key !== "Enter" && event.key !== " ") return;

  event.preventDefault();

  const childSubmenu = menuItem.querySelector(":scope > .sub > ul") as
    | HTMLElement
    | null;

  menuItem.click();
  scheduleSidebarAccessibilityUpdate();

  if (childSubmenu) {
    focusFirstSidebarSubmenuEntry(menuItem);
  }
}

function updateSidebarAccessibility() {
  const menu = document.getElementById("menu");
  if (!menu) return;

  const visibleEntries = new Set(getVisibleSidebarEntries(menu));
  const menuEntries = menu.querySelectorAll("li.item, section.item, li, section");

  for (const entry of menuEntries) {
    if (!(entry instanceof HTMLElement)) continue;

    const label = entry.querySelector(":scope > label") as HTMLLabelElement | null;
    if (!label) continue;

    const childSubmenu = entry.querySelector(":scope > .sub") as HTMLElement | null;
    const isHidden =
      entry.offsetParent === null ||
      window.getComputedStyle(entry).display === "none" ||
      window.getComputedStyle(label).display === "none" ||
      !visibleEntries.has(entry);

    if (isHidden) {
      entry.tabIndex = -1;
      label.tabIndex = -1;
      entry.setAttribute("aria-hidden", "true");
      label.setAttribute("aria-hidden", "true");
      if (childSubmenu) {
        childSubmenu.setAttribute("aria-hidden", "true");
      }
      continue;
    }

    entry.tabIndex = 0;
    label.tabIndex = -1;
    entry.removeAttribute("aria-hidden");
    label.removeAttribute("aria-hidden");

    if (!entry.hasAttribute("role")) {
      entry.setAttribute("role", "button");
    }

    const accessibleLabel = label.textContent?.trim();
    if (accessibleLabel) {
      entry.setAttribute("aria-label", accessibleLabel);
    }

    if (childSubmenu) {
      const isExpanded = entry.classList.contains("active");
      entry.setAttribute("aria-expanded", String(isExpanded));
      childSubmenu.setAttribute("aria-hidden", String(!isExpanded));
    } else {
      entry.removeAttribute("aria-expanded");
    }
  }
}

function getVisibleSidebarEntries(menu = document.getElementById("menu")) {
  if (!menu) return [] as HTMLElement[];

  const visibleList = getVisibleSidebarList(menu);
  if (!visibleList) return [] as HTMLElement[];

  return getDirectSidebarEntries(visibleList);
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

    const nextList = activeSubmenuParent.querySelector(
      ":scope > .sub > ul",
    ) as HTMLElement | null;

    if (!nextList) {
      return currentList;
    }

    currentList = nextList;
  }

  return null;
}

function getSidebarListParentEntry(list: HTMLElement) {
  return list.closest(".sub")?.parentElement instanceof HTMLElement
    ? (list.closest(".sub")!.parentElement as HTMLElement)
    : null;
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
        (entry) =>
          entry.offsetParent !== null &&
          window.getComputedStyle(entry).display !== "none",
      );

      firstEntry?.focus({ preventScroll: true });
    });
  });
}
