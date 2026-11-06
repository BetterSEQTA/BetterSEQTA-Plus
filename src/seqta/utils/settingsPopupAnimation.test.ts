/** @jest-environment jsdom */
import { settingsState } from "./listeners/settingsState";
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

test("closing settings that were never opened leaves the host hidden", () => {
  settingsState.animations = true;
  const host = document.createElement("div");
  host.classList.add("hide");
  host.attachShadow({
    mode: "open",
  }).innerHTML = `<button class="settings-backdrop"></button><div data-settings-panel></div>`;
  document.body.append(host);

  animateSettingsClose(host);

  expect(host.style.opacity).not.toBe("1");
  expect(isSettingsHostVisiblyOpen(host)).toBe(false);
});

test("closing settings again after they've hidden doesn't replay the close", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const hidden = jest.fn();
  host.addEventListener("bsplus:settings-hidden", hidden);

  animateSettingsOpen(host);
  animateSettingsClose(host);
  expect(hidden).toHaveBeenCalledTimes(1);

  animateSettingsClose(host);
  animateSettingsClose(host);
  expect(hidden).toHaveBeenCalledTimes(1);
  expect(host.style.opacity).toBe("0");
});
