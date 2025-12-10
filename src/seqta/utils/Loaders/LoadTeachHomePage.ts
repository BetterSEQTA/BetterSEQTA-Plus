import { delay } from "../delay";
import { settingsState } from "../listeners/SettingsState";
import stringToHTML from "../stringToHTML";
import { isSEQTATeach } from "../platformDetection";
import { animate, stagger } from "motion";
import browser from "webextension-polyfill";
import LogoLight from "@/resources/icons/betterseqta-light-icon.png";
import assessmentsicon from "@/seqta/icons/assessmentsIcon";
import coursesicon from "@/seqta/icons/coursesIcon";
import { GetThresholdOfColor } from "@/seqta/ui/colors/getThresholdColour";
import { convertTo12HourFormat } from "../convertTo12HourFormat";
import { renderShortcuts } from "@/seqta/utils/Render/renderShortcuts";
import { CreateElement } from "@/seqta/utils/CreateEnable/CreateElement";
import { FilterUpcomingAssessments } from "@/seqta/utils/FilterUpcomingAssessments";
import { getMockNotices } from "@/seqta/ui/dev/hideSensitiveContent";
import { setupFixedTooltips } from "@/seqta/utils/fixedTooltip";

// Flag to prevent multiple simultaneous loads
let isLoadingHomePage = false;
let routeListenerSetup = false;
let LessonInterval: any;
let currentSelectedDate = new Date();
let loadingTimeout: any;

// BetterSEQTA+ homepage route (separate from Teach's welcome page)
const BETTERSEQTA_HOME_ROUTE = '/betterseqta-home';

/**
 * Sets up route listener to show/hide homepage based on current route
 * Exported so it can be called early to set up routing
 */
export function setupRouteListener() {
  if (routeListenerSetup) {
    console.debug("[BetterSEQTA+] Route listener already setup");
    return;
  }
  routeListenerSetup = true;
  console.debug("[BetterSEQTA+] Setting up route listener");

  // Listen for route changes
  const checkRoute = () => {
    const currentPath = window.location.pathname;
    console.debug("[BetterSEQTA+] Route check:", currentPath);
    
    const homeElement = document.getElementById("betterseqta-teach-home");
    const homeRoot = document.querySelector(".home-root");
    const mainContent = homeElement?.parentElement;
    
    console.debug("[BetterSEQTA+] Route check - homeElement:", !!homeElement, "homeRoot:", !!homeRoot, "mainContent:", !!mainContent);
    
    if (currentPath.includes(BETTERSEQTA_HOME_ROUTE)) {
      console.debug("[BetterSEQTA+] On homepage route - showing homepage");
      // Show homepage if on the route
      if (homeElement) {
        homeElement.style.display = '';
        console.debug("[BetterSEQTA+] Homepage element displayed");
      } else {
        console.debug("[BetterSEQTA+] Homepage element not found, loading content");
        // Load homepage if element doesn't exist
        loadTeachHomePageContent();
      }
    } else {
      console.debug("[BetterSEQTA+] Not on homepage route - cleaning up homepage");
      // Clean up homepage when navigating away
      if (homeElement) {
        console.debug("[BetterSEQTA+] Found homepage element, cleaning up");
        console.debug("[BetterSEQTA+] Homepage element details:", {
          id: homeElement.id,
          tagName: homeElement.tagName,
          parentElement: homeElement.parentElement?.tagName,
          parentId: homeElement.parentElement?.id,
          isConnected: homeElement.isConnected,
          children: homeElement.children.length,
        });
        
        try {
          // Check if element is still in the DOM
          if (!homeElement.isConnected) {
            console.debug("[BetterSEQTA+] Homepage element already disconnected from DOM");
            return;
          }
          
          const parent = homeElement.parentElement;
          if (!parent) {
            console.warn("[BetterSEQTA+] Homepage element has no parent, already removed?");
            return;
          }
          
          console.debug("[BetterSEQTA+] Parent element details:", {
            tagName: parent.tagName,
            id: parent.id,
            className: parent.className,
            children: parent.children.length,
            containsHomeElement: parent.contains(homeElement),
          });
          
          // Since we're inserting as a sibling (not inside React's container),
          // we can safely remove it without React conflicts
          if (parent.contains(homeElement)) {
            console.debug("[BetterSEQTA+] Removing homepage element from parent");
            parent.removeChild(homeElement);
            console.debug("[BetterSEQTA+] Homepage element removed successfully");
          } else {
            console.warn("[BetterSEQTA+] Homepage element is not a child of its parent");
          }
          
        } catch (error) {
          console.error("[BetterSEQTA+] Error during cleanup:", error);
          console.error("[BetterSEQTA+] Error stack:", error instanceof Error ? error.stack : 'No stack');
          
          // Fallback: just hide it (safer than removing)
          try {
            homeElement.style.display = 'none';
            console.debug("[BetterSEQTA+] Fallback: homepage hidden via display:none");
          } catch (hideError) {
            console.error("[BetterSEQTA+] Failed to hide homepage:", hideError);
          }
        }
      } else {
        console.debug("[BetterSEQTA+] No homepage element found to clean up");
      }
    }
  };

  // Listen to popstate (back/forward navigation)
  window.addEventListener('popstate', checkRoute);
  
  // Also check periodically in case Teach uses other navigation methods
  let lastPath = window.location.pathname;
  setInterval(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      checkRoute();
    }
  }, 500);

  // Initial check
  checkRoute();
}

