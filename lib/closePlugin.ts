// ref: https://stackoverflow.com/a/76920975
import type { Plugin } from "vite";

/**
 * Creates a Vite plugin designed to gracefully handle the conclusion of the build process.
 * This plugin utilizes the `buildEnd` and `closeBundle` hooks provided by Vite.
 * It checks for errors at the end of the build:
 * - If an error occurred during the build (`buildEnd` hook receives an error), it logs the error
 *   and explicitly exits the Node.js process with a status code of 1 (indicating failure).
 * - If the build completes without errors and the bundle is successfully generated
 *   (`closeBundle` hook is called), it logs a success message and exits the process
 *   with a status code of 0 (indicating success).
 * This explicit process exiting can be useful in CI/CD environments or scripts that
 * rely on the process status code to determine the build outcome.
 * The core logic for using these hooks to exit the process is inspired by
 * a solution found on StackOverflow (https://stackoverflow.com/a/76920975).
 *
 * @returns {Plugin} A Vite plugin object configured with `name`, `buildEnd`, and `closeBundle` hooks.
 */
export default function ClosePlugin(): Plugin {
  return {
    /**
     * The unique name of this Vite plugin. This name is used by Vite for identification
     * purposes and will appear in warnings, errors, and logs related to this plugin.
     * @type {string}
     */
    name: "ClosePlugin", // required, will show up in warnings and errors

    /**
     * A Vite hook that is called when the build process has finished, regardless of
     * whether it was successful or encountered an error.
     *
     * @param {Error} [error] An optional error object. If the build failed, this parameter
     *                        will contain the error that occurred. If the build was successful,
     *                        this parameter will be undefined or null.
     */
    buildEnd(error) {
      if (error) {
        console.error("Error bundling");
        console.error(error);
        process.exit(1); // Exit with status 1 indicating an error
      } else {
        console.log("Build ended"); // Log successful completion of the build phase
      }
    },

    /**
     * A Vite hook that is called after the `buildEnd` hook, but only if the build
     * was successful (i.e., no errors were passed to `buildEnd`) and all output
     * files have been generated and written to disk. This signifies the successful
     * completion of the entire bundling process.
     */
    closeBundle() {
      console.log("Bundle closed"); // Log successful closure of the bundle
      process.exit(0); // Exit with status 0 indicating a successful build
    },
  };
}
