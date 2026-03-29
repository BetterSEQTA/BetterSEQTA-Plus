import * as pdfjs from "pdfjs-dist";
import browser from "webextension-polyfill";
import pdfWorkerHref from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import pdfLegacyHref from "pdfjs-dist/legacy/build/pdf.min.mjs?url";

function extensionAssetUrl(viteAssetHref: string): string {
  const path = viteAssetHref.replace(/^\/+/, "");
  return browser.runtime.getURL(path);
}

let workerConfigured = false;

/** Required before pdfjs spawns a worker (content-script / extension isolate). */
export function ensurePdfjsWorker(): void {
  if (workerConfigured) return;
  pdfjs.GlobalWorkerOptions.workerSrc = extensionAssetUrl(pdfWorkerHref);
  workerConfigured = true;
}

/** Page-context script on Firefox must load these chrome-extension:// URLs (see web_accessible_resources). */
export function getPdfjsPageContextUrls(): { lib: string; worker: string } {
  return {
    lib: extensionAssetUrl(pdfLegacyHref),
    worker: extensionAssetUrl(pdfWorkerHref),
  };
}