/**
 * Loads the BetterSEQTA+ homepage content into the page
 */
async function loadTeachHomePageContent() {
  console.debug("[BetterSEQTA+] loadTeachHomePageContent called");
  
  // Prevent multiple simultaneous loads
  if (isLoadingHomePage) {
    console.debug("[BetterSEQTA+] Already loading homepage, skipping");
    return;
  }

  // Check if homepage already exists
  const existingHome = document.getElementById("betterseqta-teach-home");
  if (existingHome) {
    console.debug("[BetterSEQTA+] Homepage already exists, showing it");
    existingHome.style.display = '';
    return;
  }

  isLoadingHomePage = true;
  console.info("[BetterSEQTA+] Loading BetterSEQTA+ Home Page Content");

  // Wait for Teach's main content area to be available
  // IMPORTANT: We need to insert into a container that React doesn't manage
  // Instead of inserting into React's managed container, we'll insert as a sibling
  let insertionPoint: HTMLElement | null = null;
  let attempts = 0;
  const maxAttempts = 50;

  while (!insertionPoint && attempts < maxAttempts) {
    await delay(100);
    
    // Find the React-managed content container
    const reactContent = document.querySelector("[class*='Chrome__content']") as HTMLElement;
    const main = document.querySelector("#root > div > main");
    
    if (reactContent && main) {
      // Instead of inserting INTO the React container, insert AS A SIBLING
      // This way React won't try to manage our content
      insertionPoint = reactContent.parentElement as HTMLElement;
      console.debug("[BetterSEQTA+] Found insertion point (React container parent):", insertionPoint?.tagName);
    } else if (main) {
      // Fallback: use main element directly
      insertionPoint = main as HTMLElement;
      console.debug("[BetterSEQTA+] Using main element as insertion point");
    }
    
    attempts++;
  }

  if (!insertionPoint) {
    console.error("[BetterSEQTA+] Could not find insertion point for Teach homepage after", attempts, "attempts");
    isLoadingHomePage = false;
    return;
  }
  
  console.debug("[BetterSEQTA+] Found insertionPoint:", {
    tagName: insertionPoint.tagName,
    id: insertionPoint.id,
    className: insertionPoint.className,
    children: insertionPoint.children.length,
  });

  // Create homepage root container
  const homeRoot = stringToHTML(`<div id="betterseqta-teach-home" class="home-root"></div>`);
  const homeContainer = homeRoot.firstChild as HTMLElement;
  
  if (!homeContainer) {
    console.error("[BetterSEQTA+] Failed to create homepage container");
    isLoadingHomePage = false;
    return;
  }

  // Create skeleton structure matching Learn homepage
  const skeletonStructure = stringToHTML(/* html */`
    <div class="home-container" id="home-container">
      <div class="border shortcut-container">
        <div class="border shortcuts" id="shortcuts"></div>
      </div>
      <div class="border timetable-container">
        <div class="home-subtitle">
          <h2 id="home-lesson-subtitle">Today's Lessons</h2>
          <div class="timetable-arrows">
            <svg width="24" height="24" viewBox="0 0 24 24" style="transform: scale(-1,1)" id="home-timetable-back">
              <g style="fill: currentcolor;"><path d="M8.578 16.359l4.594-4.594-4.594-4.594 1.406-1.406 6 6-6 6z"></path></g>
            </svg>
            <svg width="24" height="24" viewBox="0 0 24 24" id="home-timetable-forward">
              <g style="fill: currentcolor;"><path d="M8.578 16.359l4.594-4.594-4.594-4.594 1.406-1.406 6 6-6 6z"></path></g>
            </svg>
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
    </div>
  `);

  homeContainer.appendChild(skeletonStructure.firstChild!);

  // Insert homepage as a sibling to React's content container, not inside it
  // This prevents React from trying to manage our DOM
  try {
    console.debug("[BetterSEQTA+] Preparing to insert homepage");
    
    // Find the React content container to insert after it
    const reactContent = document.querySelector("[class*='Chrome__content']") as HTMLElement;
    
    if (reactContent && reactContent.parentElement === insertionPoint) {
      // Insert our homepage AFTER the React container
      // This way React won't try to manage it
      console.debug("[BetterSEQTA+] Inserting homepage after React content container");
      insertionPoint.insertBefore(homeContainer, reactContent.nextSibling);
      console.debug("[BetterSEQTA+] Homepage inserted successfully as sibling");
    } else {
      // Fallback: append to insertion point
      console.debug("[BetterSEQTA+] React container not found, appending to insertion point");
      insertionPoint.appendChild(homeContainer);
      console.debug("[BetterSEQTA+] Homepage appended successfully");
    }
    
    // Mark our container
    homeContainer.setAttribute('data-betterseqta-homepage', 'true');
    
  } catch (error) {
    console.error("[BetterSEQTA+] Error inserting homepage:", error);
    console.error("[BetterSEQTA+] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      insertionPoint: {
        tagName: insertionPoint.tagName,
        id: insertionPoint.id,
        className: insertionPoint.className,
      }
    });
    isLoadingHomePage = false;
    return;
  }

  // Animate homepage elements
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

  // Set up timetable listeners
  const cleanup = setupTimetableListeners();

  // Render shortcuts
  renderShortcuts();

  // Load data
  currentSelectedDate = new Date();
  const date = new Date();
  const TodayFormatted = formatDate(date);

  try {
    // Try to fetch data - Teach might use different endpoints
    // Try common variations of Teach endpoints
    const [timetableData, assessments, classes, prefs] = await Promise.all([
      // Try Teach endpoints first, fallback to Learn endpoints
      fetch(`${location.origin}/seqta/ta/load/timetable?`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: TodayFormatted,
          until: TodayFormatted,
        }),
      }).then((res) => res.ok ? res.json() : Promise.reject()).catch(() => 
        // Fallback: try without /ta/ prefix
        fetch(`${location.origin}/seqta/load/timetable?`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: TodayFormatted,
            until: TodayFormatted,
          }),
        }).then((res) => res.ok ? res.json() : Promise.reject()).catch(() => ({ payload: { items: [] } }))
      ),

      GetUpcomingAssessments(),

      GetActiveClasses(),

      fetch(`${location.origin}/seqta/ta/load/prefs?`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asArray: true, request: "userPrefs" }),
      }).then((res) => res.ok ? res.json() : Promise.reject()).catch(() => 
        // Fallback: try without /ta/ prefix
        fetch(`${location.origin}/seqta/load/prefs?`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ asArray: true, request: "userPrefs" }),
        }).then((res) => res.ok ? res.json() : Promise.reject()).catch(() => ({ payload: [] }))
      ),
    ]);

    // Render timetable
    const dayContainer = document.getElementById("day-container");
    if (dayContainer && timetableData.payload?.items?.length > 0) {
      const lessonArray = timetableData.payload.items.sort((a: any, b: any) =>
        a.from.localeCompare(b.from),
      );
      const colours = await GetLessonColours();

      dayContainer.innerHTML = "";
      for (let i = 0; i < lessonArray.length; i++) {
        const lesson = lessonArray[i];
        const subjectname = `timetable.subject.colour.${lesson.code}`;
        const subject = colours.find(
          (element: any) => element.name === subjectname,
        );

        lesson.colour = subject
          ? `--item-colour: ${subject.value};`
          : "--item-colour: #8e8e8e;";
        lesson.from = lesson.from.substring(0, 5);
        lesson.until = lesson.until.substring(0, 5);

        if (settingsState.timeFormat === "12") {
          lesson.from = convertTo12HourFormat(lesson.from);
          lesson.until = convertTo12HourFormat(lesson.until);
        }

        lesson.attendanceTitle = CheckUnmarkedAttendance(lesson.attendance);

        const div = makeLessonDiv(lesson, i + 1);
        if (GetThresholdOfColor(subject?.value) > 300) {
          const firstChild = div.firstChild as HTMLElement;
          if (firstChild) {
            firstChild.classList.add("day-inverted");
          }
        }
        dayContainer.appendChild(div.firstChild!);
      }

      if (currentSelectedDate.getDate() === date.getDate()) {
        for (let i = 0; i < lessonArray.length; i++) {
          CheckCurrentLesson(lessonArray[i], i + 1);
        }
        CheckCurrentLessonAll(lessonArray);
      }
    } else if (dayContainer) {
      dayContainer.innerHTML = `
        <div class="day-empty">
          <img src="${browser.runtime.getURL(LogoLight)}" />
          <p>No lessons available.</p>
        </div>`;
    }
    dayContainer?.classList.remove("loading");

    // Render assessments
    const activeClass = classes.find((c: any) => c.hasOwnProperty("active"));
    const activeSubjects = activeClass?.subjects || [];
    const activeSubjectCodes = activeSubjects.map((s: any) => s.code);
    const currentAssessments = assessments
      .filter((a: any) => activeSubjectCodes.includes(a.code))
      .sort(comparedate);

    const upcomingItems = document.getElementById("upcoming-items");
    if (upcomingItems) {
      await CreateUpcomingSection(currentAssessments, activeSubjects);
      upcomingItems.classList.remove("loading");
    }

    // Render notices
    const labelArray = prefs.payload
      ?.filter((item: any) => item.name === "notices.filters")
      ?.map((item: any) => item.value) || [];

    if (labelArray.length > 0) {
      const noticeContainer = document.getElementById("notice-container");
      if (noticeContainer) {
        const dateControl = document.querySelector(
          'input[type="date"]',
        ) as HTMLInputElement;
        if (dateControl) {
          dateControl.value = TodayFormatted;
          setupNotices(labelArray[0].split(" "), TodayFormatted);
        }
        noticeContainer.classList.remove("loading");
      }
    }
  } catch (error) {
    console.error("[BetterSEQTA+] Error loading homepage data:", error);
    // Remove loading states
    document.getElementById("day-container")?.classList.remove("loading");
    document.getElementById("upcoming-items")?.classList.remove("loading");
    document.getElementById("notice-container")?.classList.remove("loading");
  }

  // Update page title
  document.title = "Home ― BetterSEQTA+";
  
  isLoadingHomePage = false;
}

