import type { Plugin } from "vite";

/** Relative chunk/CSS URLs via chrome.runtime.getURL for content-script dynamic imports. */
export function extensionChunkUrls(): Plugin {
  return {
    name: "extension-chunk-urls",
    config() {
      return {
        base: "./",
        experimental: {
          renderBuiltUrl(filename, { hostType, type }) {
            const path = filename.replace(/^\//, "");
            if (type === "chunk" && hostType === "js") {
              return { runtime: `chrome.runtime.getURL(${JSON.stringify(path)})` };
            }
            // JS-triggered CSS preloads only — extension HTML pages need static hrefs.
            if (type === "asset" && hostType === "js" && path.endsWith(".css")) {
              return { runtime: `chrome.runtime.getURL(${JSON.stringify(path)})` };
            }
          },
        },
      };
    },
  };
}
