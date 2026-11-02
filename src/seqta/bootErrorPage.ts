import browser from "@/lib/browser";
import { isSeqta404Page, mountErrorPageKitten } from "@/plugins/built-in/errorPageKitten";

/** Hide the rebranded 404 before the kitten card mounts (removed after boot). */
function inject404FlashHide(): void {
  if (document.getElementById("bsplus-404-flash-hide")) return;
  const style = document.createElement("style");
  style.id = "bsplus-404-flash-hide";
  style.textContent = "html,body{background:#333!important}.message{display:none!important}";
  (document.head ?? document.documentElement).appendChild(style);
}

/** Loaded on demand by SEQTA.ts for pages that aren't the SEQTA app. */
export async function bootErrorPage() {
  const storagePromise = browser.storage.local.get(["onoff", "plugin.error-page-kitten.settings"]);

  const watchTitle = () => {
    if (isSeqta404Page()) inject404FlashHide();
  };
  watchTitle();
  if (document.readyState === "loading") {
    document.addEventListener("readystatechange", watchTitle);
  }

  if (document.readyState === "loading") {
    await new Promise<void>((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    });
  }
  document.removeEventListener("readystatechange", watchTitle);

  try {
    if (!isSeqta404Page()) return;

    const stored = await storagePromise;
    if ((stored.onoff ?? true) === false) return;
    const kittenSettings = stored["plugin.error-page-kitten.settings"] as
      | { enabled?: boolean }
      | undefined;
    if (kittenSettings?.enabled === false) return;

    mountErrorPageKitten();
  } catch (error) {
    document
      .querySelectorAll(".bsplus-kitten-404-hidden")
      .forEach((el) => el.classList.remove("bsplus-kitten-404-hidden"));
    console.error("[BetterSEQTA+] Failed to boot 404 page:", error);
  } finally {
    document.getElementById("bsplus-404-flash-hide")?.remove();
  }
}
