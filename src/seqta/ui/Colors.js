/* global chrome */
import { ColorLuminance, GetThresholdofHex } from "../../SEQTA.js";

export function updateDocumentColors(newColor) {
  const rbg = GetThresholdofHex(newColor);
  const textColor = rbg > 210 ? "black" : "white";
  const logo = `url(${chrome.runtime.getURL(
    `icons/betterseqta-${textColor === "black" ? "dark" : "light"}-full.png`
  )})`;

  document.documentElement.style.setProperty("--text-color", textColor);
  document.documentElement.style.setProperty("--betterseqta-logo", logo);
  document.documentElement.style.setProperty("--better-main", newColor);

  const lightColor =
    newColor === "#ffffff" ? "#b7b7b7" : ColorLuminance(newColor, 0.99);

  document.documentElement.style.setProperty("--better-light", lightColor);
}