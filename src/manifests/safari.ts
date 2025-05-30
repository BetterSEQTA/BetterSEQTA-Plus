import { createManifest } from "../../lib/createManifest";
import baseManifest from "./manifest.json";
import pkg from "../../package.json";

const updatedSafariManifest = {
  ...baseManifest,
  version: pkg.version,
  description: pkg.description,
  browser_specific_settings: {
    safari: {
      strict_min_version: "15.4",
      strict_max_version: "*",
    },
    // ^^^ https://developer.apple.com/documentation/safariservices/safari_web_extensions/optimizing_your_web_extension_for_safari#3743239
    //     https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings#safari_properties
  },
};

export const safari = createManifest(updatedSafariManifest, "safari");
