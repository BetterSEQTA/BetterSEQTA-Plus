import type { Plugin, ViteDevServer } from "vite";

/**
 * CRXJS + Vite 6 often corrupt content-script ESM bindings after HMR /
 * `[crx] runtime reload` — modules load but named/`default` exports are missing
 * until the dev server is restarted.
 *
 * Prefer invalidating the module graph + a full page reload over partial HMR.
 */
export default function stabilizeCrxDevHmr(): Plugin {
  let reloadTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleFullReload = (s: ViteDevServer) => {
    if (reloadTimer) clearTimeout(reloadTimer);
    // Debounce cascading invalidations (e.g. many files in one save).
    reloadTimer = setTimeout(() => {
      reloadTimer = null;
      s.ws.send({ type: "full-reload", path: "*" });
    }, 50);
  };

  return {
    name: "stabilize-crx-dev-hmr",
    apply: "serve",
    enforce: "pre",
    configureServer(s) {
      s.ws.on("bsplus:reset-module-graph", () => {
        s.moduleGraph.invalidateAll();
        scheduleFullReload(s);
      });
    },
    handleHotUpdate({ file, modules, server: viteServer }) {
      if (!file.replace(/\\/g, "/").includes("/src/")) return;
      if (file.includes("node_modules")) return;

      const seen = new Set(modules);
      const queue = [...modules];
      while (queue.length) {
        const mod = queue.pop()!;
        viteServer.moduleGraph.invalidateModule(mod);
        for (const importer of mod.importers) {
          if (seen.has(importer)) continue;
          seen.add(importer);
          queue.push(importer);
        }
      }

      scheduleFullReload(viteServer);
      // Skip Vite's partial HMR for these modules — it is what leaves exports empty.
      return [];
    },
  };
}
