import localforage from "localforage";
import browser from "@/lib/browser";
import type { CloudUser } from "@/seqta/utils/cloudAuth";
import { defaultAccountsPfpUrl, resolveCloudPfp, revokePfpUrl } from "@/seqta/utils/cloudPfpCache";

export const REVISION_KEY = "profile_picture_revision";

const store = localforage.createInstance({
  name: "profile-picture-store",
  storeName: "profilePicture",
});

export async function setLocalPicture(file: Blob | null): Promise<void> {
  if (file) await store.setItem("profile-picture", file);
  else await store.removeItem("profile-picture");
  await browser.storage.local.set({ [REVISION_KEY]: Date.now() });
}

async function pictureUrl(cloudUser: CloudUser | null): Promise<string | null> {
  if (cloudUser) {
    const pfpUrl = cloudUser.pfpUrl ?? defaultAccountsPfpUrl(cloudUser.id);
    return resolveCloudPfp(cloudUser.id, pfpUrl);
  }
  const blob = await store.getItem<Blob>("profile-picture");
  return blob instanceof Blob ? URL.createObjectURL(blob) : null;
}

export async function loadPicture(cloudUser: CloudUser | null): Promise<string | null> {
  const url = await pictureUrl(cloudUser).catch(() => null);
  if (!url) return null;
  const probe = new Image();
  probe.src = url;
  try {
    await probe.decode();
    return url;
  } catch {
    revokePfpUrl(url);
    return null;
  }
}
