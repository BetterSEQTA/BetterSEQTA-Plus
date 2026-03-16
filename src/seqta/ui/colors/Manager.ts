import browser from "webextension-polyfill";
import Color from "color";
import { GetThresholdOfColor } from "@/seqta/ui/colors/getThresholdColour";
import { lightenAndPaleColor } from "./lightenAndPaleColor";
import ColorLuminance from "./ColorLuminance";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { getAdaptiveColour } from "@/seqta/utils/adaptiveThemeColour";

import darkLogo from "@/resources/icons/betterseqta-light-full.png";
import lightLogo from "@/resources/icons/betterseqta-dark-full.png";

// Helper functions
const setCSSVar = (varName: any, value: any) =>
  document.documentElement.style.setProperty(varName, value);
const applyProperties = (props: any) =>
  Object.entries(props).forEach(([key, value]) => setCSSVar(key, value));

function applyColorsWith(selectedColor: string) {
  if (settingsState.transparencyEffects) {
    document.documentElement.classList.add("transparencyEffects");
  }

  // Common properties, always applied
  const commonProps = {
    "--better-sub": "#161616",
    "--better-alert-highlight": "#c61851",
    "--better-main": selectedColor,
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

function toSoftGradient(hex: string): string {
  const base = Color(hex);
  const analogous = base.rotate(30).lighten(0.25).saturate(0.15);
  const mid = base.mix(analogous, 0.5).hex();
  return `linear-gradient(135deg, ${hex} 0%, ${mid} 50%, ${analogous.hex()} 100%)`;
}

export async function updateAllColors() {
  let effectiveColor =
    settingsState.selectedColor !== ""
      ? settingsState.selectedColor
      : "#007bff";

  if (settingsState.adaptiveThemeColour) {
    const adaptiveColor = await getAdaptiveColour();
    if (adaptiveColor) {
      effectiveColor =
        settingsState.adaptiveThemeGradient
          ? toSoftGradient(adaptiveColor)
          : adaptiveColor;
    }
  }

  applyColorsWith(effectiveColor);
}
