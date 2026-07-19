import type { Plugin } from "vite";

/**
 * crxjs 2.6.x only replaces the first `__LIVE_RELOAD__` in `@crx/client-worker`,
 * which crashes the service worker when the dev server reconnects.
 */
export default function fixCrxWorkerLiveReload(): Plugin {
  return {
    name: "fix-crx-worker-live-reload",
    apply: "serve",
    enforce: "post",
    transform(code, id) {
      if (!id.includes("@crx/client-worker") || !code.includes("__LIVE_RELOAD__")) {
        return;
      }
      return code.replaceAll("__LIVE_RELOAD__", "true");
    },
  };
}
