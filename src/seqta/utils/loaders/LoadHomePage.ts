import { icon } from "@/lib/icon";
import { BookOpen, ChevronLeft, ChevronRight, ClipboardList } from "lucide-static";
import { animate, stagger } from "motion";
import LogoLight from "@/resources/icons/betterseqta-light-icon.png";
import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";
import { GetThresholdOfColor } from "@/seqta/ui/colors/getThresholdColour";
import { convertTo12HourFormat } from "../convertTo12HourFormat";
import { delay } from "../delay";
import { settingsState } from "../listeners/SettingsState";
import stringToHTML from "../stringToHTML";
import { renderShortcuts } from "@/seqta/utils/render/renderShortcuts";
import { CreateElement } from "@/seqta/utils/createEnable/CreateElement";
import { FilterUpcomingAssessments } from "@/seqta/utils/FilterUpcomingAssessments";
import { setupTooltips } from "@/seqta/utils/tooltip";
import { verboseInfo } from "@/utils/verboseLog";
import { getUserInfo } from "@/seqta/utils/userInfo";
import {
  activeSubjectsFromLearnPayload,
  activeSubjectForAssessment,
  filterAssessmentsForActiveSubjects,
  subjectsWithUpcomingAssessments,
} from "@/plugins/built-in/assessmentsOverview/utils";
import { resolveNoticeFilterTokens } from "@/seqta/utils/notices/noticeLabelFilters";
import { setupNoticesSection } from "@/seqta/utils/notices/noticeHomeUi";
import { lessonsSubtitleForViewDate } from "@/seqta/utils/loaders/timetableSubtitle";
import {
  applyPageFeatureGateEarly,
  injectPageFeatureBanner,
} from "@/seqta/utils/remoteConfig/runtime";
import type {
  ActiveSubjectLike,
  DateSortable,
  HomeLessonAssessmentLink,
  HomeTimetableLesson,
  HomeUpcomingAssessment,
  SeqtaColourPref,
  UpcomingDateBucket,
} from "@/seqta/utils/loaders/homePageTypes";

let lessonInterval: ReturnType<typeof setInterval> | null = null;
let homeTeardown: (() => void) | null = null;
let currentSelectedDate = new Date();
let loadingTimeout: ReturnType<typeof setTimeout> | null = null;

function clearLessonInterval(): void {
  if (lessonInterval !== null) {
    clearInterval(lessonInterval);
    lessonInterval = null;
  }
}

