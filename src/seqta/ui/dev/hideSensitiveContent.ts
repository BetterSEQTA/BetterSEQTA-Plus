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
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const contentConfig: ContentConfig = {
  lessonTitle: { 
    selector: '.day h2', 
    action: (element) => { element.textContent = getRandomElement(mockData.subjects); }
  },
  teacher: { 
    selector: '.day h3:first-of-type', 
    action: (element) => { element.textContent = getRandomElement(mockData.teachers); }
  },
  classroom: { 
    selector: '.day h3:last-of-type', 
    action: (element) => { element.textContent = getRandomElement(mockData.classrooms); }
  },
  userName: { 
    selector: '.userInfoName, .name', 
    action: (element) => { element.textContent = getRandomElement(mockData.names); }
  },
  userCode: { 
    selector: '.userInfoText > .userInfoCode', 
    action: (element) => { element.textContent = generateMockUserCode(); }
  },
  assessmentTitle: { 
    selector: '.upcoming-assessment .upcoming-assessment-title', 
    action: (element) => { element.textContent = getRandomElement(mockData.assessmentTitles); }
  },
  assessmentSubject: { 
    selector: '.upcoming-assessment .upcoming-details h5', 
    action: (element) => { element.textContent = getRandomElement(mockData.subjects); }
  },
  noticeTitle: { 
    selector: '.notice h3', 
    action: (element) => { element.textContent = getRandomElement(mockData.notices); }
  },
  noticeContent: { 
    selector: '.notice .contents', 
    action: (element) => { element.textContent = 'Content has been redacted for privacy.'; }
  },
  upcomingCheckboxes: {
    selector: '.upcoming-checkbox-container',
    action: (element) => { element.firstChild!.textContent = 'SUBJ'; }
  },
  dates: { 
    selector: '.upcoming-date-title h5, input[type="date"]', 
    action: (element) => {
      const randomDate = getRandomDate();
      if (element instanceof HTMLInputElement) {
        element.value = randomDate.toISOString().split('T')[0];
      } else {
        element.textContent = randomDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
      }
    }
  },

  messageSubject: {
    selector: '[class*="MessageList__subject___"]',
    action: (element) => { element.textContent = getRandomElement(mockData.messages.subjects); }
  },

  messageSender: {
    selector: '[class*="MessageList__value___"]',
    action: (element) => { element.textContent = getRandomElement(mockData.messages.sender); }
  },

  messageRecipients: {
    selector: '[class*="MessageList__recipients___"] [class*="MessageList__value___"]',
    action: (element) => { element.textContent = 'Recipient(s) Redacted'; }
  },

  messageDate: {
    selector: '[class*="MessageList__date___"]',
    action: (element) => { element.textContent = getRandomDate().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }); }
  },
  avatarImage: {
    selector: '[class*="Avatar__Avatar___"]',
    action: (element) => { 
      if (element instanceof HTMLElement) {
        element.style.removeProperty('background-image');
        element.firstChild!.firstChild!.textContent = getRandomElement(mockData.names)[0];
      }
    }
  },
  notificationCount: {
    selector: '[class*="notifications__bubble___"]',
    action: (element) => { element.textContent = Math.floor(Math.random() * 100).toString(); }
  },
  schoolName: {
    selector: 'title',
    action: (element) => { element.textContent = 'School Portal'; }
  },
  documentNames: {
    selector: '.document td.title',
    action: (element) => { element.textContent = 'Document Name Redacted'; }
  },
  forumTopics: {
    selector: '#menu .sub ul li label',
    action: (element) => { element.textContent = 'Forum Topic Redacted'; }
  },
  courseNames: {
    selector: '#menu .sub ul li[data-colour] label',
    action: (element) => { element.textContent = 'Course Name Redacted'; }
  },
  yearGroups: {
    selector: '#menu .sub > ul > li > label',
    action: (element) => { element.textContent = 'Year Group Redacted'; }
  },
  newsArticleTitle: {
    selector: '.ArticleText a',
    action: (element) => { element.textContent = 'News Article Title Redacted'; }
  },
  newsArticleContent: {
    selector: '.ArticleText p',
    action: (element) => { element.textContent = 'News Article Content Redacted'; }
  },
  userHouse: {
    selector: '.userInfohouse',
    action: (element) => { element.textContent = 'House'; }
  }
};

