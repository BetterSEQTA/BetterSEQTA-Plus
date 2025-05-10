import { createManifest } from "../../lib/createManifest"; // Imports the createManifest function from a local module.
import baseManifest from "./manifest.json"; // Imports the base manifest configuration from a JSON file.
import pkg from "../../package.json"; // Imports package information, including version and description.

const updatedSafariManifest = {
  ...baseManifest, // Spreads the base manifest properties into the new object.
  version: pkg.version, // Sets the version from the package.json.
  description: pkg.description, // Sets the description from the package.json.
  browser_specific_settings: { // Defines browser-specific settings for Safari.
    safari: {
      strict_min_version: "15.4", // Specifies the minimum Safari version required.
      strict_max_version: "*", // Allows any maximum version for Safari.
    },
    // ^^^ https://developer.apple.com/documentation/safariservices/safari_web_extensions/optimizing_your_web_extension_for_safari#3743239
    //     https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings#safari_properties
  },
};

// Creates a new manifest for Safari using the updated configuration.
export const safari = createManifest(updatedSafariManifest, "safari");