export async function loadHomePage() {
  if (applyPageFeatureGateEarly("home")) return;

  homeTeardown?.();
  homeTeardown = null;
  clearLessonInterval();
  verboseInfo("[BetterSEQTA+] Started Loading Home Page");

  currentSelectedDate = new Date();

  await delay(10);

  document.title = "Home ― SEQTA Learn";
  const element = document.querySelector("[data-key=home]");
  element?.classList.add("active");

  const main = document.getElementById("main");
  if (!main) return;

  main.innerHTML = "";
  main.appendChild(stringToHTML(`<div id="home-root" class="home-root"></div>`).firstChild!);

  const homeContainer = document.getElementById("home-root");
  if (!homeContainer) return;

  const skeletonStructure = stringToHTML(/* html */ `
      <div class="home-container" id="home-container">
        <div class="border shortcut-container">
          <div class="border shortcuts" id="shortcuts"></div>
        </div>
        <div class="border timetable-container">
          <div class="home-subtitle">
            <h2 id="home-lesson-subtitle">Today's Lessons</h2>
            <div class="timetable-arrows">
              ${icon(ChevronLeft, { id: "home-timetable-back" })}
              ${icon(ChevronRight, { id: "home-timetable-forward" })}
            </div>
          </div>
          <div class="day-container loading" id="day-container">
          </div>
        </div>
        <div class="border upcoming-container">
          <div class="upcoming-title">
            <h2 class="home-subtitle">Upcoming Assessments</h2>
            <div class="upcoming-filters" id="upcoming-filters"></div>
          </div>
          <div class="upcoming-items loading" id="upcoming-items">
          </div>
        </div>
        <div class="border notices-container">
          <div style="display: flex; justify-content: space-between">
            <h2 class="home-subtitle">Notices</h2>
            <input type="date" />
          </div>
          <div class="notice-container upcoming-items loading" id="notice-container">
          </div>
        </div>
      </div>`);

  homeContainer.appendChild(skeletonStructure.firstChild!);
  injectPageFeatureBanner("home", "#home-container");
  injectPageFeatureBanner("home", "#home-container");

  if (settingsState.animations) {
    animate(
      ".home-container > div",
      { opacity: [0, 1], y: [10, 0], scale: [0.99, 1] },
      {
        delay: stagger(0.15, { startDelay: 0.1 }),
        type: "spring",
        stiffness: 341,
        damping: 20,
        mass: 1,
      },
    );
  }

  const timetableCleanup = setupTimetableListeners();
  homeTeardown = () => {
    clearLessonInterval();
    timetableCleanup();
  };

  renderShortcuts();

  const TodayFormatted = formatDate(new Date());

  const [assessments, classes, prefs] = await Promise.all([
    GetUpcomingAssessments(),
    GetActiveClasses(),
    fetch(`${location.origin}/seqta/student/load/prefs?`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asArray: true, request: "userPrefs" }),
    }).then((res) => res.json()),
  ]);

  callHomeTimetable(TodayFormatted, true);

  const activeSubjects = activeSubjectsFromLearnPayload(classes);
  const currentAssessments = filterAssessmentsForActiveSubjects(assessments, activeSubjects).sort(
    comparedate,
  ) as HomeUpcomingAssessment[];

  const upcomingItems = document.getElementById("upcoming-items");
  if (upcomingItems) {
    await CreateUpcomingSection(currentAssessments, activeSubjects);
    upcomingItems.classList.remove("loading");
  }

  const labelTokens = await resolveNoticeFilterTokens(
    prefs.payload,
    `${location.origin}/seqta/student/load/notices?`,
  );

  if (document.getElementById("notice-container")) {
    setupNoticesSection({
      containerId: "notice-container",
      dateInput: 'input[type="date"]',
      noticesUrl: `${location.origin}/seqta/student/load/notices?`,
      labelTokens,
      initialDate: TodayFormatted,
    });
  }

  return homeTeardown;
}

let upcomingRefreshTimeout: ReturnType<typeof setTimeout> | null = null;

/** Re-render the home page upcoming assessments block when related settings change. */
export function refreshHomeUpcomingAssessments() {
  if (!document.getElementById("upcoming-items")) return;

  if (upcomingRefreshTimeout) clearTimeout(upcomingRefreshTimeout);
  upcomingRefreshTimeout = setTimeout(() => {
    upcomingRefreshTimeout = null;
    void renderHomeUpcomingAssessments();
  }, 150);
}

async function renderHomeUpcomingAssessments() {
  const upcomingItems = document.getElementById("upcoming-items");
  if (!upcomingItems) return;

  upcomingItems.classList.add("loading");
  upcomingItems.innerHTML = "";
  const filterContainer = document.getElementById("upcoming-filters");
  if (filterContainer) filterContainer.innerHTML = "";

  const [assessments, classes] = await Promise.all([GetUpcomingAssessments(), GetActiveClasses()]);

  const activeSubjects = activeSubjectsFromLearnPayload(classes);
  const currentAssessments = filterAssessmentsForActiveSubjects(assessments, activeSubjects).sort(
    comparedate,
  ) as HomeUpcomingAssessment[];

  await CreateUpcomingSection(currentAssessments, activeSubjects);
  upcomingItems.classList.remove("loading");
}

