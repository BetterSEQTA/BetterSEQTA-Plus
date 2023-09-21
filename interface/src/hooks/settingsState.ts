/*global chrome*/
import { useEffect, useMemo } from "react";
import { SettingsProps } from "../types/SettingsProps";
import { MainConfig, SettingsState } from "../types/AppProps";

let RanOnce = false;
type StorageKeyToStateKeyMap = {
  [key in keyof MainConfig]?: keyof SettingsState;
};
let previousSettingsState: SettingsState

const useSettingsState = ({ settingsState, setSettingsState }: SettingsProps) => {
  // run the following code once
  useEffect(() => {
    if (RanOnce) return;
    RanOnce = true;

    // get the current settings state
    chrome.storage.local.get(function(result: MainConfig) {
      setSettingsState({
        notificationCollector: result.notificationcollector,
        lessonAlerts: result.lessonalert,
        animatedBackground: result.animatedbk,
        animatedBackgroundSpeed: result.bksliderinput,
        customThemeColor: result.selectedColor,
        betterSEQTAPlus: result.onoff
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
  }), []);
  
  const storageChangeListener = (changes: chrome.storage.StorageChange) => {
    for (const [key, { newValue }] of Object.entries(changes)) {
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
    console.log(chrome.storage.local.set({ [key]: value }));
  }

  useEffect(() => {
    console.log("settingsState", settingsState)
    console.log("previousSettingsState", previousSettingsState)
    if (previousSettingsState) {
      for (const [key, value] of Object.entries(settingsState)) {
        const storageKey = Object.keys(keyToStateMap).find(k => keyToStateMap[k] === key);
        if (storageKey && value !== previousSettingsState[key]) {
          console.log("key", storageKey)
          setStorage(storageKey as keyof MainConfig, value);
        }
      }
    }
    previousSettingsState = settingsState;
  }, [settingsState, keyToStateMap])
}

export default useSettingsState;