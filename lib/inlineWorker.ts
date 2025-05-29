// vite-plugin-inline-worker-dev.ts
// vite-plugin-inline-worker-dev.ts
import { Plugin } from "vite";
import fs from "fs/promises";
import { build } from "esbuild";

/**
 * Creates a Vite plugin designed for bundling and inlining web worker scripts during development.
 * This plugin specifically targets module imports that include a `?inlineWorker` query parameter.
 * When such an import is encountered, the plugin bundles the worker script using `esbuild`
 * and then generates JavaScript code that inlines this bundled worker as a Blob,
 * creating the worker instance via `URL.createObjectURL()`.
 * The name "vite:inline-worker-dev" suggests it's primarily intended for development builds.
 *
 * @returns {Plugin} A Vite plugin object with `name` and `load` properties.
 */
export default function InlineWorkerDevPlugin(): Plugin {
  return {
    /**
     * The unique name of this Vite plugin.
     * @type {string}
     */
    name: "vite:inline-worker-dev",
    /**
     * The Vite hook responsible for loading and transforming modules.
     * This function intercepts modules imported with `?inlineWorker`.
     * For such modules, it bundles the worker script and returns JavaScript code
     * that, when executed, will create an instance of this worker from an inlined Blob.
     *
     * @async
     * @param {string} id The path or ID of the module Vite is attempting to load,
     *                    potentially including query parameters (e.g., "/path/to/worker.ts?inlineWorker").
     * @returns {Promise<string | null>} A promise that resolves to:
     *                                   - `null` if the module ID does not include `?inlineWorker`.
     *                                   - A string of JavaScript code if the module is an inline worker.
     *                                     This code will define a default export function (e.g., `InlineWorker`)
     *                                     that, when called, creates and returns a new `Worker` instance
     *                                     from the bundled and inlined worker script.
     */
    async load(id) {
      if (id.includes("?inlineWorker")) {
        const [cleanPath] = id.split("?");
        // Note: Original code had `await fs.readFile(cleanPath, "utf-8");` but `code` wasn't used.
        // `esbuild` directly takes `cleanPath` as an entry point.
        const result = await build({
          entryPoints: [cleanPath], // esbuild uses the file path directly
          bundle: true,
          write: false, // We want the output in memory, not written to disk
          platform: "browser", // Target environment for the worker code
          format: "iife", // Immediately Invoked Function Expression, suitable for workers
          target: "esnext", // Transpile to modern JavaScript
        });

        const workerCode = result.outputFiles[0].text;

        // Construct JavaScript code that will create the worker from a Blob.
        // This code is what gets returned to Vite and replaces the original import.
        const workerBlobCode = `
          const code = ${JSON.stringify(workerCode)};
          export default function InlineWorker() {
            const blob = new Blob([code], { type: 'application/javascript' });
            return new Worker(URL.createObjectURL(blob), { type: 'module' });
          }
        `;
        return workerBlobCode;
      }
      return null; // Let Vite handle other modules normally
    },
  };
}
