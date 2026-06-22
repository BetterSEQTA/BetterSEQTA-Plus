/**
 * Theme decorative images must use data URLs instead of blob URLs on Firefox:
 * blob: URLs are tied to the origin where createObjectURL ran (page), while
 * settings UI runs in extension shadow DOM (moz-extension://).
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("FileReader did not return a string"));
      }
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

export function themeCssUrlValue(url: string): string {
  return `url("${url.replace(/"/g, "%22")}")`;
}

export function releaseThemeImageUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
