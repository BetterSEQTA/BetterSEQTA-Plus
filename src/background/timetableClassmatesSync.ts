import browser from "webextension-polyfill";

import { hasAnySyncOptInScope } from "@/plugins/built-in/timetableClassmates/syncScopes";
import { isSeqtaTab } from "@/seqta/utils/seqtaTabMatch";

const ALARM_NAME = "timetable-classmates-sync";
const ALARM_PERIOD_MINUTES = 8 * 60;

let initialized = false;

async function pingSeqtaTabs(): Promise<void> {
  const tabs = await browser.tabs.query({});
  for (const tab of tabs) {
    if (!isSeqtaTab(tab) || tab.id == null) continue;
    try {
      await browser.tabs.sendMessage(tab.id, { type: "timetableClassmatesSync" });
    } catch {
      /* content script not ready */
    }
  }
}

async function pingIfOptedIn(): Promise<void> {
  if (!(await hasAnySyncOptInScope())) return;
  await pingSeqtaTabs();
}

export function initTimetableClassmatesBackgroundSync(): void {
  if (initialized) return;
  initialized = true;

  void browser.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MINUTES });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) void pingIfOptedIn();
  });
}
