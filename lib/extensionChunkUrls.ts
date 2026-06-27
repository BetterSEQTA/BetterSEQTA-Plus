import type { Plugin } from "vite";

/**
 * Vite's default base (`/`) emits absolute chunk paths like `/assets/chunk.js`.
 * In content scripts those resolve against the SEQTA page origin on Firefox,
 * not the extension — causing MIME type / NS_ERROR_CORRUPTED_CONTENT failures.
 *
 * Use relative base plus `chrome.runtime.getURL` for dynamic import targets.
 */
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
              return {
                runtime: `chrome.runtime.getURL(${JSON.stringify(path)})`,
              };
            }
            // Rewrite CSS preloads from JS dynamic imports (content scripts).
            // Do not rewrite hostType "css" — extension HTML pages need static hrefs.
            if (type === "asset" && hostType === "js" && path.endsWith(".css")) {
              return {
                runtime: `chrome.runtime.getURL(${JSON.stringify(path)})`,
              };
            }
          },
        },
      };
    },
  };
}
