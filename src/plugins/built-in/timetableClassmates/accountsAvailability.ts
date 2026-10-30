import { readable } from "svelte/store";
import { ACCOUNTS_BASE } from "./constants";

export const accountsAvailability = readable(
  { available: false, message: "Checking BetterSEQTA Cloud…" },
  (set) => {
    let checking = false;
    let stopped = false;
    async function check() {
      if (checking) return;
      checking = true;
      let available = false;
      try {
        const response = await fetch(`${ACCOUNTS_BASE}/api/health`, {
          cache: "no-store",
          credentials: "omit",
          signal: AbortSignal.timeout(5_000),
        });
        const health = await response.json();
        available = response.ok && health?.ok === true && health?.service === "accounts";
      } catch {
        /* Network errors and timeouts leave the service unavailable. */
      }
      checking = false;
      if (stopped) return;
      set({
        available,
        message: available ? "" : "BetterSEQTA Cloud is unavailable. Retrying automatically.",
      });
    }

    void check();
    const timer = window.setInterval(check, 60_000);
    window.addEventListener("online", check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("online", check);
    };
  },
);
