import { delay } from "../delay"
import stringToHTML from "../stringToHTML"
import { animate, stagger } from "motion"
import { settingsState } from "../listeners/SettingsState"

import { addShortcuts } from "../Adders/AddShortcuts"

import browser from "webextension-polyfill"
import { GetThresholdOfColor } from "@/seqta/ui/colors/getThresholdColour"
import LogoLight from "@/resources/icons/betterseqta-light-icon.png"
import { CreateCustomShortcutDiv } from "@/seqta/utils/CreateEnable/CreateCustomShortcutDiv"

import assessmentsicon from "@/seqta/icons/assessmentsIcon"
import coursesicon from "@/seqta/icons/coursesIcon"

import { FilterUpcomingAssessments } from "@/seqta/utils/FilterUpcomingAssessments"

import { CreateElement } from "@/seqta/utils/CreateEnable/CreateElement"

import { convertTo12HourFormat } from "../convertTo12HourFormat"

import { enableNotificationCollector } from "@/seqta/utils/CreateEnable/EnableNotificationCollector"

let LessonInterval: any
let currentSelectedDate = new Date()

export async function loadHomePage() {
    console.info("[BetterSEQTA+] Started Loading Home Page")
  
    // Wait for the DOM to finish clearing
    await delay(10)
  
    document.title = "Home ― SEQTA Learn"
    const element = document.querySelector("[data-key=home]")
    element?.classList.add("active")
  
    // Cache DOM queries
    const main = document.getElementById("main")
    if (!main) {
      console.error("[BetterSEQTA+] Main element not found.")
      return
    }
  
    // Create root container first
    const homeRoot = stringToHTML(
      /* html */ `<div id="home-root" class="home-root"></div>`,
    )
  
    // Clear main and add home root
    main.innerHTML = ""
    main.appendChild(homeRoot?.firstChild!)
  
    // Get reference to home container for all subsequent additions
    const homeContainer = document.getElementById("home-root")
    if (!homeContainer) return
  
    const skeletonStructure = stringToHTML(/* html */ `
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
      </div>`)
  
    // Add skeleton structure
    homeContainer.appendChild(skeletonStructure.firstChild!)
  
    // Run animations if enabled
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
      )
    }
  
    // Setup event listeners with cleanup
    const cleanup = setupTimetableListeners()
  
    // Initialize shortcuts immediately
    try {
      addShortcuts(settingsState.shortcuts)
    } catch (err: any) {
      console.error("[BetterSEQTA+] Error adding shortcuts:", err.message || err)
    }
    AddCustomShortcutsToPage()
  
    // Get current date
    const date = new Date()
    const TodayFormatted = formatDate(date)
  
    // Start all data fetching in parallel
    const [timetablePromise, assessmentsPromise, classesPromise, prefsPromise] = [
      // Timetable data
      fetch(`${location.origin}/seqta/student/load/timetable?`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: TodayFormatted,
          until: TodayFormatted,
          student: 69,
        }),
      }).then((res) => res.json()),
  
      // Assessments data
      GetUpcomingAssessments(),
  
      // Classes data
      GetActiveClasses(),
  
      // Preferences data
      fetch(`${location.origin}/seqta/student/load/prefs?`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asArray: true, request: "userPrefs" }),
      }).then((res) => res.json()),
    ]
  
    // Process all data in parallel
    const [timetableData, assessments, classes, prefs] = await Promise.all([
      timetablePromise,
      assessmentsPromise,
      classesPromise,
      prefsPromise,
    ])
  
    // Process timetable data
    const dayContainer = document.getElementById("day-container")
    if (dayContainer && timetableData.payload.items.length > 0) {
      const lessonArray = timetableData.payload.items.sort((a: any, b: any) =>
        a.from.localeCompare(b.from),
      )
      const colours = await GetLessonColours()
  
      // Process and display lessons
      dayContainer.innerHTML = ""
      for (let i = 0; i < lessonArray.length; i++) {
        const lesson = lessonArray[i]
        const subjectname = `timetable.subject.colour.${lesson.code}`
        const subject = colours.find(
          (element: any) => element.name === subjectname,
        )
  
        lesson.colour = subject
          ? `--item-colour: ${subject.value};`
          : "--item-colour: #8e8e8e;"
        lesson.from = lesson.from.substring(0, 5)
        lesson.until = lesson.until.substring(0, 5)
  
        if (settingsState.timeFormat === "12") {
          lesson.from = convertTo12HourFormat(lesson.from)
          lesson.until = convertTo12HourFormat(lesson.until)
        }
  
        lesson.attendanceTitle = CheckUnmarkedAttendance(lesson.attendance)
  
        const div = makeLessonDiv(lesson, i + 1)
        if (GetThresholdOfColor(subject?.value) > 300) {
          const firstChild = div.firstChild as HTMLElement
          if (firstChild) {
            firstChild.classList.add("day-inverted")
          }
        }
        dayContainer.appendChild(div.firstChild!)
      }
  
      // Check current lessons
      if (currentSelectedDate.getDate() === date.getDate()) {
        for (let i = 0; i < lessonArray.length; i++) {
          CheckCurrentLesson(lessonArray[i], i + 1)
        }
        CheckCurrentLessonAll(lessonArray)
      }
    } else if (dayContainer) {
      dayContainer.innerHTML = /* html */ `
        <div class="day-empty">
          <img src="${browser.runtime.getURL(LogoLight)}" />
          <p>No lessons available.</p>
        </div>`
    }
    dayContainer?.classList.remove("loading")
  
    // Process assessments data
    const activeClass = classes.find((c: any) => c.hasOwnProperty("active"))
    const activeSubjects = activeClass?.subjects || []
    const activeSubjectCodes = activeSubjects.map((s: any) => s.code)
    const currentAssessments = assessments
      .filter((a: any) => activeSubjectCodes.includes(a.code))
      .sort(comparedate)
  
    const upcomingItems = document.getElementById("upcoming-items")
    if (upcomingItems) {
      await CreateUpcomingSection(currentAssessments, activeSubjects)
      upcomingItems.classList.remove("loading")
    }
  
    // Process notices data
    const labelArray = prefs.payload
      .filter((item: any) => item.name === "notices.filters")
      .map((item: any) => item.value)
  
    if (labelArray.length > 0) {
      const noticeContainer = document.getElementById("notice-container")
      if (noticeContainer) {
        const dateControl = document.querySelector(
          'input[type="date"]',
        ) as HTMLInputElement
        if (dateControl) {
          dateControl.value = TodayFormatted
          setupNotices(labelArray[0].split(" "), TodayFormatted)
        }
        noticeContainer.classList.remove("loading")
      }
    }
  
    if (settingsState.notificationcollector) {
      enableNotificationCollector()
    }
  
    return cleanup
  }

  async function GetUpcomingAssessments() {
    let func = fetch(
      `${location.origin}/seqta/student/assessment/list/upcoming?`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ student: 69 }),
      },
    )
  
    return func
      .then((result) => result.json())
      .then((response) => response.payload)
  }

  function setupTimetableListeners() {
    const listeners: Array<() => void> = []
    const timetableBack = document.getElementById("home-timetable-back")
    const timetableForward = document.getElementById("home-timetable-forward")
  
    function changeTimetable(value: number) {
      currentSelectedDate.setDate(currentSelectedDate.getDate() + value)
      const formattedDate = formatDate(currentSelectedDate)
      callHomeTimetable(formattedDate, true)
      SetTimetableSubtitle()
    }
  
    const backHandler = () => changeTimetable(-1)
    const forwardHandler = () => changeTimetable(1)
  
    timetableBack?.addEventListener("click", backHandler)
    timetableForward?.addEventListener("click", forwardHandler)
  
    listeners.push(
      () => timetableBack?.removeEventListener("click", backHandler),
      () => timetableForward?.removeEventListener("click", forwardHandler),
    )
  
    return () => listeners.forEach((cleanup) => cleanup())
  }

  function formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  async function GetActiveClasses() {
    try {
      const response = await fetch(
        `${location.origin}/seqta/student/load/subjects?`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({}),
        },
      )
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
  
      const data = await response.json()
      return data.payload
    } catch (error) {
      console.error("Oops! There was a problem fetching active classes:", error)
    }
  }

  function setupNotices(labelArray: string[], date: string) {
    const dateControl = document.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement
  
    const fetchNotices = async (date: string) => {
      const response = await fetch(
        `${location.origin}/seqta/student/load/notices?`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ date }),
        },
      )
      const data = await response.json()
      processNotices(data, labelArray)
    }
  
    // Debounce the input handler
    const debouncedInputChange = debounce((e: Event) => {
      const target = e.target as HTMLInputElement
      fetchNotices(target.value)
    }, 250)
  
    dateControl?.addEventListener("input", debouncedInputChange)
    fetchNotices(date)
  
    return () => dateControl?.removeEventListener("input", debouncedInputChange)
  }

  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  function comparedate(obj1: any, obj2: any) {
    if (obj1.date < obj2.date) {
      return -1
    }
    if (obj1.date > obj2.date) {
      return 1
    }
    return 0
  }

  async function AddCustomShortcutsToPage() {
    let customshortcuts: any = settingsState.customshortcuts
    if (customshortcuts.length > 0) {
      for (let i = 0; i < customshortcuts.length; i++) {
        const element = customshortcuts[i]
        CreateCustomShortcutDiv(element)
      }
    }
  }

  function processNotices(response: any, labelArray: string[]) {
    const NoticeContainer = document.getElementById("notice-container")
    if (!NoticeContainer) return
  
    // Clear existing notices
    NoticeContainer.innerHTML = ""
  
    const notices = response.payload
    if (!notices.length) {
      const dummyNotice = document.createElement("div")
      dummyNotice.textContent = "No notices for today."
      dummyNotice.classList.add("dummynotice")
      NoticeContainer.append(dummyNotice)
      return
    }
  
    // Create document fragment for batch DOM updates
    const fragment = document.createDocumentFragment()
  
    // Process notices in batch
    notices.forEach((notice: any) => {
      if (labelArray.includes(JSON.stringify(notice.label))) {
        const colour = processNoticeColor(notice.colour)
        const noticeElement = createNoticeElement(notice, colour)
        fragment.appendChild(noticeElement)
      }
    })
  
    // Single DOM update
    NoticeContainer.appendChild(fragment)
  }

  function processNoticeColor(colour: string): string | undefined {
    if (typeof colour === "string") {
      const rgb = GetThresholdOfColor(colour)
      if (rgb < 100 && settingsState.DarkMode) {
        return undefined
      }
    }
    return colour
  }

  function createNoticeElement(notice: any, colour: string | undefined): Node {
    const htmlContent = `
      <div class="notice" style="--colour: ${colour}">
        <h3 style="color:var(--colour)">${notice.title}</h3>
        ${notice.label_title !== undefined ? `<h5 style="color:var(--colour)">${notice.label_title}</h5>` : ""}
        <h6 style="color:var(--colour)">${notice.staff}</h6>
        ${notice.contents.replace(/\[\[[\w]+[:][\w]+[\]\]]+/g, "").replace(/ +/, " ")}
        <div class="colourbar" style="background: var(--colour)"></div>
      </div>`
  
    const element = stringToHTML(htmlContent).firstChild
    if (element instanceof HTMLElement) {
      element.style.setProperty("--colour", colour ?? "")
    }
    return element!
  }

  function callHomeTimetable(date: string, change?: any) {
    // Creates a HTTP Post Request to the SEQTA page for the students timetable
    var xhr = new XMLHttpRequest()
    xhr.open("POST", `${location.origin}/seqta/student/load/timetable?`, true)
    // Sets the response type to json
    xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8")
  
    xhr.onreadystatechange = function () {
      // Once the response is ready
      if (xhr.readyState === 4) {
        var serverResponse = JSON.parse(xhr.response)
        let lessonArray: Array<any> = []
        const DayContainer = document.getElementById("day-container")!
        // If items in response:
        if (serverResponse.payload.items.length > 0) {
          if (DayContainer.innerText || change) {
            for (let i = 0; i < serverResponse.payload.items.length; i++) {
              lessonArray.push(serverResponse.payload.items[i])
            }
            lessonArray.sort(function (a, b) {
              return a.from.localeCompare(b.from)
            })
            // If items in the response, set each corresponding value into divs
            // lessonArray = lessonArray.splice(1)
            GetLessonColours().then((colours) => {
              let subjects = colours
              for (let i = 0; i < lessonArray.length; i++) {
                let subjectname = `timetable.subject.colour.${lessonArray[i].code}`
  
                let subject = subjects.find(
                  (element: any) => element.name === subjectname,
                )
                if (!subject) {
                  lessonArray[i].colour = "--item-colour: #8e8e8e;"
                } else {
                  lessonArray[i].colour = `--item-colour: ${subject.value};`
                  let result = GetThresholdOfColor(subject.value)
  
                  if (result > 300) {
                    lessonArray[i].invert = true
                  }
                }
                // Removes seconds from the start and end times
                lessonArray[i].from = lessonArray[i].from.substring(0, 5)
                lessonArray[i].until = lessonArray[i].until.substring(0, 5)
  
                if (settingsState.timeFormat === "12") {
                  lessonArray[i].from = convertTo12HourFormat(lessonArray[i].from)
                  lessonArray[i].until = convertTo12HourFormat(
                    lessonArray[i].until,
                  )
                }
  
                // Checks if attendance is unmarked, and sets the string to " ".
                lessonArray[i].attendanceTitle = CheckUnmarkedAttendance(
                  lessonArray[i].attendance,
                )
              }
              // If on home page, apply each lesson to HTML with information in each div
              DayContainer.innerText = ""
              for (let i = 0; i < lessonArray.length; i++) {
                var div = makeLessonDiv(lessonArray[i], i + 1)
                // Append each of the lessons into the day-container
                if (lessonArray[i].invert) {
                  const div1 = div.firstChild! as HTMLElement
                  div1.classList.add("day-inverted")
                }
  
                DayContainer.append(div.firstChild as HTMLElement)
              }
  
              const today = new Date()
              if (currentSelectedDate.getDate() == today.getDate()) {
                for (let i = 0; i < lessonArray.length; i++) {
                  CheckCurrentLesson(lessonArray[i], i + 1)
                }
                // For each lesson, check the start and end times
                CheckCurrentLessonAll(lessonArray)
              }
            })
          }
        } else {
          DayContainer.innerHTML = ""
          var dummyDay = document.createElement("div")
          dummyDay.classList.add("day-empty")
          let img = document.createElement("img")
          img.src = browser.runtime.getURL(LogoLight)
          let text = document.createElement("p")
          text.innerText = "No lessons available."
          dummyDay.append(img)
          dummyDay.append(text)
          DayContainer.append(dummyDay)
        }
      }
    }
    xhr.send(
      JSON.stringify({
        // Information sent to SEQTA page as a request with the dates and student number
        from: date,
        until: date,
        // Funny number
        student: 69,
      }),
    )
  }

  function CheckCurrentLessonAll(lessons: any) {
    // Checks each lesson and sets an interval to run every 60 seconds to continue updating
    LessonInterval = setInterval(
      function () {
        for (let i = 0; i < lessons.length; i++) {
          CheckCurrentLesson(lessons[i], i + 1)
        }
      }.bind(lessons),
      60000,
    )
  }

  async function CheckCurrentLesson(lesson: any, num: number) {
    const {
      from: startTime,
      until: endTime,
      code,
      description,
      room,
      staff,
    } = lesson
    const currentDate = new Date()
  
    // Create Date objects for start and end times
    const [startHour, startMinute] = startTime.split(":").map(Number)
    const [endHour, endMinute] = endTime.split(":").map(Number)
  
    const startDate = new Date(currentDate)
    startDate.setHours(startHour, startMinute, 0)
  
    const endDate = new Date(currentDate)
    endDate.setHours(endHour, endMinute, 0)
  
    // Check if the current time is within the lesson time range
    const isValidTime = startDate < currentDate && endDate > currentDate
  
    const elementId = `${code}${num}`
    const element = document.getElementById(elementId)
  
    if (!element) {
      clearInterval(LessonInterval)
      return
    }
  
    const isCurrentDate =
      currentSelectedDate.toLocaleDateString("en-au") ===
      currentDate.toLocaleDateString("en-au")
  
    if (isCurrentDate) {
      if (isValidTime) {
        element.classList.add("activelesson")
      } else {
        element.classList.remove("activelesson")
      }
    }
  
    const minutesUntilStart = Math.floor(
      (startDate.getTime() - currentDate.getTime()) / 60000,
    )
  
    if (
      minutesUntilStart !== 5 ||
      settingsState.lessonalert ||
      !window.Notification
    )
      return
  
    if (Notification.permission !== "granted")
      await Notification.requestPermission()
  
    try {
      new Notification("Next Lesson in 5 Minutes:", {
        body: `Subject: ${description}${room ? `\nRoom: ${room}` : ""}${staff ? `\nTeacher: ${staff}` : ""}`,
      })
    } catch (error) {
      console.error(error)
    }
  }

  function makeLessonDiv(lesson: any, num: number) {
    if (!lesson) throw new Error("No lesson provided.")
  
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
    } = lesson
  
    // Construct the base lesson string with default values using ternary operators
    let lessonString = /* html */ `
      <div class="day" id="${code + num}" style="${colour}">
        <h2>${description || "Unknown"}</h2>
        <h3>${staff || "Unknown"}</h3>
        <h3>${room || "Unknown"}</h3>
        <h4>${from || "Unknown"} - ${until || "Unknown"}</h4>
        <h5>${attendanceTitle || "Unknown"}</h5>
    `
  
    // Add buttons for assessments and courses if applicable
    if (programmeID !== 0) {
      lessonString += /* html */ `
        <div class="day-button clickable" style="right: 5px;" onclick="location.href='${buildAssessmentURL(programmeID, metaID)}'">${assessmentsicon}</div>
        <div class="day-button clickable" style="right: 35px;" onclick="location.href='../#?page=/courses/${programmeID}:${metaID}'">${coursesicon}</div>
      `
    }
  
    // Add assessments if they exist
    if (assessments && assessments.length > 0) {
      const assessmentString = assessments
        .map(
          (element: any) =>
            `<p onclick="location.href = '${buildAssessmentURL(programmeID, metaID, element.id)}';">${element.title}</p>`,
        )
        .join("")
  
      lessonString += /* html */ `
        <div class="tooltip assessmenttooltip">
          <svg style="width:28px;height:28px;border-radius:0;" viewBox="0 0 24 24">
            <path fill="#ed3939" d="M16 2H4C2.9 2 2 2.9 2 4V20C2 21.11 2.9 22 4 22H16C17.11 22 18 21.11 18 20V4C18 2.9 17.11 2 16 2M16 20H4V4H6V12L8.5 9.75L11 12V4H16V20M20 15H22V17H20V15M22 7V13H20V7H22Z" />
          </svg>
          <div class="tooltiptext">${assessmentString}</div>
        </div>
      `
    }
  
    lessonString += "</div>"
  
    return stringToHTML(lessonString)
  }

  function buildAssessmentURL(programmeID: any, metaID: any, itemID = "") {
    const base = "../#?page=/assessments/"
    return itemID
      ? `${base}${programmeID}:${metaID}&item=${itemID}`
      : `${base}${programmeID}:${metaID}`
  }

  function CheckUnmarkedAttendance(lessonattendance: any) {
    if (lessonattendance) {
      var lesson = lessonattendance.label
    } else {
      lesson = " "
    }
    return lesson
  }

  async function CreateUpcomingSection(assessments: any, activeSubjects: any) {
    let upcomingitemcontainer = document.querySelector("#upcoming-items")
    let overdueDates = []
    let upcomingDates = {}
  
    var Today = new Date()
  
    // Removes overdue assessments from the upcoming assessments array and pushes to overdue array
    for (let i = 0; i < assessments.length; i++) {
      const assessment = assessments[i]
      let assessmentdue = new Date(assessment.due)
  
      CheckSpecialDay(Today, assessmentdue)
      if (assessmentdue < Today) {
        if (!CheckSpecialDay(Today, assessmentdue)) {
          overdueDates.push(assessment)
          assessments.splice(i, 1)
          i--
        }
      }
    }
  
    var TomorrowDate = new Date()
    TomorrowDate.setDate(TomorrowDate.getDate() + 1)
  
    const colours = await GetLessonColours()
  
    let subjects = colours
    for (let i = 0; i < assessments.length; i++) {
      let subjectname = `timetable.subject.colour.${assessments[i].code}`
  
      let subject = subjects.find((element: any) => element.name === subjectname)
  
      if (!subject) {
        assessments[i].colour = "--item-colour: #8e8e8e;"
      } else {
        assessments[i].colour = `--item-colour: ${subject.value};`
        GetThresholdOfColor(subject.value) // result (originally) result = GetThresholdOfColor
      }
    }
  
    for (let i = 0; i < activeSubjects.length; i++) {
      const element = activeSubjects[i]
      let subjectname = `timetable.subject.colour.${element.code}`
      let colour = colours.find((element: any) => element.name === subjectname)
      if (!colour) {
        element.colour = "--item-colour: #8e8e8e;"
      } else {
        element.colour = `--item-colour: ${colour.value};`
        let result = GetThresholdOfColor(colour.value)
        if (result > 300) {
          element.invert = true
        }
      }
    }
  
    CreateFilters(activeSubjects)
  
    // @ts-ignore
    let type
    // @ts-ignore
    let class_
  
    for (let i = 0; i < assessments.length; i++) {
      const element: any = assessments[i]
      if (!upcomingDates[element.due as keyof typeof upcomingDates]) {
        let dateObj: any = new Object()
        dateObj.div = CreateElement(
          // TODO: not sure whats going on here?
          // eslint-disable-next-line
          (type = "div"),
          // eslint-disable-next-line
          (class_ = "upcoming-date-container"),
        )
        dateObj.assessments = []
        ;(upcomingDates[element.due as keyof typeof upcomingDates] as any) =
          dateObj
      }
      let assessmentDateDiv =
        upcomingDates[element.due as keyof typeof upcomingDates]
  
      if (assessmentDateDiv) {
        (assessmentDateDiv as any).assessments.push(element)
      }
    }
  
    for (var date in upcomingDates) {
      let assessmentdue = new Date(
        (
          upcomingDates[date as keyof typeof upcomingDates] as any
        ).assessments[0].due,
      )
      let specialcase = CheckSpecialDay(Today, assessmentdue)
      let assessmentDate
  
      if (specialcase) {
        let datecase: string = specialcase!
        assessmentDate = createAssessmentDateDiv(
          date,
          upcomingDates[date as keyof typeof upcomingDates],
          // eslint-disable-next-line
          datecase,
        )
      } else {
        assessmentDate = createAssessmentDateDiv(
          date,
          upcomingDates[date as keyof typeof upcomingDates],
        )
      }
  
      if (specialcase === "Yesterday") {
        upcomingitemcontainer!.insertBefore(
          assessmentDate,
          upcomingitemcontainer!.firstChild,
        )
      } else {
        upcomingitemcontainer!.append(assessmentDate)
      }
    }
    FilterUpcomingAssessments(settingsState.subjectfilters)
  }

  function createAssessmentDateDiv(date: string, value: any, datecase?: any) {
    var options = {
      weekday: "long" as "long",
      month: "long" as "long",
      day: "numeric" as "numeric",
    }
    const FormattedDate = new Date(date)
  
    const assessments = value.assessments
    const container = value.div
  
    let DateTitleDiv = document.createElement("div")
    DateTitleDiv.classList.add("upcoming-date-title")
  
    if (datecase) {
      let datetitle = document.createElement("h5")
      datetitle.classList.add("upcoming-special-day")
      datetitle.innerText = datecase
      DateTitleDiv.append(datetitle)
      container.setAttribute("data-day", datecase)
    }
  
    let DateTitle = document.createElement("h5")
    DateTitle.innerText = FormattedDate.toLocaleDateString("en-AU", options)
    DateTitleDiv.append(DateTitle)
  
    container.append(DateTitleDiv)
  
    let assessmentContainer = document.createElement("div")
    assessmentContainer.classList.add("upcoming-date-assessments")
  
    for (let i = 0; i < assessments.length; i++) {
      const element = assessments[i]
      let item = document.createElement("div")
      item.classList.add("upcoming-assessment")
      item.setAttribute("data-subject", element.code)
      item.id = `assessment${element.id}`
  
      item.style.cssText = element.colour
  
      let titlediv = document.createElement("div")
      titlediv.classList.add("upcoming-subject-title")
  
      let titlesvg =
        stringToHTML(`<svg viewBox="0 0 24 24" style="width:35px;height:35px;fill:white;">
    <path d="M6 20H13V22H6C4.89 22 4 21.11 4 20V4C4 2.9 4.89 2 6 2H18C19.11 2 20 2.9 20 4V12.54L18.5 11.72L18 12V4H13V12L10.5 9.75L8 12V4H6V20M24 17L18.5 14L13 17L18.5 20L24 17M15 19.09V21.09L18.5 23L22 21.09V19.09L18.5 21L15 19.09Z"></path>
    </svg>`).firstChild
      titlediv.append(titlesvg!)
  
      let detailsdiv = document.createElement("div")
      detailsdiv.classList.add("upcoming-details")
      let detailstitle = document.createElement("h5")
      detailstitle.innerText = `${element.subject} assessment`
      let subject = document.createElement("p")
      subject.innerText = element.title
      subject.classList.add("upcoming-assessment-title")
      subject.onclick = function () {
        document.querySelector("#menu ul")!.classList.add("noscroll")
        location.href = `../#?page=/assessments/${element.programmeID}:${element.metaclassID}&item=${element.id}`
      }
      detailsdiv.append(detailstitle)
      detailsdiv.append(subject)
  
      item.append(titlediv)
      item.append(detailsdiv)
      assessmentContainer.append(item)
  
      fetch(`${location.origin}/seqta/student/assessment/submissions/get`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          assessment: element.id,
          metaclass: element.metaclassID,
          student: 69,
        }),
      })
        .then((result) => result.json())
        .then((response) => {
          if (response.payload.length > 0) {
            const assessment = document.querySelector(`#assessment${element.id}`)
  
            // ticksvg = stringToHTML(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="var(--item-colour)" viewBox="0 0 24 24"><path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/></svg>`).firstChild
            // ticksvg.classList.add('upcoming-tick')
            // assessment.append(ticksvg)
            let submittedtext = document.createElement("div")
            submittedtext.classList.add("upcoming-submittedtext")
            submittedtext.innerText = "Submitted"
            assessment!.append(submittedtext)
          }
        })
    }
  
    container.append(assessmentContainer)
  
    return container
  }
  
  function CheckSpecialDay(date1: Date, date2: Date) {
    if (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() - 1 === date2.getDate()
    ) {
      return "Yesterday"
    }
    if (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    ) {
      return "Today"
    }
    if (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() + 1 === date2.getDate()
    ) {
      return "Tomorrow"
    }
  }

  async function GetLessonColours() {
    let func = fetch(`${location.origin}/seqta/student/load/prefs?`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ request: "userPrefs", asArray: true, user: 69 }),
    })
    return func
      .then((result) => result.json())
      .then((response) => response.payload)
  }

  function CreateFilters(subjects: any) {
    let filteroptions = settingsState.subjectfilters
  
    let filterdiv = document.querySelector("#upcoming-filters")
    for (let i = 0; i < subjects.length; i++) {
      const element = subjects[i]
      // eslint-disable-next-line
      if (!Object.prototype.hasOwnProperty.call(filteroptions, element.code)) {
        filteroptions[element.code] = true
        settingsState.subjectfilters = filteroptions
      }
      let elementdiv = CreateSubjectFilter(
        element.code,
        element.colour,
        filteroptions[element.code],
      )
  
      filterdiv!.append(elementdiv)
    }
  }

  function CreateSubjectFilter(
    subjectcode: any,
    itemcolour: string,
    checked: any,
  ) {
    let label = CreateElement("label", "upcoming-checkbox-container")
    label.innerText = subjectcode
    let input1 = CreateElement("input")
    const input = input1 as HTMLInputElement
    input.type = "checkbox"
    input.checked = checked
    input.id = `filter-${subjectcode}`
    label.style.cssText = itemcolour
    let span = CreateElement("span", "upcoming-checkmark")
    label.append(input)
    label.append(span)
  
    input.addEventListener("change", function (change) {
      let filters = settingsState.subjectfilters
      let id = (change.target as HTMLInputElement)!.id.split("-")[1]
      filters[id] = (change.target as HTMLInputElement)!.checked
  
      settingsState.subjectfilters = filters
    })
  
    return label
  }

  function SetTimetableSubtitle() {
    const homelessonsubtitle = document.getElementById("home-lesson-subtitle")
    if (!homelessonsubtitle) return
  
    const date = new Date()
    const isSameMonth =
      date.getFullYear() === currentSelectedDate.getFullYear() &&
      date.getMonth() === currentSelectedDate.getMonth()
  
    if (isSameMonth) {
      const dayDiff = date.getDate() - currentSelectedDate.getDate()
      switch (dayDiff) {
        case 0:
          homelessonsubtitle.innerText = "Today's Lessons"
          break
        case 1:
          homelessonsubtitle.innerText = "Yesterday's Lessons"
          break
        case -1:
          homelessonsubtitle.innerText = "Tomorrow's Lessons"
          break
        default:
          homelessonsubtitle.innerText = formatDateString(currentSelectedDate)
      }
    } else {
      homelessonsubtitle.innerText = formatDateString(currentSelectedDate)
    }
  }

  function formatDateString(date: Date): string {
    return `${date.toLocaleString("en-us", { weekday: "short" })} ${date.toLocaleDateString("en-au")}`
  }