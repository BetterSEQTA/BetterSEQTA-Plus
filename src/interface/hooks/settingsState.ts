import browser from 'webextension-polyfill'
import { useEffect, useMemo } from "react";
import { SettingsProps } from "../types/SettingsProps";
import { SettingsState } from "../types/AppProps";
import { SettingsState as StorageSettingsState } from '../../types/storage';

let RanOnce = false;
let previousSettingsState: SettingsState

const useSettingsState = ({ settingsState, setSettingsState }: SettingsProps) => {
  useEffect(() => {
    if (RanOnce) return;
    RanOnce = true;

    // @ts-expect-error - TODO: Fix this
    browser.storage.local.get().then((result: StorageSettingsState) => {
      setSettingsState({
        notificationCollector: result.notificationcollector,
        lessonAlerts: result.lessonalert,
        animatedBackground: result.animatedbk,
        animatedBackgroundSpeed: result.bksliderinput,
        customThemeColor: result.selectedColor,
        betterSEQTAPlus: result.onoff,
        shortcuts: result.shortcuts,
        customshortcuts: result.customshortcuts,
        transparencyEffects: result.transparencyEffects,
        selectedTheme: result.selectedTheme,
        timeFormat: result.timeFormat,
        animations: result.animations,
        defaultPage: result.defaultPage,
        devMode: result.devMode || false
      });
    });
  });
  const keyToStateMap = useMemo(() => ({
    "notificationcollector": "notificationCollector",
    "lessonalert": "lessonAlerts",
    "animatedbk": "animatedBackground",
    "bksliderinput": "animatedBackgroundSpeed",
    "selectedColor": "customThemeColor",
    "onoff": "betterSEQTAPlus",
    "shortcuts": "shortcuts",
    "customshortcuts": "customshortcuts",
    "transparencyEffects": "transparencyEffects",
    "selectedTheme": "selectedTheme",
    "timeFormat": "timeFormat",
    "animations": "animations",
    "defaultPage": "defaultPage",
    "devMode": "devMode"
  }), []);
  
  const storageChangeListener = (changes: browser.Storage.StorageChange) => {
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key === "DarkMode") {
        if (key === "DarkMode" && newValue) {
          document.body.classList.add('dark');
        } else {
          document.body.classList.remove('dark');
        }
      }

      // @ts-expect-error - TODO: Fix this
      const stateKey = keyToStateMap[key as keyof StorageSettingsState];
      if (stateKey) {
        setSettingsState((prevState: SettingsState) => ({
          ...prevState,
          [stateKey]: newValue
        }));

      }
    }
  };

  useEffect(() => {
    browser.storage.onChanged.addListener(storageChangeListener);
    return () => {
      browser.storage.onChanged.removeListener(storageChangeListener);
    };
  });

  const setStorage = (key: keyof StorageSettingsState, value: any) => {
    browser.storage.local.set({ [key]: value });
  }

  useEffect(() => {
    if (previousSettingsState) {
      for (const [key, value] of Object.entries(settingsState)) {
        // @ts-expect-error - TODO: Fix this
        const storageKey = Object.keys(keyToStateMap).find(k => keyToStateMap[k] === key);
        // @ts-expect-error - TODO: Fix this
        if (storageKey && value !== previousSettingsState[key]) {
          setStorage(storageKey as keyof StorageSettingsState, value);
        }
      }
    }
    previousSettingsState = settingsState;
  }, [settingsState, keyToStateMap])
}

export default useSettingsState;