export function registerHomeUpcomingSettingsListeners() {
  const keys = [
    "homeUpcomingSubjectsMax",
    "homeUpcomingAssessmentsPerSubjectMax",
    "homeUpcomingIncludePast",
  ] as const;

  for (const key of keys) {
    settingsState.register(key, () => refreshHomeUpcomingAssessments());
  }
}

async function GetUpcomingAssessments() {
  try {
    const { id: student } = await getUserInfo();
    const response = await fetch(`${location.origin}/seqta/student/assessment/list/upcoming?`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ student }),
    });
    return (await response.json()).payload;
  } catch (error) {
    console.error("[BetterSEQTA+] Failed to get upcoming assessments:", error);
    return [];
  }
}

function setupTimetableListeners() {
  const listeners: Array<() => void> = [];
  const timetableBack = document.getElementById("home-timetable-back");
  const timetableForward = document.getElementById("home-timetable-forward");

  function changeTimetable(value: number) {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }

    loadingTimeout = setTimeout(() => {
      const dayContainer = document.getElementById("day-container");
      if (dayContainer) {
        dayContainer.classList.add("loading");
        dayContainer.innerHTML = "";
      }
    }, 200);

    currentSelectedDate.setDate(currentSelectedDate.getDate() + value);
    const formattedDate = formatDate(currentSelectedDate);
    callHomeTimetable(formattedDate, true);
    SetTimetableSubtitle();
  }

  const backHandler = () => changeTimetable(-1);
  const forwardHandler = () => changeTimetable(1);

  timetableBack?.addEventListener("click", backHandler);
  timetableForward?.addEventListener("click", forwardHandler);

  listeners.push(
    () => timetableBack?.removeEventListener("click", backHandler),
    () => timetableForward?.removeEventListener("click", forwardHandler),
  );

  return () => listeners.forEach((cleanup) => cleanup());
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function GetActiveClasses() {
  try {
    const response = await fetch(`${location.origin}/seqta/student/load/subjects?`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({}),
    });
    return (await response.json()).payload;
  } catch (error) {
    console.error("[BetterSEQTA+] Failed to get active classes:", error);
    return [];
  }
}

function comparedate(obj1: DateSortable, obj2: DateSortable) {
  const d1 = new Date(obj1.due || obj1.date || 0).getTime();
  const d2 = new Date(obj2.due || obj2.date || 0).getTime();
  return d1 - d2;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

async function callHomeTimetable(date: string, change?: boolean) {
  const { id: student } = await getUserInfo();
  const response = await fetch(`${location.origin}/seqta/student/load/timetable?`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ from: date, until: date, student }),
  });
  const serverResponse = await response.json();

  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }

  const DayContainer = document.getElementById("day-container")!;

  if (serverResponse.payload.items.length > 0) {
    if (DayContainer.innerText || change) {
      const lessonArray: HomeTimetableLesson[] = [...serverResponse.payload.items].sort((a, b) =>
        a.from.localeCompare(b.from),
      );

      GetLessonColours().then((colours) => {
        for (let i = 0; i < lessonArray.length; i++) {
          const subjectname =
            lessonArray[i].type == "tutorial"
              ? `timetable.tutor.${lessonArray[i].tutorID}`
              : `timetable.subject.colour.${lessonArray[i].code}`;
          const subject = colours.find((element: SeqtaColourPref) => element.name === subjectname);

          if (!subject) {
            lessonArray[i].colour = "--item-colour: #8e8e8e;";
          } else {
            lessonArray[i].colour = `--item-colour: ${subject.value};`;
            if (GetThresholdOfColor(subject.value) > 300) {
              lessonArray[i].invert = true;
            }
          }

          lessonArray[i].from = lessonArray[i].from.substring(0, 5);
          lessonArray[i].until = lessonArray[i].until.substring(0, 5);

          if (settingsState.timeFormat === "12") {
            lessonArray[i].from = convertTo12HourFormat(lessonArray[i].from);
            lessonArray[i].until = convertTo12HourFormat(lessonArray[i].until);
          }

          lessonArray[i].attendanceTitle = CheckUnmarkedAttendance(lessonArray[i].attendance);
        }

        DayContainer.innerText = "";
        for (let i = 0; i < lessonArray.length; i++) {
          const div = makeLessonDiv(lessonArray[i], i + 1);
          if (lessonArray[i].invert) {
            (div.firstChild! as HTMLElement).classList.add("day-inverted");
          }
          DayContainer.append(div.firstChild as HTMLElement);
        }

        DayContainer.classList.remove("loading");

        const today = new Date();
        if (currentSelectedDate.getDate() == today.getDate()) {
          for (let i = 0; i < lessonArray.length; i++) {
            CheckCurrentLesson(lessonArray[i], i + 1);
          }
          CheckCurrentLessonAll(lessonArray);
        }
      });
    }
  } else {
    DayContainer.innerHTML = "";
    const dummyDay = document.createElement("div");
    dummyDay.classList.add("day-empty");
    const img = document.createElement("img");
    img.src = resolveExtensionAssetUrl(LogoLight);
    const text = document.createElement("p");
    text.innerText = "No lessons available.";
    dummyDay.append(img, text);
    DayContainer.append(dummyDay);
    DayContainer.classList.remove("loading");
  }
}

