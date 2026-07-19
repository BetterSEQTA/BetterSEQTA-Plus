// ref: https://stackoverflow.com/a/76920975
import type { Plugin } from "vite";

/** Exit with code 1 on build failure; do not exit on success (multi-target builds). */
export default function ClosePlugin(): Plugin {
  return {
    name: "ClosePlugin",
    buildEnd(error) {
      if (error) {
        console.error("Error bundling", error);
        process.exit(1);
      } else {
        console.log("Build ended");
      }
    },
    closeBundle() {
      console.log("Bundle closed");
    },
  };
}
