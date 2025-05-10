import { BasePlugin } from "../../core/settings"; // Imports the base plugin class from the core settings module.
import { type Plugin } from "@/plugins/core/types"; // Imports the Plugin type for type checking.
import {
  defineSettings,
  numberSetting,
  Setting,
} from "@/plugins/core/settingsHelpers"; // Imports helpers for defining plugin settings.
import styles from "./styles.css?inline"; // Imports CSS styles as an inline string.

const settings = defineSettings({
  speed: numberSetting({
    default: 1, // Default speed value.
    title: "Animation Speed", // Title for the speed setting.
    description: "Controls how fast the background moves", // Description shown in UI.
    min: 0.1, // Minimum allowed value.
    max: 2, // Maximum allowed value.
    step: 0.05, // Step interval for value adjustment.
  }),
});

class AnimatedBackgroundPluginClass extends BasePlugin<typeof settings> {
  @Setting(settings.speed) // Decorator to bind the 'speed' setting.
  speed!: number; // Declares the speed property, which will be assigned the setting value.
}

const instance = new AnimatedBackgroundPluginClass(); // Creates an instance of the plugin settings class.

const animatedBackgroundPlugin: Plugin<typeof settings> = {
  id: "animated-background", // Unique ID for the plugin.
  name: "Animated Background", // Display name of the plugin.
  description: "Adds an animated background to BetterSEQTA+", // Description of what the plugin does.
  version: "1.0.0", // Version number of the plugin.
  disableToggle: true, // Disables toggling the plugin on/off in the UI.
  styles: styles, // Applies the imported CSS styles.
  settings: instance.settings, // Exposes plugin settings.

  run: async (api) => {
    // Create the background elements
    const container = document.getElementById("container"); // Gets the container element.
    const menu = document.getElementById("menu"); // Gets the menu element.

    if (!container || !menu) {
      return () => {}; // If either element is missing, return an empty cleanup function.
    }

    const backgrounds = [
      { classes: ["bg"] }, // First background element.
      { classes: ["bg", "bg2"] }, // Second background element with extra class.
      { classes: ["bg", "bg3"] }, // Third background element with another class.
    ];

    backgrounds.forEach(({ classes }) => {
      const bk = document.createElement("div"); // Creates a new div element.
      classes.forEach((cls) => bk.classList.add(cls)); // Adds each class to the div.
      container.insertBefore(bk, menu); // Inserts the div before the menu element in the container.
    });

    // Set initial speed
    updateAnimationSpeed(api.settings.speed); // Sets animation speed based on current setting.

    // Listen for speed changes
    const speedUnregister = api.settings.onChange(
      "speed",
      updateAnimationSpeed,
    ); // Registers a listener for changes to the speed setting.

    // Return cleanup function
    return () => {
      speedUnregister.unregister(); // Unregisters the speed change listener.
      // Remove background elements
      const backgrounds = document.getElementsByClassName("bg"); // Gets all background elements.
      Array.from(backgrounds).forEach((element) => element.remove()); // Removes each background element from the DOM.
    };
  },
};

function updateAnimationSpeed(speed: number) {
  const bgElements = document.getElementsByClassName("bg"); // Gets all background elements.
  Array.from(bgElements).forEach((element, index) => {
    const baseSpeed = index === 0 ? 3 : index === 1 ? 4 : 5; // Determines base speed based on index.
    (element as HTMLElement).style.animationDuration = `${baseSpeed / speed}s`; // Sets animation duration based on speed.
  });
}

export default animatedBackgroundPlugin; // Exports the plugin as the default export.
