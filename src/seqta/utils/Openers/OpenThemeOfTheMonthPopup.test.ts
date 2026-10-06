/** @jest-environment jsdom */
import { OpenThemeOfTheMonthPopup } from "./OpenThemeOfTheMonthPopup";
import { settingsState } from "../listeners/SettingsState";

jest.mock("../DevApiBase", () => ({
  getApiBase: () => "https://example.test",
}));
jest.mock("./PopupManager", () => ({ closePopup: jest.fn() }));
jest.mock("../listeners/SettingsState", () => ({
  settingsState: { animations: false },
}));

const entry = {
  id: "totm-1",
  month: "2026-10",
  title: "October Theme",
  description: "Preview",
  cover_image: "https://example.test/cover.png",
  theme_id: null,
  theme: null,
  created_at: 1,
  updated_at: 1,
};

beforeEach(() => {
  jest.useFakeTimers();
  settingsState.themeOfTheMonthDismissedMonth = undefined;
  document.body.innerHTML = "";
});

afterEach(() => {
  document
    .querySelector<HTMLButtonElement>(".themeOfTheMonthCardSecondary")
    ?.click();
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

it.each([false, true])(
  "click-away dismisses and records the month once (expanded: %s)",
  async (expanded) => {
    const onDismissed = jest.fn();
    await OpenThemeOfTheMonthPopup(entry, onDismissed);
    if (expanded)
      document
        .querySelector<HTMLButtonElement>(".themeOfTheMonthCardPopout")!
        .click();
    const outside = expanded
      ? document.getElementById("theme-of-the-month-backdrop")!
      : document.body;
    outside.click();
    document.body.click();
    jest.advanceTimersByTime(30_000);
    expect(document.getElementById("theme-of-the-month-card")).toBeNull();
    expect(document.getElementById("theme-of-the-month-backdrop")).toBeNull();
    expect(settingsState.themeOfTheMonthDismissedMonth).toBe(entry.month);
    expect(onDismissed).toHaveBeenCalledTimes(1);
  },
);

it("keeps the card open while interacting with it and its fullscreen preview", async () => {
  await OpenThemeOfTheMonthPopup(entry);
  document.querySelector<HTMLElement>(".themeOfTheMonthCardBody")!.click();
  document
    .querySelector<HTMLImageElement>(".themeOfTheMonthCardImage")!
    .click();
  const overlay = document.getElementById("bsplus-popup-media-overlay")!;
  expect(overlay).not.toBeNull();
  overlay.querySelector<HTMLImageElement>("img")!.click();
  overlay.click();
  jest.advanceTimersByTime(180);
  expect(document.getElementById("theme-of-the-month-card")).not.toBeNull();
  expect(settingsState.themeOfTheMonthDismissedMonth).toBeUndefined();
  document.body.click();
  jest.advanceTimersByTime(180);
  expect(document.getElementById("theme-of-the-month-card")).toBeNull();
});

it("ignores the opening click and cleans up an existing card when replaced", async () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  const oldDismissed = jest.fn();
  opener.addEventListener(
    "click",
    () => void OpenThemeOfTheMonthPopup(entry, oldDismissed),
  );
  opener.click();
  expect(document.getElementById("theme-of-the-month-card")).not.toBeNull();
  const newDismissed = jest.fn();
  await OpenThemeOfTheMonthPopup({ ...entry, month: "2026-11" }, newDismissed);
  document.body.click();
  jest.advanceTimersByTime(30_000);
  expect(settingsState.themeOfTheMonthDismissedMonth).toBe("2026-11");
  expect(newDismissed).toHaveBeenCalledTimes(1);
  expect(oldDismissed).not.toHaveBeenCalled();
});
