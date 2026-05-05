interface ElementConfig {
  selector: string;
  action: (element: Element) => void;
  /** When true, element is not added to processedElements so the action runs every time (e.g. overwriting container content) */
  alwaysRun?: boolean;
  /** When true, never add to processedElements so the action can run again after DOM resets (e.g. home day column) */
  neverMarkProcessed?: boolean;
}

interface ContentConfig {
  [key: string]: ElementConfig;
}

// Track processed elements to avoid re-randomizing
const processedElements = new WeakSet<Element>();

/** Marks mock-generated `.day` rows so granular rules do not re-randomize them */
const MOCK_DAY_ATTR = "data-bsp-mock-day";

/** Skip MutationObserver-driven reprocessing while we inject the home mock (avoids feedback loops) */
let suppressMockMutations = false;

function debounce(func: Function, wait: number): Function {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function getRandomElement(array: string[]): string {
  return array[Math.floor(Math.random() * array.length)];
}

function generateMockUserCode(): string {
  const numbers = Math.floor(1000 + Math.random() * 9000);
  const letters = Math.floor(10000000 + Math.random() * 90000000);
  return `${numbers} // ${letters}`;
}

function getRandomDate(): Date {
  const start = new Date();
  const end = new Date(start.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days from now
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

const contentConfig: ContentConfig = {
  lessonTitle: {
    selector: `.day:not([${MOCK_DAY_ATTR}]) h2`,
    action: (element) => {
      element.textContent = getRandomElement(mockData.subjects);
    },
  },
  teacher: {
    selector: `.day:not([${MOCK_DAY_ATTR}]) h3:first-of-type`,
    action: (element) => {
      element.textContent = getRandomElement(mockData.teachers);
    },
  },
  classroom: {
    selector: `.day:not([${MOCK_DAY_ATTR}]) h3:last-of-type`,
    action: (element) => {
      element.textContent = getRandomElement(mockData.classrooms);
    },
  },
  userName: {
    selector: ".userInfoName, .name",
    action: (element) => {
      element.textContent = getRandomElement(mockData.names);
    },
  },
  userCode: {
    selector: ".userInfoText > .userInfoCode",
    action: (element) => {
      element.textContent = generateMockUserCode();
    },
  },
  assessmentTitle: {
    selector: ".upcoming-assessment .upcoming-assessment-title",
    action: (element) => {
      element.textContent = getRandomElement(mockData.assessmentTitles);
    },
  },
  assessmentTitleInTooltip: {
    selector: ".assessmenttooltip .tooltiptext p",
    action: (element) => {
      element.textContent = getRandomElement(mockData.assessmentTitles);
    },
  },
  assessmentTitleInDetail: {
    selector: "[class*='AssessmentItem__title___'], .assessment-title",
    action: (element) => {
      element.textContent = getRandomElement(mockData.assessmentTitles);
    },
  },
  assessmentSubject: {
    selector: ".upcoming-assessment .upcoming-details h5",
    action: (element) => {
      element.textContent = getRandomElement(mockData.subjects);
    },
  },
  noticeTitle: {
    selector: ".notice h3",
    action: (element) => {
      element.textContent = getRandomElement(mockData.notices);
    },
  },
  noticeContent: {
    selector: ".notice .contents",
    action: (element) => {
      element.textContent =
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
    },
  },
  upcomingCheckboxes: {
    selector: ".upcoming-checkbox-container",
    action: (element) => {
      element.firstChild!.textContent = "SUBJ";
    },
  },
  dates: {
    selector: '.upcoming-date-title h5, input[type="date"]',
    action: (element) => {
      const randomDate = getRandomDate();
      if (element instanceof HTMLInputElement) {
        element.value = randomDate.toISOString().split("T")[0];
      } else {
        element.textContent = randomDate.toLocaleDateString("en-US", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
      }
    },
  },

  messageSubject: {
    selector: '[class*="MessageList__subject___"]',
    action: (element) => {
      element.textContent = getRandomElement(mockData.messages.subjects);
    },
  },

  messageSender: {
    selector: '[class*="MessageList__value___"]',
    action: (element) => {
      element.textContent = getRandomElement(mockData.messages.sender);
    },
  },

  messageRecipients: {
    selector:
      '[class*="MessageList__recipients___"] [class*="MessageList__value___"]',
    action: (element) => {
      element.textContent = getRandomElement(mockData.messages.recipients);
    },
  },

  messageDate: {
    selector: '[class*="MessageList__date___"]',
    action: (element) => {
      element.textContent = getRandomDate().toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    },
  },
  avatarImage: {
    selector: '[class*="Avatar__Avatar___"]',
    action: (element) => {
      if (element instanceof HTMLElement) {
        element.style.removeProperty("background-image");
        element.firstChild!.firstChild!.textContent = getRandomElement(
          mockData.names,
        )[0];
      }
    },
  },
  notificationCount: {
    selector: '[class*="notifications__bubble___"]',
    action: (element) => {
      element.textContent = Math.floor(Math.random() * 100).toString();
    },
  },
  schoolName: {
    selector: "title",
    action: (element) => {
      element.textContent = "School Portal";
    },
  },
  documentNames: {
    selector: ".document td.title",
    action: (element) => {
      element.textContent = getRandomElement(mockData.documentTitles);
    },
  },
  forumTopics: {
    selector: "#menu .sub ul li:not([data-colour]):not(.hasChildren) label",
    action: (element) => {
      const assessmentsSection = element.closest('[data-key="assessments"]');
      if (!assessmentsSection) {
        element.textContent = getRandomElement(mockData.forumTopics);
      }
    },
  },
  assessmentSubjects: {
    selector: '[data-key="assessments"] .sub ul li[data-colour] label',
    action: (element) => {
      element.textContent = getRandomElement(mockData.subjects);
    },
  },
  assessmentYearGroups: {
    selector: '[data-key="assessments"] .sub ul li.hasChildren:not([data-colour]) label',
    action: (element) => {
      const yearGroup = Math.floor(Math.random() * 5) + 8; // Years 8-12
      element.textContent = `Year ${yearGroup}`;
    },
  },
  assessmentSubYearGroups: {
    selector: '[data-key="assessments"] .sub .sub ul li[data-colour] label',
    action: (element) => {
      element.textContent = getRandomElement(mockData.subjects);
    },
  },
  courseNames: {
    selector: "#menu .sub ul li[data-colour] label",
    action: (element) => {
      element.textContent = getRandomElement(mockData.subjects);
    },
  },
  yearGroups: {
    selector: "#menu .sub > ul > li > label",
    action: (element) => {
      const yearGroup = Math.floor(Math.random() * 5) + 8;
      element.textContent = `Year ${yearGroup}`;
    },
  },
  newsArticleTitle: {
    selector: ".ArticleText a",
    action: (element) => {
      element.textContent = getRandomElement(mockData.notices);
    },
  },
  newsArticleContent: {
    selector: ".ArticleText p",
    action: (element) => {
      element.textContent =
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
    },
  },
  userHouse: {
    selector: ".userInfohouse",
    action: (element) => {
      element.textContent = "House";
    },
  },

  // Timetable page: replace class names, teachers, rooms with fake data
  timetableEntryTitle: {
    selector: ".timetablepage .entry .title",
    action: (element) => {
      element.textContent = getRandomElement(mockData.subjects);
    },
  },
  timetableEntryTeacher: {
    selector: ".timetablepage .entry .teacher, .timetablepage .quickbar .meta .teacher",
    action: (element) => {
      element.textContent = getRandomElement(mockData.teachers);
    },
  },
  timetableEntryRoom: {
    selector: ".timetablepage .entry .room, .timetablepage .quickbar .meta .room",
    action: (element) => {
      element.textContent = getRandomElement(mockData.classrooms);
    },
  },
  quickbarTitle: {
    selector: ".timetablepage .quickbar .title",
    action: (element) => {
      element.textContent = getRandomElement(mockData.subjects);
    },
  },

  // Home page: replace entire day with mock schedule (care + 7 lessons 8:55–3:15)
  homeDayContainer: {
    selector: "#day-container",
    neverMarkProcessed: true,
    action: (element) => {
      const container = element as HTMLElement;
      if (!container.closest(".timetable-container")) return; // only on home
      if (container.classList.contains("loading") || container.innerHTML.trim() === "") {
        delete container.dataset.bspMockSchedule;
        return;
      }
      if (
        container.dataset.bspMockSchedule === "1" &&
        container.querySelector(`[${MOCK_DAY_ATTR}]`)
      ) {
        return;
      }
      suppressMockMutations = true;
      const schedule = getMockDaySchedule();
      container.innerHTML = schedule;
      container.classList.remove("loading");
      container.dataset.bspMockSchedule = "1";
      requestAnimationFrame(() => {
        suppressMockMutations = false;
      });
    },
  },
};

const mockData = {
  subjects: [
    "Mathematics",
    "English",
    "Science",
    "History",
    "Geography",
    "Art",
    "Music",
    "Physical Education",
    "Chemistry",
    "Physics",
    "Biology",
    "Economics",
    "Business Studies",
    "French",
    "Spanish",
    "Computer Science",
    "Literature",
    "Environmental Studies",
    "Political Science",
    "Sociology",
  ],
  teachers: [
    "Mr. Smith",
    "Mrs. Johnson",
    "Ms. Williams",
    "Dr. Brown",
    "Mr. Davis",
    "Mrs. Miller",
    "Mr. Wilson",
    "Ms. Moore",
    "Dr. Taylor",
    "Mrs. Anderson",
    "Mr. Garcia",
    "Mrs. Martinez",
    "Ms. Thompson",
    "Dr. Lee",
    "Mr. Robinson",
    "Mrs. Hall",
    "Ms. White",
    "Dr. Clark",
    "Mr. Lewis",
    "Mrs. King",
  ],
  classrooms: [
    "A101",
    "B205",
    "C304",
    "D102",
    "E201",
    "F103",
    "G204",
    "H301",
    "I202",
    "J105",
    "K107",
    "L206",
    "M303",
    "N104",
    "O209",
  ],
  names: [
    "John Doe",
    "Jane Smith",
    "Michael Johnson",
    "Emily Brown",
    "David Lee",
    "Sarah Davis",
    "Robert Wilson",
    "Lisa Taylor",
    "William Moore",
    "Jennifer Anderson",
    "Thomas Garcia",
    "Olivia Martinez",
    "Daniel Thompson",
    "Sophia Lee",
    "Matthew Robinson",
    "Ava Hall",
    "Jacob White",
    "Mia Clark",
    "James Lewis",
    "Lily King",
  ],
  assessmentTitles: [
    "Mid-term Exam",
    "Final Project",
    "Research Paper",
    "Oral Presentation",
    "Lab Report",
    "Essay",
    "Group Assignment",
    "Portfolio Review",
    "Quiz",
    "Practical Test",
    "Class Presentation",
    "Online Assessment",
    "Case Study",
    "Field Report",
    "Peer Review",
    "Coding Challenge",
    "Math Test",
    "Literary Analysis",
    "Debate",
    "Design Project",
  ],
  notices: [
    "School Assembly",
    "Excursion Reminder",
    "Fundraising Event",
    "Parent-Teacher Meetings",
    "Sports Day",
    "Book Fair",
    "Career Day",
    "Music Concert",
    "Art Exhibition",
    "Science Fair",
    "Holiday Celebration",
    "Community Service Day",
    "Graduation Ceremony",
    "Award Ceremony",
    "Workshop",
    "Open House",
    "Seminar",
    "Club Meeting",
    "Field Trip",
    "Cultural Festival",
  ],
  documentTitles: [
    "Course Outline",
    "Assignment Brief",
    "Study Guide",
    "Reference Material",
    "Worksheet",
    "Reading List",
    "Project Guidelines",
  ],
  forumTopics: [
    "General Discussion",
    "Homework Help",
    "Resource Share",
    "Class Updates",
    "Study Group",
    "Q&A",
    "Announcements",
  ],
  messages: {
    recipients: ["Students", "Class", "Year Group", "Parents", "Guardians"],
    subjects: [
      "Mid-year Exams",
      "Science project due soon",
      "Mufti Day coming up!",
      "School Assembly",
      "Excursion Reminder",
      "Fundraising Event",
      "Parent-Teacher Meetings",
      "Sports Day",
      "Book Fair",
      "Career Day",
      "Music Concert",
      "Art Exhibition",
      "Science Fair",
      "Holiday Celebration",
      "Community Service Day",
      "Graduation Ceremony",
      "Award Ceremony",
      "Workshop",
      "Open House",
      "Seminar",
      "Club Meeting",
      "Field Trip",
      "Cultural Festival",
    ],
    sender: [
      "Mr. Smith",
      "Mrs. Johnson",
      "Ms. Williams",
      "Dr. Brown",
      "Mr. Davis",
      "Mrs. Miller",
      "Mr. Wilson",
      "Ms. Moore",
      "Dr. Taylor",
      "Mrs. Anderson",
      "Mr. Garcia",
      "Mrs. Martinez",
    ],
  },
  noticesData: [
    {
      id: 1,
      title: "Academic Lunch Support", 
      contents: `The following table shows the names of the students who are required to attend at the beginning of lunchtime on the respective days.<br>
&nbsp;
<table>
  <thead>
    <tr>
      <th>
        <p style="padding-left: 0px; padding-right: 0px;">Monday 16/06<br>
          Room S201<br>
          Week A Mrs Thompson<br>
          Week B Mrs Smith</p></th>
      <th>
        <p style="padding-left: 0px; padding-right: 0px;">Wednesday 18/06<br>
          Room S201<br>
          Week A Mrs Smith<br>
          Week B Mrs Smith</p></th>
      <th>
        <p style="padding-left: 0px; padding-right: 0px;">Friday 20/06<br>
          Room M201&nbsp;<br>
          Week A Ms Anderson<br>
          Week B Ms Anderson&nbsp; &nbsp;&nbsp;</p></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>No Academic Support for year 9 and 10&nbsp;<br>
        due to exam in P5/6</td>
      <td>
        <div>
        </div>John Smith (Mrs Jones)<br>
        Wednesday&nbsp;<br>
        Michael Brown<br>
        James Wilson (Miss Davis)<br>
        <br>
        &nbsp;</td>
      <td>Friday 20/6<br>
        Michael Brown<br>
        &nbsp;</td>
    </tr>
  </tbody>
</table>
<div>
</div>`,
      staff: "Mrs Jones",
      colour: "#9c27b0",
      label: 1,
      label_title: "Middle & Senior School (5-12)"
    },
    {
      id: 2,
      title: "Year 12 Study Period Changes",
      contents: `Please note the following changes to Year 12 study periods for this week:<br><br>
<ul>
  <li><strong>Tuesday:</strong> Study hall relocated to Library - periods 3 & 4</li>
  <li><strong>Wednesday:</strong> No supervised study - students may use common areas</li>
  <li><strong>Friday:</strong> Extended study session until 4:30 PM in Room A205</li>
</ul>
<br>
Students are expected to bring all necessary materials and maintain academic focus during these sessions.`,
      staff: "Mr. David Chen",
      colour: "#2196f3",
      label: 2,
      label_title: "Year 12 Students"
    },
    {
      id: 3,
      title: "Upcoming Science Fair Preparations",
      contents: `The Annual Science Fair is scheduled for <strong>Friday, June 28th</strong>. All participating students should note:<br><br>
<table border="1" style="border-collapse: collapse; width: 100%;">
  <thead>
    <tr style="background-color: #f0f0f0;">
      <th style="padding: 8px;">Activity</th>
      <th style="padding: 8px;">Date</th>
      <th style="padding: 8px;">Location</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 8px;">Project Setup</td>
      <td style="padding: 8px;">Thursday 27/06 - Period 5</td>
      <td style="padding: 8px;">Main Hall</td>
    </tr>
    <tr>
      <td style="padding: 8px;">Practice Presentations</td>
      <td style="padding: 8px;">Thursday 27/06 - Period 6</td>
      <td style="padding: 8px;">Science Labs 1-3</td>
    </tr>
    <tr>
      <td style="padding: 8px;">Final Event</td>
      <td style="padding: 8px;">Friday 28/06 - All Day</td>
      <td style="padding: 8px;">Main Hall & Courtyard</td>
    </tr>
  </tbody>
</table>
<br>Please ensure all safety protocols are followed and display materials are ready by Thursday afternoon.`,
      staff: "Dr. Sarah Mitchell",
      colour: "#4caf50",
      label: 3,
      label_title: "Science Students"
    },
    {
      id: 4,
      title: "Library Resource Updates",
      contents: `Our library has received several important updates this week:<br><br>
<strong>New Digital Resources:</strong>
<ul>
  <li>Access to Research Database Plus - now available through student portal</li>
  <li>Updated online textbook collection for all core subjects</li>
  <li>New citation management tools for senior students</li>
</ul>
<br>
<strong>Facility Changes:</strong><br>
The quiet study area has been expanded and now includes 8 additional desks with power outlets. Bookings can be made through the student portal under "Library Services".
<br><br>
For assistance with any digital resources, please contact the library staff during operating hours: 7:30 AM - 4:00 PM.`,
      staff: "Ms. Rebecca Torres",
      colour: "#ff9800",
      label: 4,
      label_title: "All Students"
    },
    {
      id: 5,
      title: "Sports Carnival Team Registrations",
      contents: `House Sports Carnival is approaching on <strong>August 15th</strong>! Team registrations are now open for all year levels.<br><br>
Available Events:
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0;">
  <div>
    <strong>Track Events:</strong>
    <ul>
      <li>100m Sprint</li>
      <li>200m Sprint</li>
      <li>400m Race</li>
      <li>800m Distance</li>
      <li>1500m Distance</li>
      <li>Relay Races</li>
    </ul>
  </div>
  <div>
    <strong>Field Events:</strong>
    <ul>
      <li>Long Jump</li>
      <li>High Jump</li>
      <li>Shot Put</li>
      <li>Discus</li>
      <li>Javelin</li>
      <li>Triple Jump</li>
    </ul>
  </div>
</div>
<br>
<strong>Registration Deadline:</strong> July 25th<br>
<strong>Training Sessions:</strong> Tuesdays & Thursdays, 3:30-4:30 PM<br>
<br>
Register through the PE department or see your house captains for more information.`,
      staff: "Coach Michael Park",
      colour: "#e91e63",
      label: 5,
      label_title: "All Houses"
    }
  ]
};

/** Mock day schedule for home timetable: care 8:30–8:55, then 7 lessons 8:55–3:15 (45m each), 20m recess, lunch. */
function getMockDaySchedule(): string {
  const blocks: { title: string; teacher: string; room: string; from: string; until: string }[] = [
    { title: "Care Group", teacher: getRandomElement(mockData.teachers), room: getRandomElement(mockData.classrooms), from: "8:30am", until: "8:55am" },
    { title: getRandomElement(mockData.subjects), teacher: getRandomElement(mockData.teachers), room: getRandomElement(mockData.classrooms), from: "8:55am", until: "9:40am" },
    { title: getRandomElement(mockData.subjects), teacher: getRandomElement(mockData.teachers), room: getRandomElement(mockData.classrooms), from: "9:40am", until: "10:25am" },
    { title: "Recess", teacher: "—", room: "—", from: "10:25am", until: "10:45am" },
    { title: getRandomElement(mockData.subjects), teacher: getRandomElement(mockData.teachers), room: getRandomElement(mockData.classrooms), from: "10:45am", until: "11:30am" },
    { title: getRandomElement(mockData.subjects), teacher: getRandomElement(mockData.teachers), room: getRandomElement(mockData.classrooms), from: "11:30am", until: "12:15pm" },
    { title: "Lunch", teacher: "—", room: "—", from: "12:15pm", until: "1:00pm" },
    { title: getRandomElement(mockData.subjects), teacher: getRandomElement(mockData.teachers), room: getRandomElement(mockData.classrooms), from: "1:00pm", until: "1:45pm" },
    { title: getRandomElement(mockData.subjects), teacher: getRandomElement(mockData.teachers), room: getRandomElement(mockData.classrooms), from: "1:45pm", until: "2:30pm" },
    { title: getRandomElement(mockData.subjects), teacher: getRandomElement(mockData.teachers), room: getRandomElement(mockData.classrooms), from: "2:30pm", until: "3:15pm" },
  ];
  const colours = ["#8e8e8e", "#4FBBFE", "#59F675", "#fa915d", "#9c27b0", "#2196f3", "#4caf50", "#ff9800", "#e91e63", "#673ab7"];
  return blocks
    .map(
      (b, i) =>
        `<div class="day" ${MOCK_DAY_ATTR} style="--item-colour: ${colours[i % colours.length]};">
          <h2>${b.title}</h2>
          <h3>${b.teacher}</h3>
          <h3>${b.room}</h3>
          <h4>${b.from} – ${b.until}</h4>
          <h5> </h5>
        </div>`,
    )
    .join("");
}

export function getMockNotices() {
  return {
    payload: mockData.noticesData
  };
}

export function getMockAssessmentsData() {
  const subjects = mockData.subjects.slice(0, 5).map((title, i) => ({
    code: `SUBJ${i + 1}`,
    programme: i + 1,
    metaclass: i + 1,
    title,
  }));

  const colors: Record<string, string> = {};
  subjects.forEach((s) => {
    colors[s.code] = `hsl(${Math.floor(Math.random() * 360)},70%,60%)`;
  });

  const statusTemplates = [
    // Marked with scores (70-90%) - goes to MARKS_RELEASED
    { submitted: true, score: () => Math.floor(Math.random() * 21) + 70, dayOffset: () => Math.floor(Math.random() * -30) - 7 }, // Past due, marked with score
    { submitted: true, score: () => Math.floor(Math.random() * 21) + 70, dayOffset: () => Math.floor(Math.random() * -14) - 1 }, // Recently marked with score
    { submitted: true, score: () => Math.floor(Math.random() * 21) + 70, dayOffset: () => Math.floor(Math.random() * -7) }, // Very recently marked with score
    
    // Submitted but unmarked - goes to SUBMITTED
    { submitted: true, score: null, dayOffset: () => Math.floor(Math.random() * -5) - 1 }, // Recently submitted, awaiting marking
    { submitted: true, score: null, dayOffset: () => Math.floor(Math.random() * -3) }, // Very recently submitted, awaiting marking
    { submitted: true, score: null, dayOffset: () => Math.floor(Math.random() * -2) }, // Just submitted, awaiting marking
    
    // Due soon (not submitted) - only a couple
    { submitted: false, score: null, dayOffset: () => 0 }, // Due today
    { submitted: false, score: null, dayOffset: () => Math.floor(Math.random() * 3) + 2 }, // Due in next few days
    
    // Due later (not submitted) - most assessments
    { submitted: false, score: null, dayOffset: () => Math.floor(Math.random() * 7) + 8 }, // Due in 1-2 weeks
    { submitted: false, score: null, dayOffset: () => Math.floor(Math.random() * 14) + 14 }, // Due in 2-4 weeks
    { submitted: false, score: null, dayOffset: () => Math.floor(Math.random() * 21) + 21 }, // Due in 3-6 weeks
    { submitted: false, score: null, dayOffset: () => Math.floor(Math.random() * 14) + 35 }, // Due in 5-7 weeks
    
    // Few overdue (not submitted) - less common
    { submitted: false, score: null, dayOffset: () => Math.floor(Math.random() * -3) - 1 }, // Recently overdue
  ];

  const currentYear = new Date().getFullYear();
  const assessments = Array.from({ length: 14 }, (_, i) => {
    const subj = subjects[i % subjects.length];
    const template = statusTemplates[i % statusTemplates.length];
    const due = new Date();
    due.setDate(due.getDate() + template.dayOffset());
    if (i >= 10) due.setFullYear(currentYear - 1);
    
    const types = ["Assignment", "Test", "Exam", "Project", "Presentation", "Report"];
    const assessment: any = {
      id: i + 1,
      title: mockData.assessmentTitles[i % mockData.assessmentTitles.length],
      code: subj.code,
      programmeID: subj.programme,
      metaclassID: subj.metaclass,
      due: due.toISOString(),
      submitted: template.submitted,
      type: types[i % types.length],
    };

    if (template.score && typeof template.score === 'function') {
      assessment.percentage = template.score(); // This triggers MARKS_RELEASED
      assessment.results = {
        percentage: template.score() // This displays the thermometer
      };
    }

    return assessment;
  });

  return { assessments, subjects, colors };
}

// Create a debounced processing function
const debouncedProcessElements = debounce(processNewElements, 1);

function processNewElements() {
  Object.entries(contentConfig).forEach(([_, config]) => {
    const { selector, action, alwaysRun, neverMarkProcessed } = config;
    const elements = document.querySelectorAll(selector);
    elements.forEach((element: Element) => {
      if (alwaysRun || neverMarkProcessed || !processedElements.has(element)) {
        action(element);
        if (!alwaysRun && !neverMarkProcessed) {
          processedElements.add(element);
        }
      }
    });
  });
}

let observer: MutationObserver | null = null;

export default function hideSensitiveContent() {
  // Initial processing of existing elements
  processNewElements();

  // Set up MutationObserver if not already created
  if (!observer) {
    observer = new MutationObserver((mutations) => {
      if (suppressMockMutations) return;

      let shouldProcess = false;
      
      mutations.forEach((mutation) => {
        // Check for both childList and subtree changes
        if (mutation.type === 'childList') {
          // Check added nodes
          if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                // Check if the added element or its children match any of our selectors
                for (const config of Object.values(contentConfig)) {
                  if (element.matches?.(config.selector) || element.querySelector?.(config.selector)) {
                    shouldProcess = true;
                    break;
                  }
                }
              }
            });
          }
          
          // Large DOM replacements (e.g. page navigation). Skip only when #day-container gains many *mock* rows (our inject).
          if (mutation.addedNodes.length > 5 || mutation.removedNodes.length > 5) {
            const target = mutation.target as Element;
            if (target.id === "day-container") {
              for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const el = node as Element;
                  if (
                    el.classList?.contains("day") &&
                    !el.hasAttribute(MOCK_DAY_ATTR)
                  ) {
                    shouldProcess = true;
                    break;
                  }
                }
              }
            } else {
              shouldProcess = true;
            }
          }
        }
        
        // Check for attribute changes that might affect our selectors
        if (mutation.type === 'attributes') {
          const target = mutation.target as Element;
          for (const config of Object.values(contentConfig)) {
            if (target.matches?.(config.selector)) {
              shouldProcess = true;
              break;
            }
          }
        }
      });

      if (shouldProcess) {
        debouncedProcessElements();
      }
    });

    // Start observing with more comprehensive options
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id'] // Watch for class/id changes that might affect our selectors
    });
  }
}

// Function to stop observing (useful for cleanup)
export function stopHidingSensitiveContent() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}
