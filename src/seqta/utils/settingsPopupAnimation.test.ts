/** @jest-environment jsdom */
import { settingsState } from "./listeners/SettingsState";
import {
  animateSettingsClose,
  animateSettingsOpen,
  isSettingsHostVisiblyOpen,
} from "./settingsPopupAnimation";

test("a settings popup reopened during its close animation stays visible", () => {
  jest.useFakeTimers();
  try {
    settingsState.animations = true;
    const host = document.createElement("div");
    document.body.append(host);
    animateSettingsOpen(host);
    jest.advanceTimersByTime(20);
    animateSettingsClose(host);
    jest.advanceTimersByTime(50);
    animateSettingsOpen(host);
    jest.advanceTimersByTime(250);

    expect(isSettingsHostVisiblyOpen(host)).toBe(true);
    expect(host.style.opacity).not.toBe("0");
  } finally {
    jest.useRealTimers();
  }
});
