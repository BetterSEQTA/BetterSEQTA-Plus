import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";
import {
  booleanSetting,
  defineSettings,
  Setting,
} from "@/plugins/core/settingsHelpers";

// Step 1: Define settings with proper typing
const settings = defineSettings({
  someSetting: booleanSetting({
    default: true,
    title: "Test Plugin",
    description: "Some random setting",
  }),
});

// Step 2: Create the plugin class with @Setting decorators
class TestPluginClass extends BasePlugin<typeof settings> {
  @Setting(settings.someSetting)
  someSetting!: boolean;
}

// Step 3: Instantiate and plug it in
const settingsInstance = new TestPluginClass();

const testPlugin: Plugin<typeof settings> = {
  id: "test",
  name: "Test Plugin",
  description: "A test plugin for BetterSEQTA+",
  version: "1.0.0",
  settings: settingsInstance.settings,
  disableToggle: true,
  beta: true,

  run: async (api) => {
    console.log("Test plugin running");

    api.events.on("ping", (data) => {
      console.log("Ping received! Page changed to: ", data);
    });

    const { unregister } = api.seqta.onPageChange((page) => {
      //console.log('Page changed to', page);
      api.events.emit("ping", page);

      console.log("Current setting value:", api.settings.someSetting);
    });

    return () => {
      console.log("Test plugin stopped");
      unregister();
    };
  },
};

export default testPlugin;
