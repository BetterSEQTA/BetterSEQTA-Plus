/* global chrome */
import { lightenAndPaleColor, GetThresholdofHex, ColorLuminance, CreateCustomShortcutDiv, RemoveCustomShortcutDiv } from "../../SEQTA.js";

export default function StorageListener() {
  chrome.storage.onChanged.addListener(function (changes) {
    if (changes.selectedColor) {
      try {
        chrome.storage.local.get(["DarkMode"], function (result) {
          if (!result.DarkMode) {
            console.log(changes.selectedColor.newValue);
            document.documentElement.style.setProperty(
              "--better-pale",
              lightenAndPaleColor(changes.selectedColor.newValue)
            );
          }
        });
      } catch (err) {
        console.log(err);
      }
  
      let rbg = GetThresholdofHex(changes.selectedColor.newValue);
  
      if (rbg > 210) {
        document.documentElement.style.setProperty("--text-color", "black");
        document.documentElement.style.setProperty(
          "--betterseqta-logo",
          `url(${chrome.runtime.getURL("icons/betterseqta-dark-full.png")})`
        );
      } else {
        document.documentElement.style.setProperty("--text-color", "white");
        document.documentElement.style.setProperty(
          "--betterseqta-logo",
          `url(${chrome.runtime.getURL("icons/betterseqta-light-full.png")})`
        );
      }
  
      document.documentElement.style.setProperty(
        "--better-main",
        changes.selectedColor.newValue
      );
  
      if (changes.selectedColor.newValue == "#ffffff") {
        document.documentElement.style.setProperty("--better-light", "#b7b7b7");
      } else {
        document.documentElement.style.setProperty(
          "--better-light",
          ColorLuminance(changes.selectedColor.newValue, 0.99)
        );
      }
    }
  
    if (changes?.customshortcuts?.newValue) {
      console.log(changes);
  
      const oldValue = changes.customshortcuts.oldValue;
      const newValue = changes.customshortcuts.newValue;
  
      // Check for addition
      if (newValue.length > oldValue.length) {
        CreateCustomShortcutDiv(newValue[oldValue.length]);
      }
  
      // Check for removal
      else if (newValue.length < oldValue.length) {
        // Find the removed element
        const removedElement = oldValue.find(
          (oldItem) => !newValue.some((newItem) => JSON.stringify(oldItem) === JSON.stringify(newItem))
        );
  
        if (removedElement) {
          RemoveCustomShortcutDiv(removedElement);
        }
      }
    }
  });
}
