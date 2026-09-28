import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import {
  adaptiveThemeTransitionEnabled,
  animationsEnabled,
  fullMotionEffectsEnabled,
  globalSearchIndexingEnabled,
  isPerformanceMode,
  isPluginAllowedInPerformanceMode,
  isPluginBlockedByPerformanceMode,
  isPluginForceEnabledInPerformanceMode,
  setPerformanceModePluginOverride,
  transparencyEnabled,
} from "./performanceMode";

describe("performanceMode helpers", () => {
  beforeEach(() => {
    settingsState.performanceMode = false;
    settingsState.performanceModePluginOverrides = {};
    settingsState.animations = true;
    settingsState.transparencyEffects = false;
    settingsState.adaptiveThemeColourTransition = true;
  });

  it("isPerformanceMode reflects settingsState", () => {
    expect(isPerformanceMode()).toBe(false);
    settingsState.performanceMode = true;
    expect(isPerformanceMode()).toBe(true);
  });

  it("animationsEnabled stays on in performance mode when animations setting is on", () => {
    settingsState.animations = true;
    settingsState.performanceMode = true;
    expect(animationsEnabled()).toBe(true);
  });

  it("fullMotionEffectsEnabled is false in performance mode", () => {
    settingsState.animations = true;
    settingsState.performanceMode = true;
    expect(fullMotionEffectsEnabled()).toBe(false);
  });

  it("animationsEnabled respects animations setting when performance mode is off", () => {
    settingsState.animations = false;
    expect(animationsEnabled()).toBe(false);
    settingsState.animations = true;
    expect(animationsEnabled()).toBe(true);
  });

  it("transparencyEnabled is false in performance mode", () => {
    settingsState.transparencyEffects = true;
    settingsState.performanceMode = true;
    expect(transparencyEnabled()).toBe(false);
  });

  it("adaptiveThemeTransitionEnabled is false in performance mode", () => {
    settingsState.adaptiveThemeColourTransition = true;
    settingsState.performanceMode = true;
    expect(adaptiveThemeTransitionEnabled()).toBe(false);
  });

  it("globalSearchIndexingEnabled blocks indexing when global search is paused", () => {
    expect(globalSearchIndexingEnabled(true)).toBe(true);
    settingsState.performanceMode = true;
    expect(globalSearchIndexingEnabled(true)).toBe(false);
  });

  it("blocks heavy plugins unless force-enabled", () => {
    settingsState.performanceMode = true;
    expect(isPluginBlockedByPerformanceMode("global-search")).toBe(true);
    expect(isPluginAllowedInPerformanceMode("global-search")).toBe(false);

    setPerformanceModePluginOverride("global-search", true);
    expect(isPluginForceEnabledInPerformanceMode("global-search")).toBe(true);
    expect(isPluginBlockedByPerformanceMode("global-search")).toBe(false);
    expect(isPluginAllowedInPerformanceMode("global-search")).toBe(true);

    setPerformanceModePluginOverride("global-search", false);
    expect(isPluginBlockedByPerformanceMode("global-search")).toBe(true);
  });

  it("does not block plugins when performance mode is off", () => {
    settingsState.performanceMode = false;
    expect(isPluginBlockedByPerformanceMode("assessments-average")).toBe(false);
  });
});
