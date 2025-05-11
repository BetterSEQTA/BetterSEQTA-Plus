// Import the settings state, which manages UI preferences such as dark mode
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
// Import the function that loads the home page content
import { loadHomePage } from "@/seqta/utils/Loaders/LoadHomePage";

// Defines the structure for a basic command item
export interface BaseCommandItem {
  id: string; // Unique identifier for the command
  text: string; // Display text for the command
  category: string; // Command category (e.g., navigation, action)
  icon: string; // Icon representing the command (likely a Unicode or custom font icon)
  action: () => void; // Function executed when the command is activated
  keywords?: string[]; // Optional search keywords associated with the command
  priority?: number; // Optional priority level used for sorting or filtering
}

// Extends BaseCommandItem to include optional keyboard bindings
export interface StaticCommandItem extends BaseCommandItem {
  keybind?: string[]; // Array of keybind shortcuts (e.g., ["alt+h"])
  keybindLabel?: string[]; // Readable labels for keybinds (e.g., ["Alt", "H"])
}

// Defines a list of static command items used in the application
const staticCommands: StaticCommandItem[] = [
  {
    id: "home",
    icon: "\ueb4c",
    category: "navigation",
    text: "Home",
    keybind: ["alt+h"],
    keybindLabel: ["Alt", "H"],
    action: () => {
      // Navigates to the home page and loads its content
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
    keybind: ["alt+m"],
    keybindLabel: ["Alt", "M"],
    action: () => {
      // Navigates to the direct messages page
      window.location.hash = "?page=/messages";
    },
    priority: 4,
  },
  {
    id: "timetable",
    icon: "\ue9cd",
    category: "navigation",
    text: "Timetable",
    keybind: ["alt+t"],
    keybindLabel: ["Alt", "T"],
    action: () => {
      // Navigates to the timetable page
      window.location.hash = "?page=/timetable";
    },
    priority: 4,
  },
  {
    id: "assessments",
    icon: "\ueac3",
    category: "navigation",
    text: "Assessments",
    keybind: ["alt+a"],
    keybindLabel: ["Alt", "A"],
    action: () => {
      // Navigates to the assessments page
      window.location.hash = "?page=/assessments";
    },
    priority: 4,
  },
  {
    id: "toggle-dark-mode",
    icon: "\uecfe",
    category: "action",
    text: "Toggle Dark Mode",
    action: () => (settingsState.DarkMode = !settingsState.DarkMode), // Toggles the dark mode setting
    priority: 2,
    keywords: ["theme", "appearance"],
  },
];

/**
 * Returns the predefined list of static commands.
 */
export const getStaticCommands = (): StaticCommandItem[] => {
  return [...staticCommands]; // Returns a shallow copy of the staticCommands array
};
