/** Vite/CRX HMR can leave modules with missing named exports until the graph is cleared. */
export function recoverFromStaleDevModuleGraph(error: unknown) {
  if (!import.meta.env.DEV) return;

  const message = error instanceof Error ? error.message : String(error);
  if (!/does not provide an export named/.test(message)) return;

  const key = "bsplus-dev-export-recovery";
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, "1");
    import.meta.hot?.send("bsplus:reset-module-graph");
    setTimeout(() => {
      location.reload();
    }, 80);
    return;
  }

  sessionStorage.removeItem(key);
  console.error(
    "[BetterSEQTA+] Dev module graph is still stale after recovery. Restart `npm run dev`, then reload this page.",
  );
}
