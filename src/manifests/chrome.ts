import { createManifest } from "../../lib/createManifest.ts";
import baseManifest from "./manifest.json" with { type: "json" };
import pkg from "../../package.json" with { type: "json" };

export const chrome = createManifest(
  {
    ...baseManifest,
    version: pkg.version,
    description: pkg.description,
  },
  "chrome",
);
