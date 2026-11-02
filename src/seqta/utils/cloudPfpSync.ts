import browser from "@/lib/browser";
import localforage from "localforage";
import { cloudAuth, type CloudUser } from "@/seqta/utils/CloudAuth";
import { clearCloudPfpCache, pfpUrlWithHash } from "@/seqta/utils/cloudPfpCache";

const ACCOUNTS_BASE = "https://accounts.betterseqta.org";
const BSPLUS_PFP = `${ACCOUNTS_BASE}/api/bsplus/pfp`;
const PLUGIN_SETTINGS_KEY = "plugin.profile-picture.settings";
const UPLOAD_MAX_EDGE = 512;
const MAX_SOURCE_BYTES_WEBP = 20 * 1024 * 1024;
const MAX_SOURCE_BYTES_LEGACY = 10 * 1024 * 1024;

function webpExportSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

function maxSourceBytes(): number {
  return webpExportSupported() ? MAX_SOURCE_BYTES_WEBP : MAX_SOURCE_BYTES_LEGACY;
}

const profileStore = localforage.createInstance({
  name: "profile-picture-store",
  storeName: "profilePicture",
});

type PfpPayload = {
  pfpUrl: string | null;
  pfpHash: string | null;
  pfpHistory: CloudUser["pfpHistory"];
};

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function parsePfpPayload(data: Record<string, unknown>): PfpPayload {
  const rawUrl = data.pfpUrl as string | null | undefined;
  const history = Array.isArray(data.pfpHistory) ? data.pfpHistory : [];
  const pfpHistory = history.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const o = item as Record<string, unknown>;
    if (
      typeof o.id === "string" &&
      typeof o.r2Key === "string" &&
      typeof o.createdAt === "number"
    ) {
      return [{ id: o.id, r2Key: o.r2Key, createdAt: o.createdAt }];
    }
    return [];
  });
  return {
    pfpUrl: rawUrl == null || rawUrl === "" ? null : rawUrl,
    pfpHash: (data.pfpHash as string | null | undefined) ?? null,
    pfpHistory,
  };
}

function mergePfpIntoUser(user: CloudUser, pfp: PfpPayload): CloudUser {
  return {
    ...user,
    pfpUrl: pfp.pfpUrl ? pfpUrlWithHash(pfp.pfpUrl, pfp.pfpHash) : undefined,
    pfpHash: pfp.pfpHash,
    pfpHistory: pfp.pfpHistory,
  };
}

async function applyPfpPayload(data: Record<string, unknown>): Promise<void> {
  const user = cloudAuth.state.user;
  if (!user) return;
  await cloudAuth.setUser(mergePfpIntoUser(user, parsePfpPayload(data)));
  if (user.id) await clearCloudPfpCache(user.id);
}

async function bsplusPfpRequest(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data: Record<string, unknown>; error?: string }> {
  const token = await cloudAuth.getStoredToken();
  if (!token) return { ok: false, data: {}, error: "Not signed in to BetterSEQTA Cloud" };

  const res = await fetch(`${BSPLUS_PFP}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = await parseJson(res);
  if (!res.ok) {
    return {
      ok: false,
      data,
      error: (data.error as string) ?? `Request failed (${res.status})`,
    };
  }
  return { ok: true, data };
}

async function prepareUploadFile(source: Blob): Promise<File> {
  if (!source.type.startsWith("image/")) throw new Error("Invalid file type");
  const limit = maxSourceBytes();
  if (source.size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    throw new Error(`File too large (max ${mb}MB)`);
  }

  const bitmap = await createImageBitmap(source);
  try {
    const size = Math.min(bitmap.width, bitmap.height);
    const sx = Math.round((bitmap.width - size) / 2);
    const sy = Math.round((bitmap.height - size) / 2);
    const canvas = new OffscreenCanvas(UPLOAD_MAX_EDGE, UPLOAD_MAX_EDGE);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare image");
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, UPLOAD_MAX_EDGE, UPLOAD_MAX_EDGE);

    const webp = webpExportSupported();
    const mime = webp ? "image/webp" : "image/jpeg";
    const blob = await canvas.convertToBlob({ type: mime, quality: webp ? 0.88 : 0.85 });
    return new File([blob], webp ? "profile.webp" : "profile.jpg", { type: mime });
  } finally {
    bitmap.close();
  }
}

export async function isUseCloudPfpEnabled(): Promise<boolean> {
  const stored = await browser.storage.local.get(PLUGIN_SETTINGS_KEY);
  const settings = stored[PLUGIN_SETTINGS_KEY] as { useCloudPfp?: boolean } | undefined;
  return !!settings?.useCloudPfp;
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
    signup_number: (raw.signup_number as number | null | undefined) ?? current.signup_number,
    badges: (raw.badges as CloudUser["badges"]) ?? current.badges,
    is_founding_2500: (raw.is_founding_2500 as boolean | undefined) ?? current.is_founding_2500,
    pfpUrl,
    pfpHash,
  };
}

export async function refreshCloudUserFromServer(): Promise<{ success: boolean; error?: string }> {
  if (!cloudAuth.state.isLoggedIn) {
    return { success: false, error: "Not signed in to BetterSEQTA Cloud" };
  }
  const token = await cloudAuth.getStoredToken();
  const current = cloudAuth.state.user;
  if (!token || !current?.id) {
    return { success: false, error: "Not signed in to BetterSEQTA Cloud" };
  }

  try {
    const res = await fetch(`${ACCOUNTS_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJson(res);
    if (!res.ok) {
      return { success: false, error: (data.error as string) ?? `Could not refresh account (${res.status})` };
    }

    let merged = mergeMeIntoUser(current, data);
    const pfp = await bsplusPfpRequest("");
    if (pfp.ok) merged = mergePfpIntoUser(merged, parsePfpPayload(pfp.data));
    await cloudAuth.setUser(merged);
    await clearCloudPfpCache(current.id);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not refresh account",
    };
  }
}

