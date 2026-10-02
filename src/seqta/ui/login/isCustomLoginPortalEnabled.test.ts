/**
 * @jest-environment jsdom
 */
import { settingsState, setSettingsStateSuppressWrites } from "@/seqta/utils/listeners/SettingsState";
import { isCustomLoginPortalEnabled } from "./isCustomLoginPortalEnabled";

describe("isCustomLoginPortalEnabled", () => {
  beforeEach(() => {
    setSettingsStateSuppressWrites(true);
    settingsState.onoff = true;
    settingsState.customLoginPortal = true;
  });

  afterEach(() => {
    setSettingsStateSuppressWrites(false);
  });

  it("is enabled by default", () => {
    expect(isCustomLoginPortalEnabled()).toBe(true);
  });

  it("is disabled when the user opts into the default login screen", () => {
    settingsState.customLoginPortal = false;
    expect(isCustomLoginPortalEnabled()).toBe(false);
  });

  it("is disabled when BetterSEQTA+ is off", () => {
    settingsState.onoff = false;
    expect(isCustomLoginPortalEnabled()).toBe(false);
  });
});
