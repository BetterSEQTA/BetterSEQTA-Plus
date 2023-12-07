import browser from 'webextension-polyfill'
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
    // @ts-expect-error idk js/ts wizardry
    browser.storage.local.get().then().then(function(result: MainConfig) {
      setSettingsState({
        notificationCollector: result.notificationcollector,
        lessonAlerts: result.lessonalert,
        telemetry: result.telemetry,
        animatedBackground: result.animatedbk,
        animatedBackgroundSpeed: result.bksliderinput,
        customThemeColor: result.selectedColor,
        betterSEQTAPlus: result.onoff,
        shortcuts: result.shortcuts,
        customshortcuts: result.customshortcuts,
        transparencyEffects: result.transparencyEffects
      });
      
      if (result.DarkMode) {
        document.body.classList.add('dark');
      }
    });
  });
  
  const keyToStateMap = useMemo(() => ({
    "notificationcollector": "notificationCollector",
    "lessonalert": "lessonAlerts",
    "telemetry": "telemetry",
    "animatedbk": "animatedBackground",
    "bksliderinput": "animatedBackgroundSpeed",
    "selectedColor": "customThemeColor",
    "onoff": "betterSEQTAPlus",
    "shortcuts": "shortcuts",
    "customshortcuts": "customshortcuts",
    "transparencyEffects": "transparencyEffects"
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
    browser.storage.onChanged.addListener(storageChangeListener);
    return () => {
      browser.storage.onChanged.removeListener(storageChangeListener);
    };
  });

  const setStorage = (key: keyof MainConfig, value: any) => {
    browser.storage.local.set({ [key]: value });
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