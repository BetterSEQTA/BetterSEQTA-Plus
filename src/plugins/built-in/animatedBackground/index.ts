import { BasePlugin } from "../../core/settings";
import { type Plugin } from "@/plugins/core/types";
import {
  defineSettings,
  numberSetting,
  Setting,
} from "@/plugins/core/settingsHelpers";
import { isSEQTATeachSync } from "@/seqta/utils/platformDetection";
import styles from "./styles.css?inline";
import { waitForElm } from "@/seqta/utils/waitForElm";

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
    let container: HTMLElement;
    let insertBefore: HTMLElement | null = null;

    if (isSEQTATeachSync()) {
      container =
        document.getElementById("root") ||
        ((await waitForElm("#root", true)) as HTMLElement);
      const spine = document.querySelector("[class*='Spine__Spine']");
      insertBefore =
        (spine as HTMLElement) ||
        (container.firstElementChild as HTMLElement);
    } else {
      const [learnContainer, menu] = await Promise.all([
        waitForElm("#container", true),
        waitForElm("#menu", true),
      ]);
      container = learnContainer as HTMLElement;
      insertBefore = menu as HTMLElement;
    }

    const existingBgs = document.getElementsByClassName("bg");
    if (existingBgs.length > 0) {
      updateAnimationSpeed(api.settings.speed);

      const speedUnregister = api.settings.onChange(
        "speed",
        updateAnimationSpeed,
      );

      return () => {
        speedUnregister.unregister();
      };
    }

    const backgrounds = [
      { classes: ["bg"] },
      { classes: ["bg", "bg2"] },
      { classes: ["bg", "bg3"] },
    ];

    backgrounds.forEach(({ classes }) => {
      const bk = document.createElement("div");
      classes.forEach((cls) => bk.classList.add(cls));

      if (insertBefore && insertBefore.parentElement === container) {
        container.insertBefore(bk, insertBefore);
      } else {
        container.insertBefore(bk, container.firstChild);
      }
    });

    updateAnimationSpeed(api.settings.speed);

    const speedUnregister = api.settings.onChange(
      "speed",
      updateAnimationSpeed,
    );

    return () => {
      speedUnregister.unregister();
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
