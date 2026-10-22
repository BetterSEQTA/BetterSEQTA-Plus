/** @jest-environment jsdom */
import { PluginManager } from "./manager";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { isPluginAllowedInPerformanceMode } from "@/seqta/utils/performanceMode";

jest.mock("@/seqta/utils/performanceMode", () => ({
  isPluginAllowedInPerformanceMode: jest.fn(() => true),
}));

test("startup and performance synchronization share one plugin mount and cleanup", async () => {
  const manager = PluginManager.getInstance();
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  const cleanup = jest.fn();
  manager.registerPlugin({
    id: "grade-analytics",
    name: "Analytics",
    description: "",
    version: "1",
    settings: {},
    run: async () => {
      await ready;
      const row = document.createElement("li");
      row.dataset.key = "analytics";
      document.body.append(row);
      return () => {
        row.remove();
        cleanup();
      };
    },
  });

  const synchronization = manager.startPlugin("grade-analytics");
  const startup = manager.startAllPlugins();
  release();
  await Promise.all([synchronization, startup]);

  expect(document.querySelectorAll('[data-key="analytics"]')).toHaveLength(1);
  await manager.stopPlugin("grade-analytics");
  expect(document.querySelectorAll('[data-key="analytics"]')).toHaveLength(0);
  expect(cleanup).toHaveBeenCalledTimes(1);
});

test.each(["plugin", "master", "performance"])(
  "a redundant startup cannot cancel a pending %s disable",
  async (disable) => {
    const manager = PluginManager.getInstance();
    const id = `pending-${disable}`;
    const storageKey = `plugin.${id}.settings`;
    let release!: () => void;
    let enter!: () => void;
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    const row = document.createElement("li");
    const cleanup = jest.fn(() => row.remove());
    settingsState.onoff = true;
    manager.registerPlugin({
      id,
      name: "Pending",
      description: "",
      version: "1",
      settings: {},
      disableToggle: true,
      run: async () => {
        enter();
        await ready;
        document.body.append(row);
        return cleanup;
      },
    });

    const startup = manager.startPlugin(id);
    await entered;
    if (disable === "plugin")
      settingsState.setKey(storageKey, { enabled: false });
    if (disable === "master") settingsState.onoff = false;
    if (disable === "performance")
      jest.mocked(isPluginAllowedInPerformanceMode).mockReturnValue(false);
    const stopping = manager.stopPlugin(id);
    const redundantStartup = manager.startPlugin(id);
    release();
    await Promise.all([startup, stopping, redundantStartup]);

    try {
      expect(row.isConnected).toBe(false);
      expect(manager.isPluginRunning(id)).toBe(false);
      expect(cleanup).toHaveBeenCalledTimes(1);
    } finally {
      settingsState.onoff = true;
      jest.mocked(isPluginAllowedInPerformanceMode).mockReturnValue(true);
    }
  },
);

test("disabling a plugin during startup cleans up its eventual mount", async () => {
  const manager = PluginManager.getInstance();
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  const row = document.createElement("li");
  manager.registerPlugin({
    id: "enhanced-navigation",
    name: "Navigation",
    description: "",
    version: "1",
    settings: {},
    run: async () => {
      await ready;
      document.body.append(row);
      return () => row.remove();
    },
  });

  const startup = manager.startPlugin("enhanced-navigation");
  const stopping = manager.stopPlugin("enhanced-navigation");
  release();
  await Promise.all([startup, stopping]);

  expect(row.isConnected).toBe(false);
  expect(manager.isPluginRunning("enhanced-navigation")).toBe(false);
});

test("re-enabling during a pending startup wins over an earlier stop", async () => {
  const manager = PluginManager.getInstance();
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  const row = document.createElement("li");
  const cleanup = jest.fn(() => row.remove());
  settingsState.setKey("plugin.background-music.settings", { enabled: true });
  manager.registerPlugin({
    id: "background-music",
    name: "Music",
    description: "",
    version: "1",
    settings: {},
    disableToggle: true,
    run: async () => {
      await ready;
      document.body.append(row);
      return cleanup;
    },
  });

  const startup = manager.startPlugin("background-music");
  settingsState.setKey("plugin.background-music.settings", { enabled: false });
  const stopping = manager.stopPlugin("background-music");
  settingsState.setKey("plugin.background-music.settings", { enabled: true });
  const restarting = manager.startPlugin("background-music");
  release();
  await Promise.all([startup, stopping, restarting]);

  expect(row.isConnected).toBe(true);
  expect(manager.isPluginRunning("background-music")).toBe(true);
  expect(cleanup).not.toHaveBeenCalled();
  await manager.stopPlugin("background-music");
});