function CheckCurrentLessonAll(lessons: HomeTimetableLesson[]) {
  clearLessonInterval();
  lessonInterval = setInterval(() => {
    for (let i = 0; i < lessons.length; i++) {
      CheckCurrentLesson(lessons[i], i + 1);
    }
  }, 60000);
}

async function CheckCurrentLesson(lesson: HomeTimetableLesson, num: number) {
  const { from: startTime, until: endTime, code, description, room, staff } = lesson;
  const currentDate = new Date();

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  const startDate = new Date(currentDate);
  startDate.setHours(startHour, startMinute, 0);

  const endDate = new Date(currentDate);
  endDate.setHours(endHour, endMinute, 0);

  const isValidTime = startDate < currentDate && endDate > currentDate;

  const elementId = `${code}${num}`;
  const element = document.getElementById(elementId);

  if (!element) {
    clearLessonInterval();
    return;
  }

  const isCurrentDate =
    currentSelectedDate.toLocaleDateString("en-au") === currentDate.toLocaleDateString("en-au");

  if (isCurrentDate) {
    if (isValidTime) {
      element.classList.add("activelesson");
    } else {
      element.classList.remove("activelesson");
    }
  }

  const minutesUntilStart = Math.floor((startDate.getTime() - currentDate.getTime()) / 60000);

  if (minutesUntilStart !== 5 || settingsState.lessonalert || !window.Notification) return;

  if (Notification.permission !== "granted") await Notification.requestPermission();

  try {
    new Notification("Next Lesson in 5 Minutes:", {
      body: `Subject: ${description}${room ? `\nRoom: ${room}` : ""}${staff ? `\nTeacher: ${staff}` : ""}`,
    });
  } catch (error) {
    console.error(error);
  }
}

