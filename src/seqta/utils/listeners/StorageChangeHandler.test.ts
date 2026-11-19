/** @jest-environment jsdom */
import { settingsState } from "./settingsState";
import { StorageChangeHandler } from "./StorageChangeHandler";

jest.mock("@/seqta/ui/colors/colorManager", () => ({ updateAllColors: jest.fn() }));
jest.mock("@/seqta/utils/render/renderShortcuts", () => ({
  renderShortcuts: jest.fn(),
}));
jest.mock("@/seqta/utils/loaders/loadHomePage", () => ({
  registerHomeUpcomingSettingsListeners: jest.fn(),
}));
jest.mock("@/seqta/utils/menuItemVisibility", () => ({
  scheduleMenuItemVisibility: jest.fn(),
}));
jest.mock("@/seqta/utils/openers/menuOrder", () => ({
  changeMenuItemPositions: jest.fn(),
}));
jest.mock("@/seqta/utils/performanceMode", () => ({
  syncPerformanceModeEffects: jest.fn(),
}));

test("changing the selected font updates the page without reloading", () => {
  new StorageChangeHandler();
  settingsState.selectedFont = "inter";

  expect(document.documentElement.style.getPropertyValue("--betterseqta-font-family")).toBe(
    "Inter",
  );
  expect(document.getElementById("betterseqta-font-override")?.textContent).toContain(
    "font-family: Inter",
  );
});