// Helper functions (adapted from LoadHomePage.ts)
async function GetUpcomingAssessments() {
  try {
    // Try Teach endpoint first
    let response = await fetch(
      `${location.origin}/seqta/ta/assessment/list/upcoming?`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({}),
      },
    );
    
    if (!response.ok) {
      // Fallback: try without /ta/
      response = await fetch(
        `${location.origin}/seqta/assessment/list/upcoming?`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({}),
        },
      );
    }
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.payload || [];
  } catch (error) {
    console.error("[BetterSEQTA+] Error fetching assessments:", error);
    return [];
  }
}

async function GetActiveClasses() {
  try {
    // Try Teach endpoint first
    let response = await fetch(
      `${location.origin}/seqta/ta/load/subjects?`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({}),
      },
    );
    
    if (!response.ok) {
      // Fallback: try without /ta/
      response = await fetch(
        `${location.origin}/seqta/load/subjects?`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({}),
        },
      );
    }
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.payload || [];
  } catch (error) {
    console.error("[BetterSEQTA+] Error fetching classes:", error);
    return [];
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function callHomeTimetable(date: string, change?: any) {
  var xhr = new XMLHttpRequest();
  // Try Teach endpoint first
  let endpoint = `${location.origin}/seqta/ta/load/timetable?`;
  xhr.open("POST", endpoint, true);
  xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
      }

      const DayContainer = document.getElementById("day-container")!;

      try {
        // Handle non-JSON responses (HTML error pages)
        if (!xhr.responseText.trim().startsWith('{')) {
          throw new Error("Invalid response format");
        }
        
        var serverResponse = JSON.parse(xhr.response);
        let lessonArray: Array<any> = [];

        if (serverResponse.payload?.items?.length > 0) {
          if (DayContainer.innerText || change) {
            for (let i = 0; i < serverResponse.payload.items.length; i++) {
              lessonArray.push(serverResponse.payload.items[i]);
            }
            lessonArray.sort(function (a, b) {
              return a.from.localeCompare(b.from);
            });

            GetLessonColours().then((colours) => {
              let subjects = colours;
              for (let i = 0; i < lessonArray.length; i++) {
                let subjectname = `timetable.subject.colour.${lessonArray[i].code}`;
                let subject = subjects.find(
                  (element: any) => element.name === subjectname,
                );
                if (!subject) {
                  lessonArray[i].colour = "--item-colour: #8e8e8e;";
                } else {
                  lessonArray[i].colour = `--item-colour: ${subject.value};`;
                  let result = GetThresholdOfColor(subject.value);
                  if (result > 300) {
                    lessonArray[i].invert = true;
                  }
                }

                lessonArray[i].from = lessonArray[i].from.substring(0, 5);
                lessonArray[i].until = lessonArray[i].until.substring(0, 5);

                if (settingsState.timeFormat === "12") {
                  lessonArray[i].from = convertTo12HourFormat(
                    lessonArray[i].from,
                  );
                  lessonArray[i].until = convertTo12HourFormat(
                    lessonArray[i].until,
                  );
                }

                lessonArray[i].attendanceTitle = CheckUnmarkedAttendance(
                  lessonArray[i].attendance,
                );
              }

              DayContainer.innerText = "";
              for (let i = 0; i < lessonArray.length; i++) {
                var div = makeLessonDiv(lessonArray[i], i + 1);
                if (lessonArray[i].invert) {
                  const div1 = div.firstChild! as HTMLElement;
                  div1.classList.add("day-inverted");
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
          var dummyDay = document.createElement("div");
          dummyDay.classList.add("day-empty");
          let img = document.createElement("img");
          img.src = browser.runtime.getURL(LogoLight);
          let text = document.createElement("p");
          text.innerText = "No lessons available.";
          dummyDay.append(img);
          dummyDay.append(text);
          DayContainer.append(dummyDay);
          DayContainer.classList.remove("loading");
        }
      } catch (error) {
        console.error("Error loading timetable data:", error);
        DayContainer.classList.remove("loading");
        DayContainer.innerHTML = "";
        const errorDiv = document.createElement("div");
        errorDiv.classList.add("day-empty");
        errorDiv.innerHTML = `
          <img src="${browser.runtime.getURL(LogoLight)}" />
          <p>Error loading lessons. Please try again.</p>
        `;
        DayContainer.append(errorDiv);
      }
    }
  };
  xhr.send(
    JSON.stringify({
      from: date,
      until: date,
    }),
  );
}

function CheckCurrentLessonAll(lessons: any) {
  LessonInterval = setInterval(
    function () {
      for (let i = 0; i < lessons.length; i++) {
        CheckCurrentLesson(lessons[i], i + 1);
      }
    }.bind(lessons),
    60000,
  );
}

async function CheckCurrentLesson(lesson: any, num: number) {
  const {
    from: startTime,
    until: endTime,
    code,
    description,
    room,
    staff,
  } = lesson;
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
    clearInterval(LessonInterval);
    return;
  }

  const isCurrentDate =
    currentSelectedDate.toLocaleDateString("en-au") ===
    currentDate.toLocaleDateString("en-au");

  if (isCurrentDate) {
    if (isValidTime) {
      element.classList.add("activelesson");
    } else {
      element.classList.remove("activelesson");
    }
  }
}

function makeLessonDiv(lesson: any, num: number) {
  if (!lesson) throw new Error("No lesson provided.");

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
  } = lesson;

  let lessonString = `
    <div class="day" id="${code + num}" style="${colour}">
      <h2>${description || "Unknown"}</h2>
      <h3>${staff || "Unknown"}</h3>
      <h3>${room || "Unknown"}</h3>
      <h4>${from || "Unknown"} - ${until || "Unknown"}</h4>
      <h5>${attendanceTitle || "Unknown"}</h5>
  `;

  if (programmeID !== 0) {
    lessonString += `
      <div class="day-button clickable" style="right: 5px;" onclick="window.location.href='/assessments/${programmeID}:${metaID}'">${assessmentsicon}</div>
      <div class="day-button clickable" style="right: 35px;" onclick="window.location.href='/courses/${programmeID}:${metaID}'">${coursesicon}</div>
    `;
  }

  if (assessments && assessments.length > 0) {
    const assessmentString = assessments
      .map(
        (element: any) =>
          `<p onclick="window.location.href = '/assessments/${programmeID}:${metaID}?item=${element.id}';">${element.title}</p>`,
      )
      .join("");

    lessonString += `
      <div class="fixed-tooltip assessmenttooltip">
        <svg style="width:28px;height:28px;border-radius:0;" viewBox="0 0 24 24">
          <path fill="#ed3939" d="M16 2H4C2.9 2 2 2.9 2 4V20C2 21.11 2.9 22 4 22H16C17.11 22 18 21.11 18 20V4C18 2.9 17.11 2 16 2M16 20H4V4H6V12L8.5 9.75L11 12V4H16V20M20 15H22V17H20V15M22 7V13H20V7H22Z" />
        </svg>
        <div class="tooltiptext">${assessmentString}</div>
      </div>
    `;
  }

  lessonString += "</div>";
  const element = stringToHTML(lessonString);
  setupFixedTooltips(element);
  return element;
}

function CheckUnmarkedAttendance(lessonattendance: any) {
  if (lessonattendance) {
    var lesson = lessonattendance.label;
  } else {
    lesson = " ";
  }
  return lesson;
}

function comparedate(obj1: any, obj2: any) {
  if (obj1.date < obj2.date) {
    return -1;
  }
  if (obj1.date > obj2.date) {
    return 1;
  }
  return 0;
}

async function CreateUpcomingSection(assessments: any, activeSubjects: any) {
  let upcomingitemcontainer = document.querySelector("#upcoming-items");
  let overdueDates = [];
  let upcomingDates = {};

  var Today = new Date();

  for (let i = 0; i < assessments.length; i++) {
    const assessment = assessments[i];
    let assessmentdue = new Date(assessment.due);

    CheckSpecialDay(Today, assessmentdue);
    if (assessmentdue < Today) {
      if (!CheckSpecialDay(Today, assessmentdue)) {
        overdueDates.push(assessment);
        assessments.splice(i, 1);
        i--;
      }
    }
  }

  const colours = await GetLessonColours();

  let subjects = colours;
  for (let i = 0; i < assessments.length; i++) {
    let subjectname = `timetable.subject.colour.${assessments[i].code}`;
    let subject = subjects.find((element: any) => element.name === subjectname);

    if (!subject) {
      assessments[i].colour = "--item-colour: #8e8e8e;";
    } else {
      assessments[i].colour = `--item-colour: ${subject.value};`;
      GetThresholdOfColor(subject.value);
    }
  }

  for (let i = 0; i < activeSubjects.length; i++) {
    const element = activeSubjects[i];
    let subjectname = `timetable.subject.colour.${element.code}`;
    let colour = colours.find((element: any) => element.name === subjectname);
    if (!colour) {
      element.colour = "--item-colour: #8e8e8e;";
    } else {
      element.colour = `--item-colour: ${colour.value};`;
      let result = GetThresholdOfColor(colour.value);
      if (result > 300) {
        element.invert = true;
      }
    }
  }

  CreateFilters(activeSubjects);

  let type;
  let class_;

  for (let i = 0; i < assessments.length; i++) {
    const element: any = assessments[i];
    if (!upcomingDates[element.due as keyof typeof upcomingDates]) {
      let dateObj: any = new Object();
      dateObj.div = CreateElement(
        (type = "div"),
        (class_ = "upcoming-date-container"),
      );
      dateObj.assessments = [];
      (upcomingDates[element.due as keyof typeof upcomingDates] as any) =
        dateObj;
    }
    let assessmentDateDiv =
      upcomingDates[element.due as keyof typeof upcomingDates];

    if (assessmentDateDiv) {
      (assessmentDateDiv as any).assessments.push(element);
    }
  }

  for (var date in upcomingDates) {
    let assessmentdue = new Date(
      (
        upcomingDates[date as keyof typeof upcomingDates] as any
      ).assessments[0].due,
    );
    let specialcase = CheckSpecialDay(Today, assessmentdue);
    let assessmentDate;

    if (specialcase) {
      let datecase: string = specialcase!;
      assessmentDate = createAssessmentDateDiv(
        date,
        upcomingDates[date as keyof typeof upcomingDates],
        datecase,
      );
    } else {
      assessmentDate = createAssessmentDateDiv(
        date,
        upcomingDates[date as keyof typeof upcomingDates],
      );
    }

    if (specialcase === "Yesterday") {
      upcomingitemcontainer!.insertBefore(
        assessmentDate,
        upcomingitemcontainer!.firstChild,
      );
    } else {
      upcomingitemcontainer!.append(assessmentDate);
    }
  }
  FilterUpcomingAssessments(settingsState.subjectfilters);
}

function createAssessmentDateDiv(date: string, value: any, datecase?: any) {
  var options = {
    weekday: "long" as "long",
    month: "long" as "long",
    day: "numeric" as "numeric",
  };
  const FormattedDate = new Date(date);

  const assessments = value.assessments;
  const container = value.div;

  let DateTitleDiv = document.createElement("div");
  DateTitleDiv.classList.add("upcoming-date-title");

  if (datecase) {
    let datetitle = document.createElement("h5");
    datetitle.classList.add("upcoming-special-day");
    datetitle.innerText = datecase;
    DateTitleDiv.append(datetitle);
    container.setAttribute("data-day", datecase);
  }

  let DateTitle = document.createElement("h5");
  DateTitle.innerText = FormattedDate.toLocaleDateString("en-AU", options);
  DateTitleDiv.append(DateTitle);

  container.append(DateTitleDiv);

  let assessmentContainer = document.createElement("div");
  assessmentContainer.classList.add("upcoming-date-assessments");

  for (let i = 0; i < assessments.length; i++) {
    const element = assessments[i];
    let item = document.createElement("div");
    item.classList.add("upcoming-assessment");
    item.setAttribute("data-subject", element.code);
    item.id = `assessment${element.id}`;

    item.style.cssText = element.colour;

    let titlediv = document.createElement("div");
    titlediv.classList.add("upcoming-subject-title");

    let titlesvg =
      stringToHTML(`<svg viewBox="0 0 24 24" style="width:35px;height:35px;fill:white;">
    <path d="M6 20H13V22H6C4.89 22 4 21.11 4 20V4C4 2.9 4.89 2 6 2H18C19.11 2 20 2.9 20 4V12.54L18.5 11.72L18 12V4H13V12L10.5 9.75L8 12V4H6V20M24 17L18.5 14L13 17L18.5 20L24 17M15 19.09V21.09L18.5 23L22 21.09V19.09L18.5 21L15 19.09Z"></path>
    </svg>`).firstChild;
    titlediv.append(titlesvg!);

    let detailsdiv = document.createElement("div");
    detailsdiv.classList.add("upcoming-details");
    let detailstitle = document.createElement("h5");
    detailstitle.innerText = `${element.subject} assessment`;
    let subject = document.createElement("p");
    subject.innerText = element.title;
    subject.classList.add("upcoming-assessment-title");
    subject.onclick = function () {
      window.location.href = `/assessments/${element.programmeID}:${element.metaclassID}?item=${element.id}`;
    };
    detailsdiv.append(detailstitle);
    detailsdiv.append(subject);

    item.append(titlediv);
    item.append(detailsdiv);
    assessmentContainer.append(item);
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
    // Try Teach endpoint first
    let response = await fetch(`${location.origin}/seqta/ta/load/prefs?`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ request: "userPrefs", asArray: true }),
    });
    
    if (!response.ok) {
      // Fallback: try without /ta/
      response = await fetch(`${location.origin}/seqta/load/prefs?`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ request: "userPrefs", asArray: true }),
      });
    }
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.payload || [];
  } catch (error) {
    console.error("[BetterSEQTA+] Error fetching lesson colours:", error);
    return [];
  }
}

