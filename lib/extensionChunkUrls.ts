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
            if (type === "chunk" && hostType === "js") {
              const path = filename.replace(/^\//, "");
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
