/**
 * Bridge theme CSS and decorative images into PAGE JavaScript context.
 */

import patchScript from "@/seqta/utils/themeImagePagePatch.js?url";
import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";
import { blobToBase64Data } from "@/plugins/built-in/themes/themeImageUrl";

const PAGE_PATCH_LOADER_ID = "bsplus-theme-image-page-patch-loader";
const BRIDGE_ID = "bsplus-theme-image-bridge";
const PAYLOAD_ID = "bsplus-theme-image-payload";

export type ThemePageSyncInput = {
  images?: Array<{ variableName: string; blob: Blob }>;
  customCss?: string;
  previewCss?: string;
  clear?: boolean;
  clearPreview?: boolean;
};

export function installThemeImagePagePatch(): void {
  if (document.getElementById(PAGE_PATCH_LOADER_ID)) return;

  const script = document.createElement("script");
  script.id = PAGE_PATCH_LOADER_ID;
  script.src = resolveExtensionAssetUrl(patchScript);
  script.addEventListener("load", () => script.remove());
  (document.documentElement || document.head).appendChild(script);
}

function ensureBridgeElements(): void {
  if (!document.getElementById(PAYLOAD_ID)) {
    const payload = document.createElement("textarea");
    payload.id = PAYLOAD_ID;
    payload.hidden = true;
    payload.setAttribute("aria-hidden", "true");
    payload.tabIndex = -1;
    document.documentElement.appendChild(payload);
  }
  if (!document.getElementById(BRIDGE_ID)) {
    const bridge = document.createElement("div");
    bridge.id = BRIDGE_ID;
    bridge.hidden = true;
    bridge.setAttribute("aria-hidden", "true");
    document.documentElement.appendChild(bridge);
  }
}

function bumpBridgeRevision(): void {
  const bridge = document.getElementById(BRIDGE_ID);
  if (!bridge) return;
  const rev = Number(bridge.getAttribute("data-rev") || "0") + 1;
  bridge.setAttribute("data-rev", String(rev));
}

function sendPayload(payload: Record<string, unknown>): void {
  installThemeImagePagePatch();
  ensureBridgeElements();
  const payloadEl = document.getElementById(PAYLOAD_ID) as HTMLTextAreaElement;
  payloadEl.value = JSON.stringify(payload);
  bumpBridgeRevision();
}

export async function syncThemeToPage(input: ThemePageSyncInput): Promise<void> {
  const payload: Record<string, unknown> = {};

  if (input.clear) {
    sendPayload({ clear: true });
    return;
  }

  if (input.clearPreview) {
    payload.clearPreview = true;
  }

  if (input.customCss !== undefined) {
    payload.customCss = input.customCss;
  }

  if (input.previewCss !== undefined) {
    payload.previewCss = input.previewCss;
  }

  if (input.images !== undefined) {
    payload.images = await Promise.all(
      input.images.map(async (image) => ({
        variableName: image.variableName,
        data: await blobToBase64Data(image.blob),
        mime: image.blob.type || "image/png",
      })),
    );
  }

  if (Object.keys(payload).length === 0) return;
  sendPayload(payload);
}

export function clearThemeInPage(): void {
  sendPayload({ clear: true });
}

/** @deprecated Use clearThemeInPage */
export function clearThemeImagesInPage(): void {
  clearThemeInPage();
}

/** @deprecated Use syncThemeToPage */
export async function syncThemeImagesToPage(
  images: Array<{ variableName: string; blob: Blob }>,
): Promise<void> {
  await syncThemeToPage({ images });
}
