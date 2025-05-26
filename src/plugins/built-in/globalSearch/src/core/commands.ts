import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { loadHomePage } from "@/seqta/utils/Loaders/LoadHomePage";
import { waitForElm } from "@/seqta/utils/waitForElm";

export interface BaseCommandItem {
  id: string;
  text: string;
  category: string;
  icon: string;
  action: () => void;
  keywords?: string[];
  priority?: number;
}

export interface StaticCommandItem extends BaseCommandItem {
  keybind?: string[];
  keybindLabel?: string[];
}

// Function to get current lesson
async function getCurrentLesson() {
  const date = new Date();
  const todayFormatted = formatDate(date);
  
  try {
    const response = await fetch(`${location.origin}/seqta/student/load/timetable?`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: todayFormatted,
        until: todayFormatted,
        student: 69,
      }),
    });
    
    const timetableData = await response.json();
    
    if (!timetableData.payload.items.length) {
      alert("No lessons today!");
      return null;
    }
    
    const lessons = timetableData.payload.items.sort((a: any, b: any) =>
      a.from.localeCompare(b.from)
    );
    
    const currentTime = new Date();
    
    for (const lesson of lessons) {
      const [startHour, startMinute] = lesson.from.split(":").map(Number);
      const [endHour, endMinute] = lesson.until.split(":").map(Number);
      
      const startDate = new Date(currentTime);
      startDate.setHours(startHour, startMinute, 0);
      
      const endDate = new Date(currentTime);
      endDate.setHours(endHour, endMinute, 0);
      
      if (startDate <= currentTime && endDate > currentTime) {
        return lesson;
      }
    }
    
    alert("There is no current lesson!");
    return null;
  } catch (error) {
    console.error("Error fetching current lesson:", error);
    alert("Error getting current lesson. Please try again.");
    return null;
  }
}

async function navigateToSpecificLesson(lesson: any) {
  try {
    await waitForElm(".course .navigator", true, 100, 100);
    
    const today = new Date();
    const todayDateString = today.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short' 
    });
    
    const weeks = document.querySelectorAll(".course .navigator .week");
    
    for (const week of weeks) {
      // Look for lessons in this week
      const lessons = week.querySelectorAll(".lesson");
      
      for (const lessonElement of lessons) {
        const metaElement = lessonElement.querySelector(".meta");
        if (!metaElement) continue;
        
        const dateElement = metaElement.querySelector(".date");
        const periodElement = metaElement.querySelector(".period");
        
        if (!dateElement || !periodElement) continue;
        
        const lessonDate = dateElement.textContent?.trim();
        const lessonPeriod = periodElement.textContent?.trim().match(/\d+/)?.[0];
        
        // extract the number from the period
        const normalizedLessonPeriod = lesson.period?.match(/\d+/)?.[0];
        
        // Check if this lesson matches today's date and the current lesson's period
        if (lessonDate === todayDateString && lessonPeriod === normalizedLessonPeriod) {
          // Found the exact matching lesson, click it
          (lessonElement as HTMLElement).click();
          console.log(`Navigated to exact lesson: ${lessonDate} ${lessonPeriod}`);
          return true;
        }
      }
    }
        
    const todayButton = Array.from(document.querySelectorAll('#toolbar .uiButton'))
      .find(button => button.textContent?.trim() === 'Today') as HTMLElement;
    
    if (todayButton) {
      todayButton.click();
    }

    return true;
  } catch (error) {
    console.error("Error navigating to specific lesson:", error);
    return false;
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const staticCommands: StaticCommandItem[] = [
  {
    id: "home",
    icon: "\ueb4c",
    category: "navigation",
    text: "Home",
    action: () => {
      window.location.hash = "?page=/home";
      loadHomePage();
    },
    priority: 4,
  },
  {
    id: "messages",
    icon: "\uebfd",
    category: "navigation",
    text: "Direct Messages",
    action: () => {
      window.location.hash = "?page=/messages";
    },
    priority: 4,
  },
  {
    id: "timetable",
    icon: "\ue9cd",
    category: "navigation",
    text: "Timetable",
    action: () => {
      window.location.hash = "?page=/timetable";
    },
    priority: 4,
  },
  {
    id: "Current Lesson",
    icon: "\ue9a5",
    category: "navigation",
    text: "Current Lesson",
    priority: 4,
    action: async () => {
      const currentLesson = await getCurrentLesson();
      if (currentLesson && currentLesson.programmeID !== 0) {
        // Navigate to course page first
        window.location.hash = `?page=/courses/${currentLesson.programmeID}:${currentLesson.metaID}`;
        
        await navigateToSpecificLesson(currentLesson);
      }
    },
  },
  {
    id: "assessments",
    icon: "\ueac3",
    category: "navigation",
    text: "Assessments",
    keybind: ["alt+a"],
    keybindLabel: ["Alt", "A"],
    action: () => {
      window.location.hash = "?page=/assessments/upcoming";
    },
    priority: 4,
  },
  {
    id: "dashboard",
    icon: "\ueb87",
    category: "navigation",
    text: "Dashboard",
    priority: 4,
    action: () => {
      window.location.hash = "?page=/dashboard";
    },
  },
  {
    id: "compose-message",
    icon: "\ue924",
    category: "action",
    text: "Compose Message",
    action: () => {
      window.postMessage({
        type: "triggerKeyboardEvent",
        key: 'm',
        code: 'KeyM',
        keyCode: 77,
        altKey: true
      }, "*");
    },
    keywords: ["compose", "message", "dm", "direct message", "new message"],
    priority: 3,
  },
  {
    id: "toggle-dark-mode",
    icon: "\uecfe",
    category: "action",
    text: "Toggle Dark Mode",
    action: () => (settingsState.DarkMode = !settingsState.DarkMode),
    priority: 3,
    keywords: ["theme", "appearance"],
  },
];

/**
 * Returns the predefined list of static commands.
 */
export const getStaticCommands = (): StaticCommandItem[] => {
  return [...staticCommands];
};
