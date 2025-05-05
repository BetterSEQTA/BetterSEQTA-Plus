import { BasePlugin } from "../../core/settings";
import { type Plugin } from "@/plugins/core/types";
import {
  defineSettings,
  numberSetting,
  Setting,
} from "@/plugins/core/settingsHelpers";
import styles from "./styles.css?inline";

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
    // Create the background elements
    const container = document.getElementById("container");
    const menu = document.getElementById("menu");

    if (!container || !menu) {
      return () => {};
    }

    const backgrounds = [
      { classes: ["bg"] },
      { classes: ["bg", "bg2"] },
      { classes: ["bg", "bg3"] },
    ];

    backgrounds.forEach(({ classes }) => {
      const bk = document.createElement("div");
      classes.forEach((cls) => bk.classList.add(cls));
      container.insertBefore(bk, menu);
    });

    // Set initial speed
    updateAnimationSpeed(api.settings.speed);

    // Listen for speed changes
    const speedUnregister = api.settings.onChange(
      "speed",
      updateAnimationSpeed,
    );

    // Return cleanup function
    return () => {
      speedUnregister.unregister();
      // Remove background elements
      const backgrounds = document.getElementsByClassName("bg");
      Array.from(backgrounds).forEach((element) => element.remove());
    };
  },
};

function updateAnimationSpeed(speed: number) {
  const bgElements = document.getElementsByClassName("bg");
  Array.from(bgElements).forEach((element, index) => {
    const baseSpeed = index === 0 ? 3 : index === 1 ? 4 : 5;
    (element as HTMLElement).style.animationDuration = `${baseSpeed / speed}s`;
  });
}

export default animatedBackgroundPlugin;