export async function pullCloudProfilePictureFromServer(): Promise<{ success: boolean; error?: string }> {
  const current = cloudAuth.state.user;
  if (!cloudAuth.state.isLoggedIn || !current?.id) {
    return { success: false, error: "Not signed in to BetterSEQTA Cloud" };
  }

  const pfp = await bsplusPfpRequest("");
  if (!pfp.ok) return { success: false, error: pfp.error ?? "Could not refresh cloud photo" };

  await applyPfpPayload(pfp.data);
  await notifyProfilePictureChanged();
  return { success: true };
}

export async function onUseCloudPfpToggled(enabled: boolean): Promise<void> {
  if (!enabled) {
    await notifyProfilePictureChanged();
    return;
  }
  const blob = await profileStore.getItem<Blob>("profile-picture");
  if (blob instanceof Blob) await syncLocalProfilePictureToCloud();
  else await pullCloudProfilePictureFromServer();
}

export async function uploadCloudProfilePicture(source: Blob): Promise<{ success: boolean; error?: string }> {
  if (!cloudAuth.state.isLoggedIn) {
    return { success: false, error: "Not signed in to BetterSEQTA Cloud" };
  }
  try {
    const file = await prepareUploadFile(source);
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("clientProcessed", "true");
    form.append("preCropped", "true");
    const res = await bsplusPfpRequest("", { method: "POST", body: form });
    if (!res.ok) return { success: false, error: res.error ?? "Upload failed" };
    await applyPfpPayload(res.data);
    await notifyProfilePictureChanged();
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Upload failed" };
  }
}

export async function syncLocalProfilePictureToCloud(): Promise<{ success: boolean; error?: string }> {
  if (!(await isUseCloudPfpEnabled()) || !cloudAuth.state.isLoggedIn) return { success: true };
  const blob = await profileStore.getItem<Blob>("profile-picture");
  if (!(blob instanceof Blob)) return { success: true };
  return uploadCloudProfilePicture(blob);
}

export async function clearCloudProfilePicture(): Promise<{ success: boolean; error?: string }> {
  if (!cloudAuth.state.isLoggedIn) return { success: true };
  const res = await bsplusPfpRequest("/clear", { method: "POST" });
  if (!res.ok) return { success: false, error: res.error ?? "Clear failed" };
  await applyPfpPayload(res.data);
  await notifyProfilePictureChanged();
  return { success: true };
}

export async function revertCloudProfilePicture(historyId: string): Promise<{ success: boolean; error?: string }> {
  if (!cloudAuth.state.isLoggedIn) {
    return { success: false, error: "Not signed in to BetterSEQTA Cloud" };
  }
  const res = await bsplusPfpRequest("/revert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ historyId }),
  });
  if (!res.ok) return { success: false, error: res.error ?? "Revert failed" };
  await applyPfpPayload(res.data);
  await notifyProfilePictureChanged();
  return { success: true };
}

export async function notifyProfilePictureChanged(): Promise<void> {
  await browser.storage.local.set({ profile_picture_revision: Date.now() });
}
