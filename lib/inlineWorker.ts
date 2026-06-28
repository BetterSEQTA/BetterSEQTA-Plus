import { Plugin } from "vite";
import { build } from "esbuild";

/** Bundle worker entry points imported with `?inlineWorker` as Blob-backed Workers in dev. */
export default function InlineWorkerDevPlugin(): Plugin {
  return {
    name: "vite:inline-worker-dev",
    async load(id) {
      if (!id.includes("?inlineWorker")) return null;

      const [cleanPath] = id.split("?");
      const result = await build({
        entryPoints: [cleanPath],
        bundle: true,
        write: false,
        platform: "browser",
        format: "iife",
        target: "esnext",
        external: ["webextension-polyfill"],
      });

      const workerCode = result.outputFiles[0].text;
      return `
        const code = ${JSON.stringify(workerCode)};
        export default function InlineWorker() {
          const blob = new Blob([code], { type: 'application/javascript' });
          return new Worker(URL.createObjectURL(blob), { type: 'module' });
        }
      `;
    },
  };
}
