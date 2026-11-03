import { createManifest } from "../../lib/createManifest.ts";
import type { Manifest } from "../../lib/types.ts";
import baseManifest from "./manifest.json" with { type: "json" };
import pkg from "../../package.json" with { type: "json" };

type BrowserSpecificSettings = Extract<
  Manifest,
  { manifest_version: number }
>["browser_specific_settings"];

const safariSettings = {
  safari: {
    strict_min_version: "17.4",
    strict_max_version: "*",
  },
};

export const safari = createManifest(
  {
    ...baseManifest,
    version: pkg.version,
    description: pkg.description,
    browser_specific_settings: safariSettings as unknown as BrowserSpecificSettings,
  },
  "safari",
);
