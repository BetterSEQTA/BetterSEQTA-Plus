import type { Plugin } from "vite";

/**
 * Previously touched CSS mtimes on JS HMR to force style refresh.
 * That raced with CRXJS runtime reload and corrupted Vite's module graph
 * (missing named/`default` exports until `npm run dev` was restarted).
 *
 * Style updates are now covered by `stabilizeCrxDevHmr` full reloads.
 */
export default function touchGlobalCSSPlugin(): Plugin {
  return {
    name: "touch-global-css",
    apply: "serve",
  };
}
