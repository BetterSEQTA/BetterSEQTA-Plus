/* global chrome */
import { GetThresholdOfColor, GetiFrameCSSElement } from "../../../SEQTA.js";
import { lightenAndPaleColor } from "./lightenAndPaleColor.js";
import ColorLuminance from "./ColorLuminance.js";

// Helper functions
const setCSSVar = (varName, value) => document.documentElement.style.setProperty(varName, value);
const getChromeURL = (path) => chrome.runtime.getURL(path);
const applyProperties = (props) => Object.entries(props).forEach(([key, value]) => setCSSVar(key, value));

let DarkMode = null;

export function updateAllColors(storedSetting, newColor = null) {
  // Determine the color to use
  const selectedColor = newColor || storedSetting.selectedColor;

  DarkMode = (typeof storedSetting?.DarkMode === "boolean") ? storedSetting.DarkMode : DarkMode;

  if (typeof storedSetting === "boolean") {
    DarkMode = storedSetting;
  }

  // Common properties, always applied
  const commonProps = {
    "--better-sub": "#161616",
    "--better-alert-highlight": "#c61851",
    "--better-main": selectedColor
  };

  // Mode-based properties, applied if storedSetting is provided
  let modeProps = {};
  if (DarkMode !== null) {
    modeProps = DarkMode ? {
      "--background-primary": "#232323",
      "--background-secondary": "#1a1a1a",
      "--text-primary": "white",
      "--betterseqta-logo": `url(${getChromeURL("icons/betterseqta-light-full.png")})`
    } : {
      "--background-primary": "#ffffff",
      "--background-secondary": "#e5e7eb",
      "--text-primary": "black",
      "--better-pale": lightenAndPaleColor(selectedColor),
      "--betterseqta-logo": `url(${getChromeURL("icons/betterseqta-dark-full.png")})`
    };

    if (DarkMode) {
      document.documentElement.style.removeProperty("--better-pale");
    }
  }

  // Dynamic properties, always applied
  const rgbThreshold = GetThresholdOfColor(selectedColor);
  const isBright = rgbThreshold > 210;
  const dynamicProps = {
    "--text-color": isBright ? "black" : "white",
    "--better-light": selectedColor === "#ffffff" ? "#b7b7b7" : ColorLuminance(selectedColor, 0.95)
  };

  // Apply all the properties
  applyProperties({ ...commonProps, ...modeProps, ...dynamicProps });

  // Set favicon, if storedSetting is provided
  if (DarkMode !== null) {
    document.querySelector("link[rel*='icon']").href = getChromeURL("icons/icon-48.png");
  }

  let alliframes = document.getElementsByTagName("iframe");
  let fileref = GetiFrameCSSElement();

  for (let i = 0; i < alliframes.length; i++) {
    const element = alliframes[i];

    if (element.getAttribute("excludeDarkCheck") == "true") {
      continue;
    }
    
    console.log(element);
    console.log(element.contentDocument.documentElement);

    element.contentDocument.documentElement.childNodes[1].style.color =
      DarkMode ? "black" : "white";
    element.contentDocument.documentElement.firstChild.appendChild(
      fileref,
    );
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