import type { Plugin } from '../../core/types';
import styles from './styles.css?inline';
import { BasePlugin, NumberSetting } from '../../core/settings';

class AnimatedBackgroundPluginClass extends BasePlugin {
  @NumberSetting({
    default: 1,
    title: "Animation Speed",
    description: "Controls the speed of the animated background",
    min: 0.1,
    max: 2
  })
  speed!: number;
}

const settingsInstance = new AnimatedBackgroundPluginClass();

const animatedBackgroundPlugin: Plugin<typeof settingsInstance.settings> = {
  id: 'animated-background',
  name: 'Animated Background',
  description: 'Adds an animated background to BetterSEQTA+',
  version: '1.0.0',
  disableToggle: true,
  styles,
  settings: settingsInstance.settings,

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
      { classes: ["bg", "bg3"] }
    ];

    backgrounds.forEach(({ classes }) => {
      const bk = document.createElement("div");
      classes.forEach(cls => bk.classList.add(cls));
      container.insertBefore(bk, menu);
    });

    // Set initial speed
    updateAnimationSpeed(api.settings.speed);

    // Listen for speed changes
    const speedUnregister = api.settings.onChange('speed', updateAnimationSpeed);

    // Return cleanup function
    return () => {
      speedUnregister.unregister();
      // Remove background elements
      const backgrounds = document.getElementsByClassName('bg');
      Array.from(backgrounds).forEach(element => element.remove());
    };
  }
};

function updateAnimationSpeed(speed: number) {
  const bgElements = document.getElementsByClassName('bg');
  Array.from(bgElements).forEach((element, index) => {
    const baseSpeed = index === 0 ? 3 : index === 1 ? 4 : 5;
    (element as HTMLElement).style.animationDuration = `${baseSpeed / speed}s`;
  });
}

export default animatedBackgroundPlugin; 