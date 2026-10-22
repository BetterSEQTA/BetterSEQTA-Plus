/** @jest-environment jsdom */
import { settingsState } from "./SettingsState";
import { StorageChangeHandler } from "./StorageChanges";

jest.mock("@/seqta/ui/colors/Manager", () => ({ updateAllColors: jest.fn() }));
jest.mock("@/seqta/utils/Render/renderShortcuts", () => ({
  renderShortcuts: jest.fn(),
}));
jest.mock("@/seqta/utils/FilterUpcomingAssessments", () => ({
  FilterUpcomingAssessments: jest.fn(),
}));
jest.mock("@/seqta/utils/Loaders/LoadHomePage", () => ({
  registerHomeUpcomingSettingsListeners: jest.fn(),
}));
jest.mock("@/seqta/utils/menuItemVisibility", () => ({
  scheduleMenuItemVisibility: jest.fn(),
}));
jest.mock("@/seqta/utils/Openers/menuOrder", () => ({
  ChangeMenuItemPositions: jest.fn(),
}));
jest.mock("@/seqta/utils/performanceMode", () => ({
  syncPerformanceModeEffects: jest.fn(),
}));

test("changing the selected font updates the page without reloading", () => {
  new StorageChangeHandler();
  settingsState.selectedFont = "inter";

  expect(
    document.documentElement.style.getPropertyValue(
      "--betterseqta-font-family",
    ),
  ).toBe("Inter");
  expect(
    document.getElementById("betterseqta-font-override")?.textContent,
  ).toContain("font-family: Inter");
});
