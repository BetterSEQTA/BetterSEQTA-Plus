import browser from "@/lib/browser";

/** Static copies in `src/public` (see `scripts/copy-runtime-assets.mjs`, manifest web_accessible_resources). */
const PDF_WORKER_RESOURCE = "resources/pdfjs/pdf.worker.min.mjs";
const PDF_LEGACY_RESOURCE = "resources/pdfjs/pdf.legacy.min.mjs";

function extensionAssetUrl(relativePath: string): string {
  return browser.runtime.getURL(relativePath.replace(/^\/+/, ""));
}

let pdfjsLoad: Promise<typeof import("pdfjs-dist")> | null = null;

/**
 * Loads pdfjs with its worker configured (content-script / extension isolate).
 * pdfjs is ~450 KB, so it's only loaded when a PDF actually needs reading
 * rather than parsed on every SEQTA page.
 */
export function loadPdfjs(): Promise<typeof import("pdfjs-dist")> {
  pdfjsLoad ??= import("pdfjs-dist").then(
    (pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = extensionAssetUrl(PDF_WORKER_RESOURCE);
      return pdfjs;
    },
    (error) => {
      pdfjsLoad = null;
      throw error;
    },
  );
  return pdfjsLoad;
}

/** Page-context script on Firefox must load these chrome-extension:// URLs (see web_accessible_resources). */
export function getPdfjsPageContextUrls(): { lib: string; worker: string } {
  return {
    lib: extensionAssetUrl(PDF_LEGACY_RESOURCE),
    worker: extensionAssetUrl(PDF_WORKER_RESOURCE),
  };
}
