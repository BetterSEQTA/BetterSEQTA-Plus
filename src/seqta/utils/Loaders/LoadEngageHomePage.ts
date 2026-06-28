import LogoLight from "@/resources/icons/betterseqta-light-icon.png";
import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";
import { convertTo12HourFormat } from "@/seqta/utils/convertTo12HourFormat";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { renderShortcuts } from "@/seqta/utils/Render/renderShortcuts";
import { lessonsSubtitleForViewDate } from "@/seqta/utils/Loaders/timetableSubtitle";
import {
  type EngageParentChild,
  type EngageParentTimetableItem,
  fetchEngageParentChildren,
  fetchEngageParentTimetableWeek,
  isDateInCachedWeek,
  toISODate,
  weekRangeContaining,
} from "@/seqta/utils/Loaders/engageParentTimetable";
import { resolveNoticeFilterTokens } from "@/seqta/utils/notices/noticeLabelFilters";
import { setupNoticesSection } from "@/seqta/utils/notices/noticeHomeUi";

export function updateEngageHomeMenuActive(isHome: boolean): void {
  const home = document.getElementById("homebutton");
  if (!home) return;
  if (isHome) {
    for (const el of document.querySelectorAll("#menu li.active")) {
      if (el !== home) el.classList.remove("active");
    }
    home.classList.add("active");
  } else {
    home.classList.remove("active");
  }
}

const STORAGE_KEY_STUDENT = () =>
  `bsplus.engageTimetable.student.${location.origin}`;

let engageViewDate = new Date();
let engageWeekFrom = "";
let engageWeekUntil = "";
let engageWeekItems: EngageParentTimetableItem[] = [];
let engageSelectedStudentId: string | null = null;
let engageListenersCleanup: (() => void) | null = null;

function setEngageTimetableSubtitle(): void {
  const el = document.getElementById("engage-home-lesson-subtitle");
  if (!el) return;
  el.textContent = lessonsSubtitleForViewDate(engageViewDate);
}

function makeEngageLessonDiv(
  lesson: EngageParentTimetableItem,
  index: number,
): HTMLElement {
  let from = lesson.from?.substring(0, 5) ?? "";
  let until = lesson.until?.substring(0, 5) ?? "";
  if (settingsState.timeFormat === "12") {
    from = convertTo12HourFormat(from);
    until = convertTo12HourFormat(until);
  }

  const title =
    lesson.type === "class"
      ? lesson.description
      : lesson.type || "Lesson";

  const div = document.createElement("div");
  div.className = "day";
  div.id = `engage-lesson-${lesson.code}-${index}`;
  div.style.cssText = "--item-colour: #8e8e8e;";

  const h2 = document.createElement("h2");
  h2.textContent = title;

  const hStaff = document.createElement("h3");
  hStaff.textContent = lesson.staff?.trim() || "—";

  const hRoom = document.createElement("h3");
  hRoom.textContent = lesson.room?.trim() || "—";

  const hTime = document.createElement("h4");
  hTime.textContent = `${from} – ${until}`;

  const hPeriod = document.createElement("h5");
  hPeriod.textContent = lesson.period?.trim() || "";

  div.append(h2, hStaff, hRoom, hTime, hPeriod);
  return div;
}

function renderEngageDayLessons(): void {
  const dayContainer = document.getElementById("engage-day-container");
  if (!dayContainer) return;

  const dayStr = toISODate(engageViewDate);
  const lessons = engageWeekItems
    .filter((item) => item.date === dayStr)
    .sort((a, b) => a.from.localeCompare(b.from));

  dayContainer.innerHTML = "";

  if (lessons.length === 0) {
    dayContainer.innerHTML = `
      <div class="day-empty">
        <img src="${resolveExtensionAssetUrl(LogoLight)}" alt="" />
        <p>No lessons for this day.</p>
      </div>`;
  } else {
    lessons.forEach((lesson, i) => {
      dayContainer.appendChild(makeEngageLessonDiv(lesson, i));
    });
  }

  dayContainer.classList.remove("loading");
  setEngageTimetableSubtitle();
}

async function fetchWeekAndRender(): Promise<void> {
  const dayContainer = document.getElementById("engage-day-container");
  if (!dayContainer || !engageSelectedStudentId) return;

  dayContainer.classList.add("loading");
  dayContainer.innerHTML = "";

  const { from, until } = weekRangeContaining(engageViewDate);
  try {
    engageWeekItems = await fetchEngageParentTimetableWeek(
      from,
      until,
      engageSelectedStudentId,
    );
    engageWeekFrom = from;
    engageWeekUntil = until;
  } catch (e) {
    console.error("[BetterSEQTA+] Engage parent timetable failed:", e);
    engageWeekItems = [];
    engageWeekFrom = from;
    engageWeekUntil = until;
  }

  renderEngageDayLessons();
}

