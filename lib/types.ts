import type { ManifestV3Export } from "@crxjs/vite-plugin";

export type Manifest = ManifestV3Export;

export type Browser = "chrome" | "brave" | "edge" | "firefox" | "opera" | "safari";

export type BuildTarget = {
  manifest: Manifest;
  browser: Browser;
};