function CreateFilters(subjects: any) {
  let filteroptions = settingsState.subjectfilters;

  let filterdiv = document.querySelector("#upcoming-filters");
  for (let i = 0; i < subjects.length; i++) {
    const element = subjects[i];

    if (!Object.prototype.hasOwnProperty.call(filteroptions, element.code)) {
      filteroptions[element.code] = true;
      settingsState.subjectfilters = filteroptions;
    }
    let elementdiv = CreateSubjectFilter(
      element.code,
      element.colour,
      filteroptions[element.code],
    );

    filterdiv!.append(elementdiv);
  }
}

function CreateSubjectFilter(
  subjectcode: any,
  itemcolour: string,
  checked: any,
) {
  let label = CreateElement("label", "upcoming-checkbox-container");
  label.innerText = subjectcode;
  let input1 = CreateElement("input");
  const input = input1 as HTMLInputElement;
  input.type = "checkbox";
  input.checked = checked;
  input.id = `filter-${subjectcode}`;
  label.style.cssText = itemcolour;
  let span = CreateElement("span", "upcoming-checkmark");
  label.append(input);
  label.append(span);

  input.addEventListener("change", function (change) {
    let filters = settingsState.subjectfilters;
    let id = (change.target as HTMLInputElement)!.id.split("-")[1];
    filters[id] = (change.target as HTMLInputElement)!.checked;

    settingsState.subjectfilters = filters;
  });

  return label;
}

