// vite-plugin-inline-worker-dev.ts
import { Plugin } from "vite";
import fs from "fs/promises";
import { build, transform } from "esbuild";

export default function InlineWorkerDevPlugin(): Plugin {
  return {
    name: "vite:inline-worker-dev",
    async load(id) {
      if (id.includes("?inlineWorker")) {
        const [cleanPath] = id.split("?");
        console.log("cleanPath", cleanPath);
        const code = await fs.readFile(cleanPath, "utf-8");
        const result = await build({
          entryPoints: [cleanPath],
          bundle: true,
          write: false,
          platform: "browser",
          format: "iife",
          target: "esnext",
        });

        const workerCode = result.outputFiles[0].text;

        const workerBlobCode = `
          const code = ${JSON.stringify(workerCode)};
          export default function InlineWorker() {
            const blob = new Blob([code], { type: 'application/javascript' });
            return new Worker(URL.createObjectURL(blob), { type: 'module' });
          }
        `;
        return workerBlobCode;
      }
      return null;
    },
  };
}
