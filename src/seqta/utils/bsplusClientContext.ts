import browser from "@/lib/browser";
import { getOrCreateInstallId } from "@/seqta/utils/feedback/installId";

function manifestVersion(): string {
  try {
    return browser.runtime.getManifest().version;
  } catch {
    return "0";
  }
}

function updateChannel(): string {
  if (typeof __UPDATE_CHANNEL__ !== "undefined") {
    if (__UPDATE_CHANNEL__ === "nightly") return "nightly";
    if (__UPDATE_CHANNEL__ === "stable") return "stable";
  }
  return "unknown";
}

export function bsplusExtensionPayload(): {
  version: string;
  channel: string;
  browser: "chrome";
} {
  return { version: manifestVersion(), channel: updateChannel(), browser: "chrome" };
}

/** Shared query params for betterseqta.org theme + remote-config requests. */
export async function bsplusApiQueryParams(): Promise<URLSearchParams> {
  const params = new URLSearchParams({
    extensionVersion: manifestVersion(),
    channel: updateChannel(),
    installId: await getOrCreateInstallId(),
  });
  const { bsplus_user } = await browser.storage.local.get("bsplus_user");
  if (bsplus_user && typeof bsplus_user === "object" && "id" in bsplus_user) {
    const id = (bsplus_user as { id: unknown }).id;
    if (typeof id === "string" && id) params.set("userId", id);
  }
  return params;
}

export async function withBsplusApiQuery(url: string): Promise<string> {
  const qs = (await bsplusApiQueryParams()).toString();
  return qs ? (url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`) : url;
}