function makeLessonDiv(lesson: HomeTimetableLesson, num: number) {
  const {
    code,
    colour,
    description,
    staff,
    room,
    from,
    until,
    attendanceTitle,
    programmeID,
    metaID,
    assessments,
    type,
  } = lesson;

  const homeClassAttrs =
    type === "class"
      ? ` data-bsplus-meta-id="${metaID ?? ""}" data-bsplus-code="${code ?? ""}" data-bsplus-programme-id="${programmeID ?? ""}"`
      : "";

  let lessonString = `
      <div class="day" id="${code + num}" style="${colour}"${homeClassAttrs}>
        <h2>${type == "class" ? description : type == "tutorial" ? "Tutorial" : "Unknown"}</h2>
        <h3>${staff || "Unknown"}</h3>
        <h3>${room || (type == "tutorial" ? "Unknown" : "N/A")}</h3>
        <h4>${from || "Unknown"} - ${until || "Unknown"}</h4>
        <h5>${attendanceTitle || "Unknown"}</h5>
    `;

  if (type == "class") {
    if (programmeID !== 0) {
      lessonString += `
        <a class="day-button clickable" style="right: 5px;" href="${buildAssessmentURL(programmeID, metaID)}" aria-label="Assessments">${icon(ClipboardList)}</a>
        <a class="day-button clickable" style="right: 35px;" href="../#?page=/courses/${programmeID}:${metaID}" aria-label="Course">${icon(BookOpen)}</a>
      `;
    }

    if (assessments && assessments.length > 0) {
      const assessmentString = assessments
        .map(
          (element: HomeLessonAssessmentLink) =>
            `<a href="${buildAssessmentURL(programmeID, metaID, element.id)}">${element.title}</a>`,
        )
        .join("");

      lessonString += `
        <div class="bsplus-tooltip assessmenttooltip" tabindex="0" aria-label="Assessments for this lesson">
          ${icon(ClipboardList, { size: 28, style: "color: #ed3939" })}
          <div class="bsplus-tooltip-bubble">${assessmentString}</div>
        </div>
      `;
    }
  }

  lessonString += "</div>";
  const element = stringToHTML(lessonString);
  setupTooltips(element);
  return element;
}

function buildAssessmentURL(
  programmeID: number | undefined,
  metaID: number | undefined,
  itemID: number | string = "",
) {
  const base = "../#?page=/assessments/";
  return itemID
    ? `${base}${programmeID}:${metaID}&item=${itemID}`
    : `${base}${programmeID}:${metaID}`;
}

function CheckUnmarkedAttendance(lessonattendance: { label?: string } | null | undefined) {
  return lessonattendance ? lessonattendance.label : " ";
}

function applyHomeUpcomingLimits(
  assessments: HomeUpcomingAssessment[],
  activeSubjects: ActiveSubjectLike[],
) {
  const maxSubjects = settingsState.homeUpcomingSubjectsMax ?? 5;
  const maxPerSubject = settingsState.homeUpcomingAssessmentsPerSubjectMax ?? 0;

  for (let i = 0; i < assessments.length; i++) {
    const subject = activeSubjectForAssessment(assessments[i], activeSubjects);
    assessments[i].filterCode = subject?.code ?? assessments[i].code;
  }

  const bySubject = new Map<string, HomeUpcomingAssessment[]>();
  const subjectOrder: string[] = [];

  for (const assessment of assessments) {
    const code = assessment.filterCode ?? assessment.code;
    if (!code) continue;
    if (!bySubject.has(code)) {
      bySubject.set(code, []);
      subjectOrder.push(code);
    }
    bySubject.get(code)!.push(assessment);
  }

  for (const items of bySubject.values()) {
    items.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  }

  subjectOrder.sort(
    (a, b) =>
      new Date(bySubject.get(a)![0].due).getTime() - new Date(bySubject.get(b)![0].due).getTime(),
  );

  const subjectLimit = maxSubjects > 0 ? maxSubjects : subjectOrder.length;
  const allowedSubjects = subjectOrder.slice(0, subjectLimit);

  const limited: HomeUpcomingAssessment[] = [];
  for (const code of allowedSubjects) {
    const items = bySubject.get(code)!;
    const perSubjectLimit = maxPerSubject > 0 ? maxPerSubject : items.length;
    limited.push(...items.slice(0, perSubjectLimit));
  }

  limited.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

  assessments.splice(0, assessments.length, ...limited);
}

