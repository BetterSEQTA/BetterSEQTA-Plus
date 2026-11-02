import { createManifest } from "../../lib/createManifest.ts";
import baseManifest from "./manifest.json" with { type: "json" };
import pkg from "../../package.json" with { type: "json" };

const updatedFirefoxManifest = {
  ...baseManifest,
  version: pkg.version,
  description: pkg.description,
  background: {
    scripts: [baseManifest.background.service_worker],
  },
  action: {
    default_popup: "interface/index.html#settings",
  },
  browser_specific_settings: {
    gecko: {
      id: "betterseqta@betterseqta.com",
    },
  },
};

export const firefox = createManifest(updatedFirefoxManifest, "firefox");
