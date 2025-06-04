import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { convertTo12HourFormat } from "./convertTo12HourFormat";
import { waitForElm } from "./waitForElm";


export async function updateTimetableTimes(): Promise<void> {
  if (!settingsState.timeFormat) return;

  const timetablePage = document.querySelector(".timetablepage");
  if (!timetablePage) return;

  // Wait for time elements to exist if page is still loading
  try {
    await waitForElm(".timetablepage .time", true, 10);
  } catch {
    return;
  }

  const times = timetablePage.querySelectorAll<HTMLElement>(".times .time");
  times.forEach((el) => {
    if (!el.dataset.original) el.dataset.original = el.textContent || "";
    const original = el.dataset.original;
    if (!original) return;

    if (settingsState.timeFormat === "12") {
      el.textContent = convertTo12HourFormat(original, true)
        .toLowerCase()
        .replace(" ", "");
    } else {
      el.textContent = original;
    }
  });

  const entryTimes = timetablePage.querySelectorAll<HTMLElement>(".entry .times");
  entryTimes.forEach((el) => {
    if (!el.dataset.original) el.dataset.original = el.textContent || "";
    const original = el.dataset.original || "";
    if (!original.includes("–") && !original.includes("-")) return;

    const [start, end] = original.split(/[-–]/).map((p) => p.trim());
    if (!start || !end) return;

    if (settingsState.timeFormat === "12") {
      const start12 = convertTo12HourFormat(start).toLowerCase().replace(" ", "");
      const end12 = convertTo12HourFormat(end).toLowerCase().replace(" ", "");
      el.textContent = `${start12}–${end12}`;
    } else {
      el.textContent = original;
    }
  });
}
