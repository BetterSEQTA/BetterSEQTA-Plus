import browser from "webextension-polyfill";
import defaultBackgroundUrl from "@/resources/backgrounds/default-background.webp";
import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";
import { writeData } from "@/interface/hooks/BackgroundDataLoader";
import { DEFAULT_BACKGROUND_PENDING_KEY } from "./defaultBackgroundKey";

const DEFAULT_BACKGROUND_ID = "image-116";

export async function applyDefaultBackgroundOnce(): Promise<void> {
  const stored = await browser.storage.local.get(DEFAULT_BACKGROUND_PENDING_KEY);
  if (!stored[DEFAULT_BACKGROUND_PENDING_KEY]) return;

  if (localStorage.getItem("selectedBackground") === null) {
    const response = await fetch(resolveExtensionAssetUrl(defaultBackgroundUrl));
    await writeData(DEFAULT_BACKGROUND_ID, "image", await response.blob());
    localStorage.setItem("selectedBackground", DEFAULT_BACKGROUND_ID);
  }

  await browser.storage.local.remove(DEFAULT_BACKGROUND_PENDING_KEY);
}
