/** @jest-environment jsdom */
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { applySidebarLook, clearSidebarAppearance } from "./sidebarStyles";

jest.mock("@/seqta/utils/performanceMode", () => ({ isPerformanceMode: () => false }));

beforeEach(() => {
  clearSidebarAppearance(document.getElementById("menu"));
  document.body.innerHTML = "";
  settingsState.sidebarDensity = "compact";
  settingsState.sidebarActiveIndicator = "outline";
  settingsState.sidebarWidth = "wide";
  settingsState.sidebarPosition = "right";
});

test("early sidebar preparation and cleanup work before body exists", () => {
  const body = document.body;
  body.remove();
  try {
    expect(() => applySidebarLook(null)).not.toThrow();
    expect(document.documentElement.style.getPropertyValue("--bsplus-sidebar-width")).toBe("320px");
    expect(() => clearSidebarAppearance(null)).not.toThrow();
  } finally {
    document.documentElement.append(body);
  }
});

test.each([false, true])("applies unchanged settings to a newly available menu (replacement: %s)", (replacement) => {
  const initialMenu = replacement ? document.createElement("div") : null;
  applySidebarLook(initialMenu);
  const menu = document.createElement("div");
  menu.id = "menu";
  document.body.append(menu);

  applySidebarLook(menu);

  expect(menu.classList.contains("bsplus-sidebar-density-compact")).toBe(true);
  expect(menu.classList.contains("bsplus-sidebar-indicator-outline")).toBe(true);
});

test("restores sidebar variables and classes after disable and re-enable", () => {
  const menu = document.createElement("div");
  applySidebarLook(menu);
  clearSidebarAppearance(menu);
  expect(document.documentElement.style.getPropertyValue("--bsplus-sidebar-width")).toBe("");

  applySidebarLook(menu);

  expect(document.documentElement.style.getPropertyValue("--bsplus-sidebar-width")).toBe("320px");
  expect(menu.classList.contains("bsplus-sidebar-density-compact")).toBe(true);
  expect(document.body.classList.contains("bsplus-sidebar-right")).toBe(true);
});
