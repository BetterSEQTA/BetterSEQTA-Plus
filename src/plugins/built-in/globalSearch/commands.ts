import { settingsState } from '@/seqta/utils/listeners/SettingsState';
import { loadHomePage } from '@/seqta/utils/Loaders/LoadHomePage';

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
    id: 'home',
    icon: '\ueb4c', 
    category: 'navigation',
    text: 'Home',
    keybind: ['alt+h'],
    keybindLabel: ['Alt', 'H'],
    action: () => {
      window.location.hash = '?page=/home';
      loadHomePage();
    },
    priority: 10
  },
  {
    id: 'messages',
    icon: '\uebfd', 
    category: 'navigation',
    text: 'Direct Messages',
    keybind: ['alt+m'],
    keybindLabel: ['Alt', 'M'],
    action: () => {
      window.location.hash = '?page=/messages';
    },
    priority: 10
  },
  {
    id: 'timetable',
    icon: '\ue9cd', 
    category: 'navigation',
    text: 'Timetable',
    keybind: ['alt+t'],
    keybindLabel: ['Alt', 'T'],
    action: () => {
      window.location.hash = '?page=/timetable';
    },
    priority: 10
  },
  {
    id: 'assessments',
    icon: '\ueac3', 
    category: 'navigation',
    text: 'Assessments',
    keybind: ['alt+a'],
    keybindLabel: ['Alt', 'A'],
    action: () => {
      window.location.hash = '?page=/assessments';
    },
    priority: 10
  },
  {
    id: 'toggle-dark-mode',
    icon: '\uecfe',
    category: 'action',
    text: 'Toggle Dark Mode',
    action: () => settingsState.DarkMode = !settingsState.DarkMode,
    priority: 5,
    keywords: ['theme', 'appearance']
  }
];

/**
 * Returns the predefined list of static commands.
 */
export const getStaticCommands = (): StaticCommandItem[] => {
  return [...staticCommands]; 
};