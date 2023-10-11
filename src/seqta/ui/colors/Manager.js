/* global chrome */
import { GetThresholdofHex } from "../../../SEQTA.js";
import { lightenAndPaleColor } from "./lightenAndPaleColor.js";
import ColorLuminance from "./ColorLuminance.js";

// Helper functions
const setCSSVar = (varName, value) => document.documentElement.style.setProperty(varName, value);
const getChromeURL = (path) => chrome.runtime.getURL(path);
const applyProperties = (props) => Object.entries(props).forEach(([key, value]) => setCSSVar(key, value));

export function updateAllColors(storedSetting, newColor = null) {
  // Determine the color to use
  const selectedColor = newColor || storedSetting.selectedColor;
  const DarkMode = storedSetting ? storedSetting.DarkMode : null;

  // Common properties, always applied
  const commonProps = {
    "--better-sub": "#161616",
    "--better-alert-highlight": "#c61851",
    "--better-main": selectedColor
  };

  // Mode-based properties, applied if storedSetting is provided
  let modeProps = {};
  console.log(DarkMode);
  if (DarkMode !== null) {
    modeProps = DarkMode ? {
      "--background-primary": "#232323",
      "--background-secondary": "#1a1a1a",
      "--text-primary": "white"
    } : {
      "--background-primary": "#ffffff",
      "--background-secondary": "#e5e7eb",
      "--text-primary": "black",
      "--better-pale": lightenAndPaleColor(selectedColor)
    };
  }

  console.log("modeProps:", modeProps);

  // Dynamic properties, always applied
  const rgbThreshold = GetThresholdofHex(selectedColor);
  const isBright = rgbThreshold > 210;
  const dynamicProps = {
    "--text-color": isBright ? "black" : "white",
    "--betterseqta-logo": `url(${getChromeURL(`icons/betterseqta-${isBright ? "dark" : "light"}-full.png`)})`,
    "--better-light": selectedColor === "#ffffff" ? "#b7b7b7" : ColorLuminance(selectedColor, 0.95)
  };

  // Apply all the properties
  applyProperties({ ...commonProps, ...modeProps, ...dynamicProps });

  // Set favicon, if storedSetting is provided
  if (DarkMode !== null) {
    document.querySelector("link[rel*='icon']").href = getChromeURL("icons/icon-48.png");
  }
}

export function getDarkMode() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get("DarkMode", (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(result.DarkMode);
    });
  });
}