const mockData = {
  subjects: [
    "Mathematics", "English", "Science", "History", "Geography", 
    "Art", "Music", "Physical Education", "Chemistry", "Physics", 
    "Biology", "Economics", "Business Studies", "French", "Spanish", 
    "Computer Science", "Literature", "Environmental Studies", 
    "Political Science", "Sociology"
  ],
  teachers: [
    "Mr. Smith", "Mrs. Johnson", "Ms. Williams", "Dr. Brown", 
    "Mr. Davis", "Mrs. Miller", "Mr. Wilson", "Ms. Moore", 
    "Dr. Taylor", "Mrs. Anderson", "Mr. Garcia", "Mrs. Martinez", 
    "Ms. Thompson", "Dr. Lee", "Mr. Robinson", "Mrs. Hall", 
    "Ms. White", "Dr. Clark", "Mr. Lewis", "Mrs. King"
  ],
  classrooms: [
    "A101", "B205", "C304", "D102", "E201", 
    "F103", "G204", "H301", "I202", "J105", 
    "K107", "L206", "M303", "N104", "O209"
  ],
  names: [
    "John Doe", "Jane Smith", "Michael Johnson", "Emily Brown", 
    "David Lee", "Sarah Davis", "Robert Wilson", "Lisa Taylor", 
    "William Moore", "Jennifer Anderson", "Thomas Garcia", 
    "Olivia Martinez", "Daniel Thompson", "Sophia Lee", 
    "Matthew Robinson", "Ava Hall", "Jacob White", 
    "Mia Clark", "James Lewis", "Lily King"
  ],
  assessmentTitles: [
    "Mid-term Exam", "Final Project", "Research Paper", 
    "Oral Presentation", "Lab Report", "Essay", 
    "Group Assignment", "Portfolio Review", "Quiz", 
    "Practical Test", "Class Presentation", 
    "Online Assessment", "Case Study", "Field Report", 
    "Peer Review", "Coding Challenge", "Math Test", 
    "Literary Analysis", "Debate", "Design Project"
  ],
  notices: [
    "School Assembly", "Excursion Reminder", "Fundraising Event", 
    "Parent-Teacher Meetings", "Sports Day", "Book Fair", 
    "Career Day", "Music Concert", "Art Exhibition", 
    "Science Fair", "Holiday Celebration", "Community Service Day", 
    "Graduation Ceremony", "Award Ceremony", "Workshop", 
    "Open House", "Seminar", "Club Meeting", 
    "Field Trip", "Cultural Festival"
  ],
  messages: {
    subjects: [
      "Mid-year Exams", "Science project due soon", "Mufti Day coming up!",
      "School Assembly", "Excursion Reminder", "Fundraising Event",
      "Parent-Teacher Meetings", "Sports Day", "Book Fair",
      "Career Day", "Music Concert", "Art Exhibition",
      "Science Fair", "Holiday Celebration", "Community Service Day",
      "Graduation Ceremony", "Award Ceremony", "Workshop",
      "Open House", "Seminar", "Club Meeting",
      "Field Trip", "Cultural Festival"
    ],
    sender: [
      "Mr. Smith", "Mrs. Johnson", "Ms. Williams", "Dr. Brown", 
      "Mr. Davis", "Mrs. Miller", "Mr. Wilson", "Ms. Moore", 
      "Dr. Taylor", "Mrs. Anderson", "Mr. Garcia", "Mrs. Martinez", 
    ]
  }
};

export default function hideSensitiveContent() {
  Object.entries(contentConfig).forEach(([_, { selector, action }]) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element: Element) => {
      action(element);
    });
  });
}