function SetTimetableSubtitle() {
  const homelessonsubtitle = document.getElementById("home-lesson-subtitle");
  if (!homelessonsubtitle) return;

  const date = new Date();
  const isSameMonth =
    date.getFullYear() === currentSelectedDate.getFullYear() &&
    date.getMonth() === currentSelectedDate.getMonth();

  if (isSameMonth) {
    const dayDiff = date.getDate() - currentSelectedDate.getDate();
    switch (dayDiff) {
      case 0:
        homelessonsubtitle.innerText = "Today's Lessons";
        break;
      case 1:
        homelessonsubtitle.innerText = "Yesterday's Lessons";
        break;
      case -1:
        homelessonsubtitle.innerText = "Tomorrow's Lessons";
        break;
      default:
        homelessonsubtitle.innerText = formatDateString(currentSelectedDate);
    }
  } else {
    homelessonsubtitle.innerText = formatDateString(currentSelectedDate);
  }
}

function formatDateString(date: Date): string {
  return `${date.toLocaleString("en-us", { weekday: "short" })} ${date.toLocaleDateString("en-au")}`;
}

function setupNotices(labelArray: string[], date: string) {
  const dateControl = document.querySelector(
    'input[type="date"]',
  ) as HTMLInputElement;

  const fetchNotices = async (date: string) => {
    let data;

    if (settingsState.mockNotices) {
      data = getMockNotices();
    } else {
      try {
        // Try Teach endpoint first
        let response = await fetch(
          `${location.origin}/seqta/ta/load/notices?`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({ date }),
          },
        );
        
        if (!response.ok) {
          // Fallback: try without /ta/
          response = await fetch(
            `${location.origin}/seqta/load/notices?`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json; charset=utf-8" },
              body: JSON.stringify({ date }),
            },
          );
        }
        
        if (response.ok) {
          data = await response.json();
        } else {
          data = { payload: [] };
        }
      } catch (error) {
        console.error("[BetterSEQTA+] Error fetching notices:", error);
        data = { payload: [] };
      }
    }

    processNotices(data, labelArray);
  };

  const debouncedInputChange = debounce((e: Event) => {
    const target = e.target as HTMLInputElement;
    fetchNotices(target.value);
  }, 250);

  dateControl?.addEventListener("input", debouncedInputChange);
  fetchNotices(date);

  return () => dateControl?.removeEventListener("input", debouncedInputChange);
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: any;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function processNotices(response: any, labelArray: string[]) {
  const NoticeContainer = document.getElementById("notice-container");
  if (!NoticeContainer) return;

  NoticeContainer.innerHTML = "";

  const notices = response.payload || [];
  if (!notices.length) {
    const dummyNotice = document.createElement("div");
    dummyNotice.textContent = "No notices for today.";
    dummyNotice.classList.add("dummynotice");
    NoticeContainer.append(dummyNotice);
    return;
  }

  const fragment = document.createDocumentFragment();

  notices.forEach((notice: any) => {
    const shouldInclude =
      settingsState.mockNotices ||
      labelArray.includes(JSON.stringify(notice.label));

    if (shouldInclude) {
      const colour = processNoticeColor(notice.colour);
      const noticeElement = createNoticeElement(notice, colour);
      fragment.appendChild(noticeElement);
    }
  });

  NoticeContainer.appendChild(fragment);
}

