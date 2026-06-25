import browser from "webextension-polyfill";
import localforage from "localforage";
import { cloudAuth, type CloudUser } from "@/seqta/utils/CloudAuth";
import {
  clearCloudPfpCache,
  pfpUrlWithHash,
} from "@/seqta/utils/cloudPfpCache";

const ACCOUNTS_BASE = "https://accounts.betterseqta.org";
const PLUGIN_SETTINGS_KEY = "plugin.profile-picture.settings";

const profileStore = localforage.createInstance({
  name: "profile-picture-store",
  storeName: "profilePicture",
});

/** Downscale before upload to reduce ingress (server still normalizes). */
async function downscaleForUpload(blob: Blob, maxEdge = 512): Promise<Blob> {
  if (!blob.type.startsWith("image/")) return blob;

  const bitmap = await createImageBitmap(blob);
  const maxSide = Math.max(bitmap.width, bitmap.height);
  if (maxSide <= maxEdge) {
    bitmap.close();
    return blob;
  }

  const scale = maxEdge / maxSide;
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return blob;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const out = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
  return out;
}

export async function isUseCloudPfpEnabled(): Promise<boolean> {
  const stored = await browser.storage.local.get(PLUGIN_SETTINGS_KEY);
  const settings = stored[PLUGIN_SETTINGS_KEY] as { useCloudPfp?: boolean } | undefined;
  return !!settings?.useCloudPfp;
}

async function parseJsonResponse(r: Response): Promise<Record<string, unknown>> {
  const text = await r.text();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function mergeMeIntoUser(current: CloudUser, data: Record<string, unknown>): CloudUser {
  const raw = (data.user as Record<string, unknown> | undefined) ?? data;
  const pfpUrlRaw = raw.pfpUrl as string | null | undefined;
  const pfpHash = (raw.pfpHash as string | null | undefined) ?? null;
  const pfpUrl =
    pfpUrlRaw == null || pfpUrlRaw === ""
      ? undefined
      : pfpUrlWithHash(pfpUrlRaw, pfpHash);

  return {
    ...current,
    email: (raw.email as string | undefined) ?? current.email,
    username: (raw.username as string | undefined) ?? current.username,
    displayName: (raw.displayName as string | undefined) ?? current.displayName,
    admin_level: (raw.admin_level as number | undefined) ?? current.admin_level,
    pfpUrl,
    pfpHash,
  };
}

/** Fetch `/api/auth/me` and update stored user (pfpUrl / pfpHash). */
export async function refreshCloudUserFromServer(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!cloudAuth.state.isLoggedIn) {
    return { success: false, error: "Not signed in to BetterSEQTA Cloud" };
  }

  const token = await cloudAuth.getStoredToken();
  if (!token) return { success: false, error: "Not signed in to BetterSEQTA Cloud" };

  const current = cloudAuth.state.user;
  if (!current?.id) return { success: false, error: "No cloud user on this device" };

  try {
    const res = await fetch(`${ACCOUNTS_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      return {
        success: false,
        error: (data.error as string) ?? `Could not refresh account (${res.status})`,
      };
    }

    await cloudAuth.setUser(mergeMeIntoUser(current, data));
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not refresh account",
    };
  }
}

/** Pull cloud avatar metadata from the server and refresh the in-page profile image. */
export async function pullCloudProfilePictureFromServer(): Promise<{
  success: boolean;
  error?: string;
}> {
  const refreshed = await refreshCloudUserFromServer();
  if (!refreshed.success) return refreshed;

  const userId = cloudAuth.state.user?.id;
  if (userId) await clearCloudPfpCache(userId);
  await notifyProfilePictureChanged();
  return { success: true };
}

/** When cloud PFP is enabled: upload local image if present, otherwise pull from server. */
export async function onUseCloudPfpToggled(enabled: boolean): Promise<void> {
  if (!enabled) {
    await notifyProfilePictureChanged();
    return;
  }

  const blob = await profileStore.getItem<Blob>("profile-picture");
  if (blob instanceof Blob) {
    await syncLocalProfilePictureToCloud();
  } else {
    await pullCloudProfilePictureFromServer();
  }
}

export async function syncLocalProfilePictureToCloud(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!(await isUseCloudPfpEnabled()) || !cloudAuth.state.isLoggedIn) {
    return { success: true };
  }

  const token = await cloudAuth.getStoredToken();
  if (!token) return { success: false, error: "Not logged in" };

  const user = cloudAuth.state.user;
  const userId = user?.id;

  const blob = await profileStore.getItem<Blob>("profile-picture");

  try {
    if (!blob || !(blob instanceof Blob)) {
      // No local upload — keep the server avatar; do not clear cloud.
      return { success: true };
    }

    if (!blob.type.startsWith("image/")) {
      return { success: false, error: "Invalid file type" };
    }
    if (blob.size > 5 * 1024 * 1024) {
      return { success: false, error: "File too large (max 5MB)" };
    }

    const uploadBlob = await downscaleForUpload(blob);
    const formData = new FormData();
    formData.append("file", uploadBlob, "profile-picture.jpg");

    const res = await fetch(`${ACCOUNTS_BASE}/api/user/pfp`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      return { success: false, error: (data.error as string) ?? `Upload failed (${res.status})` };
    }

    const pfpUrl = data.pfpUrl as string | undefined;
    const pfpHash = (data.pfpHash as string | null | undefined) ?? null;
    if (user && pfpUrl) {
      await cloudAuth.setUser({
        ...user,
        pfpUrl: pfpUrlWithHash(pfpUrl, pfpHash),
        pfpHash,
      });
    }
    if (userId) await clearCloudPfpCache(userId);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Cloud profile picture sync failed",
    };
  }
}

/** Upload local image to cloud, or clear cloud only when explicitly removing local image. */
export async function clearCloudProfilePicture(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!cloudAuth.state.isLoggedIn) return { success: true };

  const token = await cloudAuth.getStoredToken();
  if (!token) return { success: false, error: "Not logged in" };

  const user = cloudAuth.state.user;
  const userId = user?.id;

  try {
    const res = await fetch(`${ACCOUNTS_BASE}/api/user/pfp/clear`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      return { success: false, error: (data.error as string) ?? `Clear failed (${res.status})` };
    }
    if (user) {
      await cloudAuth.setUser({ ...user, pfpUrl: undefined, pfpHash: null });
    }
    if (userId) await clearCloudPfpCache(userId);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Cloud profile picture clear failed",
    };
  }
}

/** Notify SEQTA content scripts to refresh the in-page profile image. */
export async function notifyProfilePictureChanged(): Promise<void> {
  const revision = Date.now();
  await browser.storage.local.set({ profile_picture_revision: revision });
}
