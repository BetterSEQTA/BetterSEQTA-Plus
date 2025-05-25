import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { loadHomePage } from "@/seqta/utils/Loaders/LoadHomePage";

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
    id: "assessments",
    icon: "\ueac3",
    category: "navigation",
    text: "Assessments",
    action: () => {
      window.location.hash = "?page=/assessments/upcoming";
    },
    priority: 4,
  },
  {
    id: "toggle-dark-mode",
    icon: "\uecfe",
    category: "action",
    text: "Toggle Dark Mode",
    action: () => (settingsState.DarkMode = !settingsState.DarkMode),
    priority: 2,
    keywords: ["theme", "appearance"],
  },
];

/**
 * Returns the predefined list of static commands.
 */
export const getStaticCommands = (): StaticCommandItem[] => {
  return [...staticCommands];
};
