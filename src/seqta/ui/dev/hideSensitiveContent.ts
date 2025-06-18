interface ElementConfig {
  selector: string;
  action: (element: Element) => void;
}

interface ContentConfig {
  [key: string]: ElementConfig;
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
    selector: ".day h2",
    action: (element) => {
      element.textContent = getRandomElement(mockData.subjects);
    },
  },
  teacher: {
    selector: ".day h3:first-of-type",
    action: (element) => {
      element.textContent = getRandomElement(mockData.teachers);
    },
  },
  classroom: {
    selector: ".day h3:last-of-type",
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
      element.textContent = "Content has been redacted for privacy.";
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
      element.textContent = "Recipient(s) Redacted";
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
      element.textContent = "Document Name Redacted";
    },
  },
  forumTopics: {
    selector: "#menu .sub ul li label",
    action: (element) => {
      element.textContent = "Forum Topic Redacted";
    },
  },
  courseNames: {
    selector: "#menu .sub ul li[data-colour] label",
    action: (element) => {
      element.textContent = "Course Name Redacted";
    },
  },
  yearGroups: {
    selector: "#menu .sub > ul > li > label",
    action: (element) => {
      element.textContent = "Year Group Redacted";
    },
  },
  newsArticleTitle: {
    selector: ".ArticleText a",
    action: (element) => {
      element.textContent = "News Article Title Redacted";
    },
  },
  newsArticleContent: {
    selector: ".ArticleText p",
    action: (element) => {
      element.textContent = "News Article Content Redacted";
    },
  },
  userHouse: {
    selector: ".userInfohouse",
    action: (element) => {
      element.textContent = "House";
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
  messages: {
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

export function getMockNotices() {
  return {
    payload: mockData.noticesData
  };
}

export default function hideSensitiveContent() {
  Object.entries(contentConfig).forEach(([_, { selector, action }]) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element: Element) => {
      action(element);
    });
  });
}