function shiftEngageDay(delta: number): void {
  const next = new Date(engageViewDate);
  next.setDate(next.getDate() + delta);
  engageViewDate = next;

  const dayContainer = document.getElementById("engage-day-container");
  dayContainer?.classList.add("loading");
  dayContainer && (dayContainer.innerHTML = "");

  if (
    engageWeekFrom &&
    engageWeekUntil &&
    isDateInCachedWeek(engageViewDate, engageWeekFrom, engageWeekUntil)
  ) {
    renderEngageDayLessons();
  } else {
    void fetchWeekAndRender();
  }
}

function populateChildSelector(
  select: HTMLSelectElement,
  children: EngageParentChild[],
): void {
  select.innerHTML = "";
  for (const c of children) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name || `Student ${c.id}`;
    select.appendChild(opt);
  }

  const stored = localStorage.getItem(STORAGE_KEY_STUDENT());
  const validStored = stored && children.some((c) => c.id === stored);
  engageSelectedStudentId = validStored
    ? stored!
    : children[0]?.id ?? null;

  if (engageSelectedStudentId) {
    select.value = engageSelectedStudentId;
    localStorage.setItem(STORAGE_KEY_STUDENT(), engageSelectedStudentId);
  }
}

function bindEngageTimetableUi(): void {
  engageListenersCleanup?.();
  const cleanups: Array<() => void> = [];

  const back = document.getElementById("engage-home-timetable-back");
  const forward = document.getElementById("engage-home-timetable-forward");
  const select = document.getElementById(
    "engage-child-selector",
  ) as HTMLSelectElement | null;

  const onBack = () => shiftEngageDay(-1);
  const onForward = () => shiftEngageDay(1);

  back?.addEventListener("click", onBack);
  forward?.addEventListener("click", onForward);
  cleanups.push(
    () => back?.removeEventListener("click", onBack),
    () => forward?.removeEventListener("click", onForward),
  );

  const onSelectChange = () => {
    if (!select) return;
    engageSelectedStudentId = select.value;
    localStorage.setItem(STORAGE_KEY_STUDENT(), engageSelectedStudentId);
    void fetchWeekAndRender();
  };
  select?.addEventListener("change", onSelectChange);
  cleanups.push(() =>
    select?.removeEventListener("change", onSelectChange),
  );

  engageListenersCleanup = () => {
    cleanups.forEach((fn) => fn());
    engageListenersCleanup = null;
  };
}

const ENGAGE_NOTICE_CONTAINER_ID = "engage-notice-container";
const ENGAGE_NOTICES_DATE_ID = "engage-notices-date";

async function initEngageNoticesUi(todayFormatted: string): Promise<void> {
  const noticeContainer = document.getElementById(ENGAGE_NOTICE_CONTAINER_ID);
  if (!noticeContainer) return;

  let prefsPayload: unknown = [];
  try {
    const prefsRes = await fetch(`${location.origin}/seqta/parent/load/prefs?`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      credentials: "include",
      body: JSON.stringify({ asArray: true, request: "userPrefs" }),
    });
    const prefs = await prefsRes.json();
    prefsPayload = prefs?.payload ?? [];
  } catch {
    prefsPayload = [];
  }

  const labelTokens = await resolveNoticeFilterTokens(
    prefsPayload,
    `${location.origin}/seqta/parent/load/notices`,
  );

  const cleanup = setupNoticesSection({
    containerId: ENGAGE_NOTICE_CONTAINER_ID,
    dateInput: `#${ENGAGE_NOTICES_DATE_ID}`,
    noticesUrl: `${location.origin}/seqta/parent/load/notices`,
    labelTokens,
    initialDate: todayFormatted,
  });
  engageMergeNoticeCleanup(cleanup);
}

function engageMergeNoticeCleanup(noticeCleanup: () => void): void {
  const prev = engageListenersCleanup;
  engageListenersCleanup = () => {
    prev?.();
    noticeCleanup();
  };
}

