/*global chrome*/
import { useEffect, useMemo } from "react";
import { SettingsProps } from "../types/SettingsProps";
import { MainConfig, SettingsState } from "../types/AppProps";

let RanOnce = false;
let previousSettingsState: SettingsState

const useSettingsState = ({ settingsState, setSettingsState }: SettingsProps) => {
  useEffect(() => {
    if (RanOnce) return;
    RanOnce = true;

    // get the current settings state
    chrome.storage.local.get(function(result: MainConfig) {
      console.log(result);
      setSettingsState({
        notificationCollector: result.notificationcollector,
        lessonAlerts: result.lessonalert,
        animatedBackground: result.animatedbk,
        animatedBackgroundSpeed: result.bksliderinput,
        customThemeColor: result.selectedColor,
        betterSEQTAPlus: result.onoff,
        shortcuts: result.shortcuts,
        customshortcuts: result.customshortcuts,
      });
      
      if (result.DarkMode) {
        document.body.classList.add('dark');
      }
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
  }), []);
  
  const storageChangeListener = (changes: chrome.storage.StorageChange) => {
    console.log(settingsState);
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key === "DarkMode") {
        if (key === "DarkMode" && newValue) {
          document.body.classList.add('dark');
        } else {
          document.body.classList.remove('dark');
        }
      }

      // @ts-expect-error - TODO: Fix this
      const stateKey = keyToStateMap[key as keyof MainConfig];
      if (stateKey) {
        setSettingsState((prevState: SettingsState) => ({
          ...prevState,
          [stateKey]: newValue
        }));

      }
    }
  };

  useEffect(() => {
    chrome.storage.onChanged.addListener(storageChangeListener);
    return () => {
      chrome.storage.onChanged.removeListener(storageChangeListener);
    };
  });

  const setStorage = (key: keyof MainConfig, value: any) => {
    chrome.storage.local.set({ [key]: value });
  }

  useEffect(() => {
    if (previousSettingsState) {
      for (const [key, value] of Object.entries(settingsState)) {
        // @ts-expect-error - TODO: Fix this
        const storageKey = Object.keys(keyToStateMap).find(k => keyToStateMap[k] === key);
        // @ts-expect-error - TODO: Fix this
        if (storageKey && value !== previousSettingsState[key]) {
          setStorage(storageKey as keyof MainConfig, value);
        }
      }
    }
    previousSettingsState = settingsState;
  }, [settingsState, keyToStateMap])
}

export default useSettingsState;