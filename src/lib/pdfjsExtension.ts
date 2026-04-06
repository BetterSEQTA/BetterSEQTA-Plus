import * as pdfjs from "pdfjs-dist";
import browser from "webextension-polyfill";

/** Static copies in `src/public` (see `scripts/copy-pdfjs-assets.mjs`, manifest web_accessible_resources). */
const PDF_WORKER_RESOURCE = "resources/pdfjs/pdf.worker.min.mjs";
const PDF_LEGACY_RESOURCE = "resources/pdfjs/pdf.legacy.min.mjs";

function extensionAssetUrl(relativePath: string): string {
  return browser.runtime.getURL(relativePath.replace(/^\/+/, ""));
}

let workerConfigured = false;

/** Required before pdfjs spawns a worker (content-script / extension isolate). */
export function ensurePdfjsWorker(): void {
  if (workerConfigured) return;
  pdfjs.GlobalWorkerOptions.workerSrc = extensionAssetUrl(PDF_WORKER_RESOURCE);
  workerConfigured = true;
}

/** Page-context script on Firefox must load these chrome-extension:// URLs (see web_accessible_resources). */
export function getPdfjsPageContextUrls(): { lib: string; worker: string } {
  return {
    lib: extensionAssetUrl(PDF_LEGACY_RESOURCE),
    worker: extensionAssetUrl(PDF_WORKER_RESOURCE),
  };
}