function showEngageTimetableError(message: string): void {
  const dayContainer = document.getElementById("engage-day-container");
  if (!dayContainer) return;
  dayContainer.classList.remove("loading");
  dayContainer.innerHTML = `
    <div class="day-empty">
      <img src="${resolveExtensionAssetUrl(LogoLight)}" alt="" />
      <p>${message}</p>
    </div>`;
}

function showEngageNoticesSectionError(message: string): void {
  const noticeContainer = document.getElementById(ENGAGE_NOTICE_CONTAINER_ID);
  if (!noticeContainer) return;
  noticeContainer.classList.remove("loading");
  noticeContainer.innerHTML = `
    <div class="day-empty">
      <img src="${resolveExtensionAssetUrl(LogoLight)}" alt="" />
      <p>${message}</p>
    </div>`;
}

/** SEQTA Engage parent home: child timetable (today view) using parent APIs. */
export async function loadEngageHomePage(): Promise<void> {
  updateEngageHomeMenuActive(true);
  document.title = "Home ― SEQTA Engage";

  let main: HTMLElement;
  try {
    /* Engage mounts `#main` after React hydrates; a single rAF often loses the race on cold load. */
    main = (await waitForElm("#main", true, 100, 200)) as HTMLElement;
  } catch {
    console.warn(
      "[BetterSEQTA+] Engage home: timed out waiting for #main (shell not ready).",
    );
    return;
  }

  engageListenersCleanup?.();
  engageViewDate = new Date();

  main.innerHTML = "";
  /* `stringToHTML` returns `document.body`; use firstElementChild so we don't append a whitespace text node (which would drop #engage-home-container and break queries). */
  const engageHomeBody = stringToHTML(/* html */ `
      <div class="home-root" id="engage-home-root">
        <div class="home-container" id="engage-home-container">
          <div class="border shortcut-container">
            <div class="border shortcuts" id="shortcuts"></div>
          </div>
          <div class="border timetable-container">
            <div class="home-subtitle">
              <div class="engage-timetable-title-cluster">
                <h2 id="engage-home-lesson-subtitle">Today's Lessons</h2>
                <select id="engage-child-selector" class="engage-child-select" aria-label="Student"></select>
              </div>
              <div class="timetable-arrows">
                <svg width="24" height="24" viewBox="0 0 24 24" style="transform: scale(-1,1)" id="engage-home-timetable-back">
                  <g style="fill: currentcolor;"><path d="M8.578 16.359l4.594-4.594-4.594-4.594 1.406-1.406 6 6-6 6z"></path></g>
                </svg>
                <svg width="24" height="24" viewBox="0 0 24 24" id="engage-home-timetable-forward">
                  <g style="fill: currentcolor;"><path d="M8.578 16.359l4.594-4.594-4.594-4.594 1.406-1.406 6 6-6 6z"></path></g>
                </svg>
              </div>
            </div>
            <div class="day-container loading" id="engage-day-container"></div>
          </div>
          <div class="border notices-container">
            <div style="display: flex; justify-content: space-between">
              <h2 class="home-subtitle">Notices</h2>
              <input type="date" id="engage-notices-date" />
            </div>
            <div class="notice-container upcoming-items loading" id="engage-notice-container"></div>
          </div>
        </div>
      </div>
    `);
  const engageHomeRoot = engageHomeBody.firstElementChild as HTMLElement | null;
  if (engageHomeRoot) {
    main.appendChild(engageHomeRoot);
  } else {
    console.error(
      "[BetterSEQTA+] Engage home: parsed markup had no root element (check DOMPurify / stringToHTML).",
    );
    return;
  }

  bindEngageTimetableUi();
  setEngageTimetableSubtitle();
  renderShortcuts();

  const select = document.getElementById(
    "engage-child-selector",
  ) as HTMLSelectElement | null;

  const todayFormatted = toISODate(new Date());

  let children: EngageParentChild[];
  try {
    try {
      children = await fetchEngageParentChildren();
    } catch (e) {
      console.error("[BetterSEQTA+] Engage parent child list failed:", e);
      showEngageTimetableError("Could not load students for this account.");
      return;
    }

    if (!select) {
      showEngageTimetableError("Could not initialize the home view.");
      showEngageNoticesSectionError("Could not initialize notices.");
      return;
    }

    if (children.length === 0) {
      select.disabled = true;
      showEngageTimetableError("No linked students found.");
      return;
    }

    populateChildSelector(select, children);

    if (!engageSelectedStudentId) {
      showEngageTimetableError("No student selected.");
      return;
    }

    await fetchWeekAndRender();
  } finally {
    await initEngageNoticesUi(todayFormatted);
  }
}
