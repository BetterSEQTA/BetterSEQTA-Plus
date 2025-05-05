import browser from "webextension-polyfill";
import { GetThresholdOfColor } from "@/seqta/ui/colors/getThresholdColour";
import { lightenAndPaleColor } from "./lightenAndPaleColor";
import ColorLuminance from "./ColorLuminance";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";

import darkLogo from "@/resources/icons/betterseqta-light-full.png";
import lightLogo from "@/resources/icons/betterseqta-dark-full.png";

// Helper functions
const setCSSVar = (varName: any, value: any) =>
  document.documentElement.style.setProperty(varName, value);
const applyProperties = (props: any) =>
  Object.entries(props).forEach(([key, value]) => setCSSVar(key, value));

export function updateAllColors() {
  // Determine the color to use
  const selectedColor =
    settingsState.selectedColor !== ""
      ? settingsState.selectedColor
      : "#007bff";

  if (settingsState.transparencyEffects) {
    document.documentElement.classList.add("transparencyEffects");
  }

  // Common properties, always applied
  const commonProps = {
    "--better-sub": "#161616",
    "--better-alert-highlight": "#c61851",
    "--better-main": settingsState.selectedColor,
  };

  // Mode-based properties, applied if storedSetting is provided
  let modeProps = {};
  modeProps = settingsState.DarkMode
    ? {
        "--betterseqta-logo": `url(${browser.runtime.getURL(darkLogo)})`,
      }
    : {
        "--better-pale": lightenAndPaleColor(selectedColor),
        "--betterseqta-logo": `url(${browser.runtime.getURL(lightLogo)})`,
      };

  if (settingsState.DarkMode) {
    document.documentElement.style.removeProperty("--better-pale");
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  // Dynamic properties, always applied
  const rgbThreshold = GetThresholdOfColor(selectedColor);
  const isBright = rgbThreshold > 210;
  const dynamicProps = {
    "--text-color": isBright ? "black" : "white",
    "--better-light":
      selectedColor === "#ffffff"
        ? "#b7b7b7"
        : ColorLuminance(selectedColor, 0.95),
  };

  // Apply all the properties
  applyProperties({ ...commonProps, ...modeProps, ...dynamicProps });

  let alliframes = document.getElementsByTagName("iframe");

  for (let i = 0; i < alliframes.length; i++) {
    const element = alliframes[i];

    if (element.getAttribute("excludeDarkCheck") == "true") {
      continue;
    }

    if (settingsState.DarkMode) {
      element.contentDocument?.documentElement.classList.add("dark");
    } else {
      element.contentDocument?.documentElement.classList.remove("dark");
    }
  }
}
