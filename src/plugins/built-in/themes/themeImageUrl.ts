/**
 * Theme decorative images must use data URLs instead of blob URLs on Firefox:
 * blob: URLs are tied to the origin where createObjectURL ran (page), while
 * settings UI runs in extension shadow DOM (moz-extension://).
 */
import base64ToBlob from "@/seqta/utils/base64ToBlob";

export { base64ToBlob };

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("FileReader did not return a string"));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

/** Base64 payload only (no `data:…;base64,` prefix) for the page-context bridge. */
export function blobToBase64Data(blob: Blob): Promise<string> {
  return blobToDataUrl(blob).then((dataUrl) => {
    const comma = dataUrl.indexOf(",");
    return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  });
}

export function stripBase64Prefix(base64String: string): string {
  if (!base64String) return "";
  return base64String.replace(/^data:[^;]+;base64,/, "");
}
