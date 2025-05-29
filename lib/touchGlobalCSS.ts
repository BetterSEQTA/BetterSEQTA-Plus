import fs from "fs";

/**
 * Creates a Vite plugin designed to improve the reliability of Hot Module Replacement (HMR)
 * for global CSS files.
 *
 * When a JavaScript/TypeScript module that imports a CSS file is updated, Vite's HMR
 * might not always reliably update the styles injected by that global CSS. This plugin
 * attempts to mitigate this by listening for hot updates. If an updated module
 * has direct importers that are CSS files (e.g., a JS file imports a global CSS file),
 * this plugin will "touch" those CSS files by updating their access and modification
 * timestamps using `fs.utimesSync`. This action can help signal to Vite or the browser
 * that the CSS file has changed, potentially triggering a more reliable style reload.
 *
 * @returns {import('vite').Plugin} A Vite plugin object configured with `name` and `handleHotUpdate` hooks.
 */
export default function touchGlobalCSSPlugin() {
  return {
    /**
     * The unique name of this Vite plugin.
     * This name is used by Vite for identification purposes and will appear in logs.
     * @type {string}
     */
    name: "touch-global-css",
    /**
     * A Vite hook that is called when a module is hot-updated.
     * This function inspects the importers of the updated module. If any of these
     * importers are CSS files, their filesystem timestamps are updated ("touched").
     *
     * @param {object} context The context object provided by Vite's `handleHotUpdate` hook.
     * @param {Array<import('vite').ModuleNode>} context.modules An array of `ModuleNode` instances that have been updated.
     *                                                            This plugin specifically accesses `modules[0]._clientModule.importers`
     *                                                            to find CSS files that import the updated module.
     */
    handleHotUpdate({ modules }) {
      // It's assumed `modules[0]` is the primary updated module of interest.
      // `_clientModule` and `importers` might be internal or less stable Vite APIs.
      const importers = modules[0]?._clientModule?.importers;
      if (importers) {
        importers.forEach((importer) => {
          // Check if the importer is a CSS file
          if (importer.file && importer.file.includes(".css")) {
            console.log("[touch-global-css] touching", importer.file);
            try {
              // Update the access and modification times of the CSS file to the current time
              fs.utimesSync(importer.file, new Date(), new Date());
            } catch (err) {
              console.error(`[touch-global-css] Error touching file ${importer.file}:`, err);
            }
          }
        });
      }
    },
  };
}