async function CreateUpcomingSection(
  assessments: HomeUpcomingAssessment[],
  activeSubjects: ActiveSubjectLike[],
) {
  const { id: student } = await getUserInfo();
  const upcomingitemcontainer = document.querySelector("#upcoming-items");
  const upcomingDates: Record<string, UpcomingDateBucket> = {};
  const Today = new Date();

  if (!(settingsState.homeUpcomingIncludePast ?? true)) {
    const todayStart = startOfDay(Today);
    for (let i = assessments.length - 1; i >= 0; i--) {
      const assessmentdue = new Date(assessments[i].due);
      if (assessmentdue < todayStart) {
        assessments.splice(i, 1);
      }
    }
  }

  applyHomeUpcomingLimits(assessments, activeSubjects);

  const colours = await GetLessonColours();

  for (let i = 0; i < assessments.length; i++) {
    const subject = colours.find(
      (element: SeqtaColourPref) =>
        element.name === `timetable.subject.colour.${assessments[i].code}`,
    );
    if (!subject) {
      assessments[i].colour = "--item-colour: #8e8e8e;";
    } else {
      assessments[i].colour = `--item-colour: ${subject.value};`;
    }
  }

  const filterSubjects = subjectsWithUpcomingAssessments(assessments, activeSubjects).map(
    (subject) => {
      const colour = colours.find(
        (c: SeqtaColourPref) => c.name === `timetable.subject.colour.${subject.code}`,
      );
      return { code: subject.code, colour: `--item-colour: ${colour?.value ?? "#8e8e8e"};` };
    },
  );

  CreateFilters(filterSubjects);

  for (let i = 0; i < assessments.length; i++) {
    const element = assessments[i];
    if (!upcomingDates[element.due]) {
      const dateObj: UpcomingDateBucket = {
        div: CreateElement("div", "upcoming-date-container") as HTMLElement,
        assessments: [],
      };
      upcomingDates[element.due] = dateObj;
    }
    const assessmentDateDiv = upcomingDates[element.due];
    assessmentDateDiv.assessments.push(element);
  }

  for (const date in upcomingDates) {
    const assessmentdue = new Date(upcomingDates[date].assessments[0].due);
    const specialcase = CheckSpecialDay(Today, assessmentdue);
    const assessmentDate = createAssessmentDateDiv(
      date,
      upcomingDates[date],
      student ?? 0,
      specialcase,
    );

    if (specialcase === "Yesterday") {
      upcomingitemcontainer!.insertBefore(assessmentDate, upcomingitemcontainer!.firstChild);
    } else {
      upcomingitemcontainer!.append(assessmentDate);
    }
  }
  FilterUpcomingAssessments(settingsState.subjectfilters);

  if (assessments.length === 0) {
    upcomingitemcontainer!.innerHTML = `
      <div class="day-empty">
        <img src="${resolveExtensionAssetUrl(LogoLight)}" />
        <p>No assessments available.</p>
      </div>`;
  }
}

