import { BasePlugin } from "../../core/settings";
import { type Plugin } from "@/plugins/core/types";
import {
  defineSettings,
  numberSetting,
  Setting,
} from "@/plugins/core/settingsHelpers";
import styles from "./styles.css?inline";
import {
  removeAnimatedBackgroundLayers,
  syncAnimatedBackground,
  updateAnimationSpeed,
} from "./backgroundLayers";

const settings = defineSettings({
  speed: numberSetting({
    default: 1,
    title: "Animation Speed",
    description: "Controls how fast the background moves",
    min: 0.1,
    max: 2,
    step: 0.05,
  }),
});

class AnimatedBackgroundPluginClass extends BasePlugin<typeof settings> {
  @Setting(settings.speed)
  speed!: number;
}

const instance = new AnimatedBackgroundPluginClass();
const resync = (api: PluginAPI<typeof settings>) => () => void syncAnimatedBackground(api);

const animatedBackgroundPlugin: Plugin<typeof settings> = {
  id: "animated-background",
  name: "Animated Background",
  description: "Adds an animated background to BetterSEQTA+",
  version: "1.0.0",
  disableToggle: true,
  styles: styles,
  settings: instance.settings,

  run: async (api) => {
    await syncAnimatedBackground(api);

    const speedUnregister = api.settings.onChange("speed", updateAnimationSpeed);
    const pageChangeUnregister = api.seqta.onPageChange(resync(api));
    const pageshowHandler = (event: PageTransitionEvent) => {
      if (event.persisted) void syncAnimatedBackground(api);
    };
    window.addEventListener("pageshow", pageshowHandler);

    const containerObserver = new MutationObserver(resync(api));
    const container = document.getElementById("container");
    if (container) containerObserver.observe(container, { childList: true });

    return () => {
      speedUnregister.unregister();
      pageChangeUnregister.unregister();
      window.removeEventListener("pageshow", pageshowHandler);
      containerObserver.disconnect();
      removeAnimatedBackgroundLayers();
    };
  },
};

export default animatedBackgroundPlugin;
