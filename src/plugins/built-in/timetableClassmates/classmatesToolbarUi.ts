import { mount, unmount } from "svelte";
import { syncCalendarSyncTheme } from "@/plugins/built-in/timetable/calendarSyncUi";
import chipStyles from "./classmatesToolbarChip.css?inline";

const CONTROLS_CLASS = "timetable-classmates-controls";
const HOST_STYLE_ID = "bsplus-timetable-classmates-chip-styles";

let currentApp: ReturnType<typeof mount> | null = null;

function ensureHostStyles() {
  if (document.getElementById(HOST_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HOST_STYLE_ID;
  style.textContent = chipStyles;
  document.head.appendChild(style);
}

function teardown() {
  if (currentApp) {
    unmount(currentApp);
    currentApp = null;
  }
  document.querySelector(`.${CONTROLS_CLASS}`)?.remove();
  document.getElementById(HOST_STYLE_ID)?.remove();
}

function insertControls(toolbar: HTMLElement, controls: HTMLElement) {
  const calendar = toolbar.querySelector(".timetable-calendar-controls");
  const zoomControls = toolbar.querySelector(".timetable-zoom-controls");
  if (calendar?.nextSibling) {
    toolbar.insertBefore(controls, calendar.nextSibling);
  } else if (zoomControls) {
    toolbar.insertBefore(controls, zoomControls);
  } else {
    toolbar.appendChild(controls);
  }
}

export async function mountClassmatesToolbarChip(): Promise<void> {
  if (document.querySelector(`.${CONTROLS_CLASS}`)) return;

  const toolbar = document.getElementById("toolbar");
  if (!toolbar) return;

  ensureHostStyles();

  const controls = document.createElement("div");
  controls.className = CONTROLS_CLASS;
  insertControls(toolbar, controls);

  const mountRoot = document.createElement("div");
  mountRoot.className = "bsplus-friends-sync-mount";
  syncCalendarSyncTheme(mountRoot);
  controls.appendChild(mountRoot);

  const { default: ClassmatesToolbarChip } = await import("./ClassmatesToolbarChip.svelte");
  currentApp = mount(ClassmatesToolbarChip, { target: mountRoot });
}

export function unmountClassmatesToolbarChip(): void {
  teardown();
}
