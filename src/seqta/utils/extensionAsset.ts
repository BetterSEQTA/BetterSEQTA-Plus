function hasExtensionRuntimeGetUrl(): boolean {
  const runtime = (globalThis as any)?.chrome?.runtime;
  return (
    !!runtime &&
    typeof runtime.getURL === "function" &&
    typeof runtime.id === "string" &&
    runtime.id.length > 0
  );
}

/**
 * Resolve an extension asset URL safely across content-script and page contexts.
 * Falls back to the provided path when extension runtime APIs are unavailable.
 */
export function extensionAssetUrl(path: string): string {
  if (!path) {
    return path;
  }

  // Already fully-resolved URL.
  if (
    path.startsWith("chrome-extension://") ||
    path.startsWith("moz-extension://") ||
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  if (hasExtensionRuntimeGetUrl()) {
    return (globalThis as any).chrome.runtime.getURL(path.replace(/^\/+/, ""));
  }

  return path;
}

