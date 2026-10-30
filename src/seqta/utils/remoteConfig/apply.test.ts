import {
  computeEffectiveEnabled,
  isRemoteFeatureAllowed,
  resolveFeatureMode,
} from "./apply";
import { DEFAULT_REMOTE_CONFIG } from "./normalize";
import type { RemoteConfigSnapshot } from "./types";

function snapshot(partial: Partial<RemoteConfigSnapshot>): RemoteConfigSnapshot {
  return {
    ...DEFAULT_REMOTE_CONFIG,
    ...partial,
    global: { ...DEFAULT_REMOTE_CONFIG.global, ...partial.global },
    features: { ...DEFAULT_REMOTE_CONFIG.features, ...partial.features },
  };
}

describe("computeEffectiveEnabled", () => {
  it("respects user master toggle", () => {
    expect(computeEffectiveEnabled(false, snapshot({}), false)).toBe(false);
  });

  it("allows when remote mode is on", () => {
    expect(computeEffectiveEnabled(true, snapshot({ global: { mode: "on" } }), false)).toBe(
      true,
    );
  });

  it("blocks when remote kill without local override", () => {
    expect(
      computeEffectiveEnabled(
        true,
        snapshot({ global: { mode: "off", allowLocalOverride: true } }),
        false,
      ),
    ).toBe(false);
  });

  it("allows local override when permitted", () => {
    expect(
      computeEffectiveEnabled(
        true,
        snapshot({ global: { mode: "off", allowLocalOverride: true } }),
        true,
      ),
    ).toBe(true);
  });

  it("ignores local override when server forbids it", () => {
    expect(
      computeEffectiveEnabled(
        true,
        snapshot({ global: { mode: "off", allowLocalOverride: false } }),
        true,
      ),
    ).toBe(false);
  });

  it("blocks hostname on denylist unless local override", () => {
    const snap = snapshot({
      global: {
        mode: "on",
        hostnamePolicy: { mode: "denylist", suffixes: ["blocked.edu.au"] },
      },
    });
    expect(computeEffectiveEnabled(true, snap, false, "learn.blocked.edu.au")).toBe(false);
    expect(computeEffectiveEnabled(true, snap, true, "learn.blocked.edu.au")).toBe(true);
  });
});

describe("resolveFeatureMode", () => {
  it("treats temp_hide as hide only for matching config version", () => {
    const snap = snapshot({
      configVersion: "42",
      features: { "page.news": { mode: "temp_hide" } },
    });
    expect(resolveFeatureMode("page.news", snap, { "page.news": "41" })).toBe("allow");
    expect(resolveFeatureMode("page.news", snap, { "page.news": "42" })).toBe("hide");
  });

  it("maps banner to allowed but not hide", () => {
    const snap = snapshot({
      features: { "plugin.grade-analytics": { mode: "banner" } },
    });
    expect(isRemoteFeatureAllowed("plugin.grade-analytics", snap)).toBe(true);
    expect(resolveFeatureMode("plugin.grade-analytics", snap)).toBe("banner");
  });
});

describe("SEQTA boot decision", () => {
  it("would skip monofile when effective enablement is false", () => {
    const shouldBootFull = computeEffectiveEnabled(
      true,
      snapshot({ global: { mode: "off", allowLocalOverride: true } }),
      false,
    );
    expect(shouldBootFull).toBe(false);
  });
});

describe("hydrateRemoteConfigFromStorage", () => {
  it("requests cached snapshot before background refresh when storage is empty", async () => {
    jest.resetModules();
    jest.doMock("webextension-polyfill", () => ({
      storage: {
        local: {
          get: jest.fn(async () => ({})),
          set: jest.fn(async () => {}),
        },
        onChanged: { addListener: jest.fn() },
      },
      runtime: {
        getManifest: () => ({ version: "3.7.6" }),
        sendMessage: jest.fn(async (msg: { type?: string }) =>
          msg.type === "getRemoteConfigSnapshot"
            ? { snapshot: { configVersion: "1", global: { mode: "on" }, features: {}, campaigns: [] } }
            : {},
        ),
      },
    }));
    jest.doMock("@/seqta/utils/listeners/SettingsState", () => ({
      settingsState: { onoff: true },
    }));
    const { hydrateRemoteConfigFromStorage } = await import("./runtime");
    await hydrateRemoteConfigFromStorage();
    const browser = jest.requireMock("webextension-polyfill");
    const types = browser.runtime.sendMessage.mock.calls.map(
      (c: [{ type?: string }]) => c[0]?.type,
    );
    expect(types).toContain("getRemoteConfigSnapshot");
    expect(types).toContain("refreshRemoteConfig");
    expect(types.indexOf("getRemoteConfigSnapshot")).toBeLessThan(
      types.indexOf("refreshRemoteConfig"),
    );
  });
});
