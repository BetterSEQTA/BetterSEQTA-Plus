import { animate } from "motion";
import browser from "webextension-polyfill";
import LogoLight from "@/resources/icons/betterseqta-light-icon.png";
import { GetThresholdOfColor } from "@/seqta/ui/colors/getThresholdColour";
import { convertTo12HourFormat } from "@/seqta/utils/convertTo12HourFormat";
import debounce from "@/seqta/utils/debounce";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { getMockNotices } from "@/seqta/ui/dev/hideSensitiveContent";
import {
  type EngageParentChild,
  type EngageParentTimetableItem,
  fetchEngageParentChildren,
  fetchEngageParentTimetableWeek,
  isDateInCachedWeek,
  toISODate,
  weekRangeContaining,
} from "@/seqta/utils/Loaders/engageParentTimetable";

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

function formatDateString(date: Date): string {
  return `${date.toLocaleString("en-us", { weekday: "short" })} ${date.toLocaleDateString("en-au")}`;
}

function setEngageTimetableSubtitle(): void {
  const el = document.getElementById("engage-home-lesson-subtitle");
  if (!el) return;

  const today = new Date();
  const isSameMonth =
    today.getFullYear() === engageViewDate.getFullYear() &&
    today.getMonth() === engageViewDate.getMonth();

  if (isSameMonth) {
    const dayDiff = today.getDate() - engageViewDate.getDate();
    switch (dayDiff) {
      case 0:
        el.textContent = "Today's Lessons";
        break;
      case 1:
        el.textContent = "Yesterday's Lessons";
        break;
      case -1:
        el.textContent = "Tomorrow's Lessons";
        break;
      default:
        el.textContent = formatDateString(engageViewDate);
    }
  } else {
    el.textContent = formatDateString(engageViewDate);
  }
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
        <img src="${browser.runtime.getURL(LogoLight)}" alt="" />
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

/* ——— Notices (duplicated from Learn `LoadHomePage`; fetch uses `/seqta/parent/load/notices`.) ——— */

const ENGAGE_NOTICE_CONTAINER_ID = "engage-notice-container";
const ENGAGE_NOTICES_DATE_ID = "engage-notices-date";

function processEngageNoticeColor(colour: unknown): string | undefined {
  if (typeof colour !== "string") return undefined;
  const rgb = GetThresholdOfColor(colour);
  if (rgb < 100 && settingsState.DarkMode) {
    return undefined;
  }
  return colour;
}

function processEngageNotices(response: any, labelArray: string[]): void {
  const noticeContainer = document.getElementById(ENGAGE_NOTICE_CONTAINER_ID);
  if (!noticeContainer) return;

  noticeContainer.innerHTML = "";

  const notices = response?.payload;
  if (!Array.isArray(notices)) {
    const emptyState = document.createElement("div");
    emptyState.classList.add("day-empty");
    const img = document.createElement("img");
    img.src = browser.runtime.getURL(LogoLight);
    const text = document.createElement("p");
    text.innerText = "No notices for today.";
    emptyState.append(img, text);
    noticeContainer.append(emptyState);
    return;
  }

  if (!notices.length) {
    const emptyState = document.createElement("div");
    emptyState.classList.add("day-empty");
    const img = document.createElement("img");
    img.src = browser.runtime.getURL(LogoLight);
    const text = document.createElement("p");
    text.innerText = "No notices for today.";
    emptyState.append(img, text);
    noticeContainer.append(emptyState);
    return;
  }

  const fragment = document.createDocumentFragment();

  notices.forEach((notice: any) => {
    const shouldInclude =
      settingsState.mockNotices ||
      labelArray.length === 0 ||
      labelArray.includes(JSON.stringify(notice.label));

    if (shouldInclude) {
      const colour = processEngageNoticeColor(notice.colour);
      const noticeElement = createEngageNoticeElement(notice, colour);
      fragment.appendChild(noticeElement);
    }
  });

  noticeContainer.appendChild(fragment);
}

function createEngageNoticeElement(
  notice: any,
  colour: string | undefined,
): Node {
  const textPreview =
    notice.contents
      .replace(/<[^>]*>/g, "")
      .replace(/\[\[[\w]+[:][\w]+[\]\]]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 150) + (notice.contents.length > 150 ? "..." : "");

  const noticeId = `notice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const htmlContent = `
    <div class="notice-unified-content notice-card-state" data-notice-id="${noticeId}" style="--colour: ${colour || "#8e8e8e"}; position: relative; background: var(--background-primary); cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.1);">
      <div class="notice-header">
        <div class="notice-badge-row">
          <span class="notice-badge" style="background: linear-gradient(135deg, ${colour || "#8e8e8e"}, ${colour || "#8e8e8e"}dd); color: white;">
            ${notice.label_title || "General"}
          </span>
          <span class="notice-staff">${notice.staff}</span>
        </div>
        <button class="notice-close-btn" style="opacity: 0; pointer-events: none;">&times;</button>
      </div>
      <h2 class="notice-content-title">${notice.title}</h2>
      <div class="notice-content-body">${textPreview}</div>
    </div>`;

  const element = stringToHTML(htmlContent).firstChild as HTMLElement;
  element.addEventListener("click", () =>
    openEngageNoticeModal(notice, colour, element),
  );
  return element;
}

function openEngageNoticeModal(
  notice: any,
  colour: string | undefined,
  sourceElement: HTMLElement,
) {
  const cleanContent = notice.contents
    .replace(/\[\[[\w]+[:][\w]+[\]\]]+/g, "")
    .replace(/ +/, " ");

  document.getElementById("notice-modal")?.remove();

  const sourceRect = sourceElement.getBoundingClientRect();
  let scrollY = Math.round(window.scrollY);
  let scrollX = Math.round(window.scrollX);
  let sourceLeft = sourceRect.left;
  let sourceTop = sourceRect.top;
  let sourceWidth = sourceRect.width;
  let sourceHeight = sourceRect.height;

  const modalHtml = `
    <div id="notice-modal" class="notice-modal-overlay" style="opacity: 0;">
      <div class="notice-modal-transition" style="
        position: fixed;
        left: ${sourceLeft + scrollX}px;
        top: ${sourceTop + scrollY}px;
        width: ${sourceWidth}px;
        height: ${sourceHeight}px;
        transform-origin: center;
        z-index: 10001;
      ">
        <div class="notice-modal-content notice-transitioning">
          <div class="notice-unified-content notice-card-state">
            <div class="notice-header">
              <div class="notice-badge-row">
                <span class="notice-badge" style="background: linear-gradient(135deg, ${colour || "#8e8e8e"}, ${colour || "#8e8e8e"}dd); color: white;">
                  ${notice.label_title || "General"}
                </span>
                <span class="notice-staff">${notice.staff}</span>
              </div>
              <button class="notice-close-btn">&times;</button>
            </div>
            <h2 class="notice-content-title">${notice.title}</h2>
            <div class="notice-content-body">${cleanContent}</div>
          </div>
        </div>
      </div>
    </div>`;

  const modal = stringToHTML(modalHtml).firstChild as HTMLElement;
  const transitionContainer = modal.querySelector(
    ".notice-modal-transition",
  ) as HTMLElement;
  const unifiedContent = modal.querySelector(
    ".notice-unified-content",
  ) as HTMLElement;
  const closeBtn = modal.querySelector(".notice-close-btn") as HTMLElement;

  document.body.appendChild(modal);

  sourceElement.setAttribute("data-transitioning", "true");
  sourceElement.style.opacity = "0";
  sourceElement.style.transform = "scale(0.95)";

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let targetWidth = Math.round(
    Math.min(Math.max(sourceWidth, 800), viewportWidth - 40),
  );

  const tempMeasureDiv = document.createElement("div");
  tempMeasureDiv.style.position = "absolute";
  tempMeasureDiv.style.left = "-9999px";
  tempMeasureDiv.style.width = targetWidth + "px";
  tempMeasureDiv.style.visibility = "hidden";
  tempMeasureDiv.innerHTML = `
    <div class="notice-unified-content notice-modal-state" style="position: relative; width: 100%; padding: 16px; border: 1px solid rgba(255, 255, 255, 0.1);">
      <div class="notice-header">
        <div class="notice-badge-row">
          <span class="notice-badge">${notice.label_title || "General"}</span>
          <span class="notice-staff">${notice.staff}</span>
        </div>
        <button class="notice-close-btn">&times;</button>
      </div>
      <h2 class="notice-content-title">${notice.title}</h2>
      <div class="notice-content-body">${cleanContent}</div>
    </div>
  `;
  document.body.appendChild(tempMeasureDiv);
  const measuredHeight =
    tempMeasureDiv.firstElementChild!.getBoundingClientRect().height;
  document.body.removeChild(tempMeasureDiv);

  let targetHeight = Math.round(
    Math.min(Math.max(measuredHeight + 32, 200), viewportHeight * 0.9),
  );
  let targetLeft = Math.round((viewportWidth - targetWidth) / 2);
  let targetTop = Math.round((viewportHeight - targetHeight) / 2) + scrollY;

  const closeModal = () => {
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("keydown", handleEscape);

    if (!settingsState.animations) {
      modal.remove();
      sourceElement.style.opacity = "1";
      sourceElement.style.transform = "";
      sourceElement.removeAttribute("data-transitioning");
      return;
    }

    animate(
      modal,
      {
        backgroundColor: ["rgba(0, 0, 0, 0.5)", "rgba(0, 0, 0, 0)"],
        backdropFilter: ["blur(4px)", "blur(0px)"],
      },
      { duration: 0.2 },
    );

    animate(
      transitionContainer,
      { opacity: [1, 0] },
      { duration: 0.2, delay: 0.3 },
    );

    sourceElement.style.opacity = "1";
    sourceElement.style.transform = "";

    modal.style.pointerEvents = "none";

    animate(
      transitionContainer,
      {
        left: [targetLeft + scrollX, sourceLeft + scrollX],
        top: [targetTop, sourceTop + scrollY],
        width: [targetWidth, sourceWidth],
        height: [targetHeight, sourceHeight],
        scale: [1, 1],
      },
      {
        duration: 0.35,
        type: "spring",
        stiffness: 400,
        damping: 35,
      },
    ).finished.then(async () => {
      modal.remove();
      sourceElement.removeAttribute("data-transitioning");
    });
  };

  closeBtn?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleResize);
    }
  };
  document.addEventListener("keydown", handleEscape);

  const handleResize = () => {
    const newSourceRect = sourceElement.getBoundingClientRect();
    const newScrollY = Math.round(window.scrollY);
    const newScrollX = Math.round(window.scrollX);

    const computedStyle = getComputedStyle(sourceElement);
    const transform = computedStyle.transform;
    let scaleX = 1,
      scaleY = 1;

    if (transform && transform !== "none") {
      const matrix = transform.match(/matrix.*\((.+)\)/);
      if (matrix) {
        const values = matrix[1].split(", ");
        scaleX = parseFloat(values[0]);
        scaleY = parseFloat(values[3]);
      }
    }

    const newSourceWidth = newSourceRect.width / scaleX;
    const newSourceHeight = newSourceRect.height / scaleY;

    const deltaX = (newSourceWidth - newSourceRect.width) / 2;
    const deltaY = (newSourceHeight - newSourceRect.height) / 2;

    const newSourceLeft = newSourceRect.left - deltaX;
    const newSourceTop = newSourceRect.top - deltaY;

    const newViewportWidth = window.innerWidth;
    const newViewportHeight = window.innerHeight;
    const newTargetWidth = Math.round(
      Math.min(Math.max(newSourceWidth, 800), newViewportWidth - 40),
    );
    const currentHeight = unifiedContent.getBoundingClientRect().height;
    const newTargetHeight = Math.round(
      Math.min(Math.max(currentHeight + 32, 200), newViewportHeight * 0.9),
    );
    const newTargetLeft = Math.round((newViewportWidth - newTargetWidth) / 2);
    const newTargetTop =
      Math.round((newViewportHeight - newTargetHeight) / 2) + newScrollY;

    transitionContainer.style.left =
      Math.round(newTargetLeft + newScrollX) + "px";
    transitionContainer.style.top = Math.round(newTargetTop) + "px";
    transitionContainer.style.width = Math.round(newTargetWidth) + "px";
    transitionContainer.style.height = Math.round(newTargetHeight) + "px";

    sourceLeft = newSourceLeft;
    sourceTop = newSourceTop;
    sourceWidth = newSourceWidth;
    sourceHeight = newSourceHeight;
    targetLeft = newTargetLeft;
    targetTop = newTargetTop;
    targetWidth = newTargetWidth;
    targetHeight = newTargetHeight;
    scrollY = newScrollY;
    scrollX = newScrollX;
  };

  window.addEventListener("resize", handleResize);

  if (settingsState.animations) {
    animate(modal, { opacity: [0, 1] }, { duration: 0.2 });

    animate(
      transitionContainer,
      {
        left: [sourceLeft + scrollX, targetLeft + scrollX],
        top: [sourceTop + scrollY, targetTop],
        width: [sourceWidth, targetWidth],
        height: [sourceHeight, targetHeight],
        scale: [1, 1],
      },
      {
        duration: 0.5,
        type: "spring",
        stiffness: 280,
        damping: 24,
      },
    );

    unifiedContent.classList.remove("notice-card-state");
    unifiedContent.classList.add("notice-modal-state");
  } else {
    modal.style.opacity = "1";
    transitionContainer.style.left = Math.round(targetLeft + scrollX) + "px";
    transitionContainer.style.top = Math.round(targetTop) + "px";
    transitionContainer.style.width = Math.round(targetWidth) + "px";
    transitionContainer.style.height = Math.round(targetHeight) + "px";
    unifiedContent.classList.remove("notice-card-state");
    unifiedContent.classList.add("notice-modal-state");
  }
}

async function fetchEngageNoticesFromApi(
  date: string,
  labelTokens: string[],
): Promise<void> {
  try {
    const data = settingsState.mockNotices
      ? getMockNotices()
      : await (
          await fetch(`${location.origin}/seqta/parent/load/notices`, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            credentials: "include",
            body: JSON.stringify({ date }),
          })
        ).json();

    processEngageNotices(data, labelTokens);
  } catch (e) {
    console.warn("[BetterSEQTA+] Engage notices request failed:", e);
    processEngageNotices({ payload: [] }, labelTokens);
  }
}

function bindEngageNoticesDateInput(
  labelTokens: string[],
  initialDate: string,
): () => void {
  const dateControl = document.getElementById(
    ENGAGE_NOTICES_DATE_ID,
  ) as HTMLInputElement | null;

  if (!dateControl) {
    return () => {};
  }

  dateControl.value = initialDate;

  const debouncedInputChange = debounce((e: Event) => {
    void fetchEngageNoticesFromApi(
      (e.target as HTMLInputElement).value,
      labelTokens,
    );
  }, 250);

  dateControl.addEventListener("input", debouncedInputChange);

  return () => dateControl.removeEventListener("input", debouncedInputChange);
}

async function initEngageNoticesUi(todayFormatted: string): Promise<void> {
  const noticeContainer = document.getElementById(ENGAGE_NOTICE_CONTAINER_ID);
  if (!noticeContainer) return;

  let labelFilterValues: string[] = [];
  try {
    const prefsRes = await fetch(`${location.origin}/seqta/parent/load/prefs?`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      credentials: "include",
      body: JSON.stringify({ asArray: true, request: "userPrefs" }),
    });
    const prefs = await prefsRes.json();
    const payload = prefs?.payload;
    if (Array.isArray(payload)) {
      labelFilterValues = payload
        .filter((item: { name?: string }) => item.name === "notices.filters")
        .map((item: { value?: string }) => item.value)
        .filter((v): v is string => typeof v === "string");
    }
  } catch {
    labelFilterValues = [];
  }

  const labelTokens =
    labelFilterValues.length > 0
      ? String(labelFilterValues[0]).split(" ").filter(Boolean)
      : [];

  const dateControl = document.getElementById(ENGAGE_NOTICES_DATE_ID);
  if (dateControl) {
    (dateControl as HTMLInputElement).value = todayFormatted;
  }

  await fetchEngageNoticesFromApi(todayFormatted, labelTokens);

  const cleanup = bindEngageNoticesDateInput(labelTokens, todayFormatted);
  engageMergeNoticeCleanup(cleanup);

  noticeContainer.classList.remove("loading");
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
      <img src="${browser.runtime.getURL(LogoLight)}" alt="" />
      <p>${message}</p>
    </div>`;
}

function showEngageNoticesSectionError(message: string): void {
  const noticeContainer = document.getElementById(ENGAGE_NOTICE_CONTAINER_ID);
  if (!noticeContainer) return;
  noticeContainer.classList.remove("loading");
  noticeContainer.innerHTML = `
    <div class="day-empty">
      <img src="${browser.runtime.getURL(LogoLight)}" alt="" />
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
