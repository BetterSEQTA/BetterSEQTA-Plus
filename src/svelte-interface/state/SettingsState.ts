import browser from "webextension-polyfill";
import type { MainConfig, SettingsState } from "../types/AppProps";
import { writable } from "svelte/store";

const initialState: SettingsState = {
  notificationCollector: false,
  lessonAlerts: false,
  telemetry: false,
  animatedBackground: false,
  animatedBackgroundSpeed: '0',
  customThemeColor: '',
  betterSEQTAPlus: false,
  shortcuts: [],
  customshortcuts: [],
  transparencyEffects: false,
  theme: ''
};

const keyToStateMap: { [key: string]: string } = {
  notificationcollector: 'notificationCollector',
  lessonalert: 'lessonAlerts',
  telemetry: 'telemetry',
  animatedbk: 'animatedBackground',
  bksliderinput: 'animatedBackgroundSpeed',
  selectedColor: 'customThemeColor',
  onoff: 'betterSEQTAPlus',
  shortcuts: 'shortcuts',
  customshortcuts: 'customshortcuts',
  transparencyEffects: 'transparencyEffects'
};

const stateToKeyMap = Object.fromEntries(
  Object.entries(keyToStateMap).map(([key, value]) => [value, key])
);

const storageChangeListener = async (changes: browser.Storage.StorageChange) => {
  for (const [key, { newValue }] of Object.entries(changes)) {
    const stateKey = keyToStateMap[key] || key;

    if (stateKey === 'DarkMode') {
      if (newValue) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    }
    settingsState.update((prevState) => ({ ...prevState, [stateKey]: newValue }));
  }
}

const initialStorageLoad = async (storage: MainConfig) => {
  for (const [key, value] of Object.entries(storage)) {
    const stateKey = keyToStateMap[key] || key;

    if (stateKey === 'DarkMode') {
      if (value) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    }
    settingsState.update((prevState) => ({ ...prevState, [stateKey]: value }));
  }
}

const settingsSubscription = (/* set: (value: SettingsState) => void */) => {
  settingsState.subscribe((newState) => {
    const stateToSave = Object.fromEntries(
      Object.entries(newState).map(([key, value]) => [stateToKeyMap[key] || key, value])
    );
    browser.storage.local.set(stateToSave);
    /* set(newState); */
  });
}

export const initializeListeners = async () => {
  const result = await browser.storage.local.get() as MainConfig;

  await initialStorageLoad(result);

  settingsSubscription();

  browser.storage.onChanged.addListener(storageChangeListener);
}


export const settingsState = writable(initialState);

export const setSettingsValue = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
  settingsState.update((prevState) => ({ ...prevState, [key]: value }));
}