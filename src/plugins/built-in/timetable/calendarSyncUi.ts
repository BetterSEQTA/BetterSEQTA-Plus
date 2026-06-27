import { mount, unmount } from "svelte";
import CalendarSyncControl from "./CalendarSyncControl.svelte";
import { syncCalendarSyncTheme } from "./calendarSyncTheme";
import { registerCalendarContentHandlers } from "@/seqta/utils/googleCalendar/calendarSyncListener";
import hostStyles from "./calendarSyncHost.css?inline";

const CONTROLS_CLASS = "timetable-calendar-controls";
const HOST_STYLE_ID = "bsplus-calendar-sync-host-styles";

let currentApp: ReturnType<typeof mount> | null = null;
let mountRoot: HTMLElement | null = null;

function ensureHostStyles() {
  if (document.getElementById(HOST_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HOST_STYLE_ID;
  style.textContent = hostStyles;
  document.head.appendChild(style);
}

function teardown() {
  if (currentApp) {
    unmount(currentApp);
    currentApp = null;
  }

  mountRoot = null;
  document.querySelector(`.${CONTROLS_CLASS}`)?.remove();
  document.getElementById(HOST_STYLE_ID)?.remove();
}

export async function mountGoogleCalendarButton(): Promise<void> {
  if (document.querySelector(`.${CONTROLS_CLASS}`)) return;

  const toolbar = document.getElementById("toolbar");
  if (!toolbar) return;

  ensureHostStyles();
  registerCalendarContentHandlers();

  const controls = document.createElement("div");
  controls.className = `${CONTROLS_CLASS} bsplus-timetable-control`;
  toolbar.appendChild(controls);

  mountRoot = document.createElement("div");
  mountRoot.className = "bsplus-calendar-sync-mount";
  syncCalendarSyncTheme(mountRoot);
  controls.appendChild(mountRoot);

  currentApp = mount(CalendarSyncControl, { target: mountRoot });
}

export function unmountGoogleCalendarButton(): void {
  teardown();
}