function processNoticeColor(colour: string): string | undefined {
  if (typeof colour === "string") {
    const rgb = GetThresholdOfColor(colour);
    if (rgb < 100 && settingsState.DarkMode) {
      return undefined;
    }
  }
  return colour;
}

function createNoticeElement(notice: any, colour: string | undefined): Node {
  const textPreview = notice.contents
    ?.replace(/<[^>]*>/g, "")
    ?.replace(/\[\[[\w]+[:][\w]+[\]\]]+/g, "")
    ?.replace(/\s+/g, " ")
    ?.trim()
    ?.substring(0, 150) + (notice.contents?.length > 150 ? "..." : "") || "";
  
  const noticeId = `notice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const htmlContent = `
    <div class="notice-unified-content notice-card-state" data-notice-id="${noticeId}" style="--colour: ${colour || "#8e8e8e"}; position: relative; background: var(--background-primary); cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.1);">
      <div class="notice-header">
        <div class="notice-badge-row">
          <span class="notice-badge" style="background: linear-gradient(135deg, ${colour || "#8e8e8e"}, ${colour || "#8e8e8e"}dd); color: white;">
            ${notice.label_title || "General"}
          </span>
          <span class="notice-staff">${notice.staff || ""}</span>
        </div>
        <button class="notice-close-btn" style="opacity: 0; pointer-events: none;">&times;</button>
      </div>
      <h2 class="notice-content-title">${notice.title || ""}</h2>
      <div class="notice-content-body">${textPreview}</div>
    </div>`;

  const element = stringToHTML(htmlContent).firstChild as HTMLElement;
  if (element) {
    element.addEventListener("click", () =>
      openNoticeModal(notice, colour, element),
    );
  }
  return element!;
}

function openNoticeModal(
  notice: any,
  colour: string | undefined,
  sourceElement: HTMLElement,
) {
  // Simplified notice modal - can be expanded later
  const cleanContent = notice.contents
    ?.replace(/\[\[[\w]+[:][\w]+[\]\]]+/g, "")
    ?.replace(/ +/, " ") || "";

  const existingModal = document.getElementById("notice-modal");
  if (existingModal) {
    existingModal.remove();
  }

  alert(`${notice.title || "Notice"}\n\n${cleanContent.substring(0, 500)}`);
}

/**
 * Loads the BetterSEQTA+ homepage for SEQTA Teach
 * Navigates to /betterseqta-home and sets up route listener
 */
export async function loadTeachHomePage() {
  // Set up route listener to handle show/hide
  setupRouteListener();

  // Navigate to BetterSEQTA+ homepage route if not already there
  const currentPath = window.location.pathname;
  if (!currentPath.includes(BETTERSEQTA_HOME_ROUTE)) {
    window.history.pushState({}, '', BETTERSEQTA_HOME_ROUTE);
    // Trigger any navigation listeners that Teach might have
    window.dispatchEvent(new PopStateEvent('popstate'));
    // Wait for navigation to complete
    await delay(500);
  }

  // Load the homepage content
  await loadTeachHomePageContent();
}
