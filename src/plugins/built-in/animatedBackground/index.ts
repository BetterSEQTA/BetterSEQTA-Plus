import { BasePlugin } from "../../core/settings";
import { type Plugin } from "@/plugins/core/types";
import {
  defineSettings,
  numberSetting,
  Setting,
} from "@/plugins/core/settingsHelpers";
import { isSeqtaTeachExperience } from "@/seqta/utils/isSeqtaTeach";
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
    const resync = () => void syncAnimatedBackground(api);

    const speedUnregister = api.settings.onChange("speed", updateAnimationSpeed);
    const pageChangeUnregister = api.seqta.onPageChange(resync);
    window.addEventListener("pageshow", resync);

    const containerObserver = new MutationObserver(resync);
    const observeTarget = isSeqtaTeachExperience()
      ? document.getElementById("root")
      : document.getElementById("container");
    if (observeTarget) {
      containerObserver.observe(observeTarget, { childList: true });
    }

    return () => {
      speedUnregister.unregister();
      pageChangeUnregister.unregister();
      window.removeEventListener("pageshow", resync);
      containerObserver.disconnect();
      removeAnimatedBackgroundLayers();
    };
  },
};

export default animatedBackgroundPlugin;
