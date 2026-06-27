import browser from "webextension-polyfill";
import { verboseLog } from "@/utils/verboseLog";
import {
  CALENDAR_WEEKLY_ALARM,
  getAutoSyncWeekly,
  markWeeklySyncPending,
} from "@/seqta/utils/calendarSync/settings";
import { readGoogleCalendarState } from "@/seqta/utils/googleCalendar/storage";
import { readOutlookCalendarState } from "@/seqta/utils/outlookCalendar/storage";

const WEEKLY_PERIOD_MINUTES = 7 * 24 * 60;

function isSeqtaTab(tab: browser.Tabs.Tab): boolean {
  const title = tab.title ?? "";
  return title.includes("SEQTA Learn") || title.includes("SEQTA Engage");
}

async function isAnyCalendarConnected(): Promise<boolean> {
  const [google, outlook] = await Promise.all([
    readGoogleCalendarState(),
    readOutlookCalendarState(),
  ]);
  return !!(
    google.refreshToken ||
    google.accessToken ||
    outlook.refreshToken ||
    outlook.accessToken
  );
}

export async function ensureWeeklySyncAlarm(): Promise<void> {
  const connected = await isAnyCalendarConnected();
  const enabled = await getAutoSyncWeekly();
  if (!connected || !enabled) {
    await browser.alarms.clear(CALENDAR_WEEKLY_ALARM);
    return;
  }

  const existing = await browser.alarms.get(CALENDAR_WEEKLY_ALARM);
  if (!existing) {
    await browser.alarms.create(CALENDAR_WEEKLY_ALARM, {
      periodInMinutes: WEEKLY_PERIOD_MINUTES,
    });
  }
}

export async function clearWeeklySyncAlarm(): Promise<void> {
  await browser.alarms.clear(CALENDAR_WEEKLY_ALARM);
}

export async function triggerWeeklySyncOnSeqtaTabs(): Promise<boolean> {
  const tabs = await browser.tabs.query({});
  const seqtaTabs = tabs.filter((tab) => tab.id != null && isSeqtaTab(tab));
  if (seqtaTabs.length === 0) return false;

  let delivered = false;
  for (const tab of seqtaTabs) {
    if (tab.id == null) continue;
    try {
      await browser.tabs.sendMessage(tab.id, { type: "calendarRunWeeklySync" });
      delivered = true;
    } catch (err) {
      verboseLog("[BetterSEQTA+] Weekly calendar sync message failed for tab:", tab.id, err);
    }
  }
  return delivered;
}

export async function handleWeeklySyncAlarm(): Promise<void> {
  if (!(await isAnyCalendarConnected()) || !(await getAutoSyncWeekly())) return;

  const delivered = await triggerWeeklySyncOnSeqtaTabs();
  if (!delivered) {
    await markWeeklySyncPending();
  }
}

export function registerWeeklySyncAlarmListener(): void {
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== CALENDAR_WEEKLY_ALARM) return;
    void handleWeeklySyncAlarm();
  });
}

export function initCalendarBackground(): void {
  registerWeeklySyncAlarmListener();
  void ensureWeeklySyncAlarm();
}