function createAssessmentDateDiv(
  date: string,
  value: UpcomingDateBucket,
  student: number,
  datecase?: string,
) {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };
  const FormattedDate = new Date(date);
  const assessments = value.assessments;
  const container = value.div;

  const DateTitleDiv = document.createElement("div");
  DateTitleDiv.classList.add("upcoming-date-title");

  if (datecase) {
    const datetitle = document.createElement("h5");
    datetitle.classList.add("upcoming-special-day");
    datetitle.innerText = datecase;
    DateTitleDiv.append(datetitle);
    container.setAttribute("data-day", datecase);
  }

  const DateTitle = document.createElement("h5");
  DateTitle.innerText = FormattedDate.toLocaleDateString("en-AU", options);
  DateTitleDiv.append(DateTitle);
  container.append(DateTitleDiv);

  const assessmentContainer = document.createElement("div");
  assessmentContainer.classList.add("upcoming-date-assessments");

  for (let i = 0; i < assessments.length; i++) {
    const element = assessments[i];
    const item = document.createElement("div");
    item.classList.add("upcoming-assessment");
    item.setAttribute("data-subject", element.filterCode ?? element.code);
    item.id = `assessment${element.id}`;
    item.style.cssText = element.colour ?? "";

    const titlediv = document.createElement("div");
    titlediv.classList.add("upcoming-subject-title");
    titlediv.append(
      stringToHTML(icon(ClipboardList, { size: 35, style: "color: #fff" })).firstChild!,
    );

    const detailsdiv = document.createElement("div");
    detailsdiv.classList.add("upcoming-details");
    const detailstitle = document.createElement("h5");
    detailstitle.innerText = `${element.subject} assessment`;
    const subject = document.createElement("p");
    subject.innerText = element.title;
    subject.classList.add("upcoming-assessment-title");
    subject.onclick = () => {
      location.href = `../#?page=/assessments/${element.programmeID}:${element.metaclassID}&item=${element.id}`;
    };
    detailsdiv.append(detailstitle, subject);
    item.append(titlediv, detailsdiv);
    assessmentContainer.append(item);

    fetch(`${location.origin}/seqta/student/assessment/submissions/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        assessment: element.id,
        metaclass: element.metaclassID,
        student,
      }),
    })
      .then((result) => result.json())
      .then((response) => {
        if (response.payload.length > 0) {
          const assessment = document.querySelector(`#assessment${element.id}`);
          const submittedtext = document.createElement("div");
          submittedtext.classList.add("upcoming-submittedtext");
          submittedtext.innerText = "Submitted";
          assessment!.append(submittedtext);
        }
      });
  }

  container.append(assessmentContainer);

  return container;
}

function CheckSpecialDay(date1: Date, date2: Date) {
  if (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() - 1 === date2.getDate()
  ) {
    return "Yesterday";
  }
  if (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  ) {
    return "Today";
  }
  if (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() + 1 === date2.getDate()
  ) {
    return "Tomorrow";
  }
}

async function GetLessonColours() {
  try {
    const { id: user } = await getUserInfo();
    const response = await fetch(`${location.origin}/seqta/student/load/prefs?`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ request: "userPrefs", asArray: true, user }),
    });
    return (await response.json()).payload;
  } catch (error) {
    console.error("[BetterSEQTA+] Failed to get lesson colours:", error);
    return [];
  }
}

function CreateFilters(subjects: { code: string; colour: string }[]) {
  const filteroptions = { ...settingsState.subjectfilters };
  const filterdiv = document.querySelector("#upcoming-filters");
  if (!filterdiv) return;

  filterdiv.innerHTML = "";
  const activeCodes = new Set(subjects.map((s) => s.code));

  for (const key of Object.keys(filteroptions)) {
    if (!activeCodes.has(key)) {
      delete filteroptions[key];
    }
  }

  for (let i = 0; i < subjects.length; i++) {
    const element = subjects[i];
    if (!Object.hasOwn(filteroptions, element.code)) {
      filteroptions[element.code] = true;
    }
    filterdiv!.append(
      CreateSubjectFilter(element.code, element.colour, filteroptions[element.code]),
    );
  }

  settingsState.subjectfilters = filteroptions;
}

function CreateSubjectFilter(subjectcode: string, itemcolour: string, checked: boolean) {
  const label = CreateElement("label", "upcoming-checkbox-container");
  label.innerText = subjectcode;
  const input = CreateElement("input") as HTMLInputElement;
  input.type = "checkbox";
  input.checked = checked;
  input.id = `filter-${subjectcode}`;
  label.style.cssText = itemcolour;
  const span = CreateElement("span", "upcoming-checkmark");
  label.append(input, span);

  input.addEventListener("change", function (change) {
    const checked = (change.target as HTMLInputElement).checked;
    const filters = { ...settingsState.subjectfilters };
    filters[subjectcode] = checked;
    settingsState.subjectfilters = filters;
  });

  return label;
}

function SetTimetableSubtitle() {
  const homelessonsubtitle = document.getElementById("home-lesson-subtitle");
  if (!homelessonsubtitle) return;
  homelessonsubtitle.innerText = lessonsSubtitleForViewDate(currentSelectedDate);
}
