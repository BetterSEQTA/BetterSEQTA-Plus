import { cloudAuth, type CloudUser } from "@/seqta/utils/CloudAuth";
import { clearCloudPfpCache, pfpUrlWithHash } from "@/seqta/utils/cloudPfpCache";

const ACCOUNTS_BASE = "https://accounts.betterseqta.org";
const BSPLUS_PFP = `${ACCOUNTS_BASE}/api/bsplus/pfp`;
const UPLOAD_EDGE = 512;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

type Result = { success: boolean; error?: string };

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function withPfp(user: CloudUser, data: Record<string, unknown>): CloudUser {
  const url = data.pfpUrl as string | null | undefined;
  const pfpHash = (data.pfpHash as string | null | undefined) ?? null;
  return { ...user, pfpUrl: url ? pfpUrlWithHash(url, pfpHash) : undefined, pfpHash };
}

function withMe(user: CloudUser, data: Record<string, unknown>): CloudUser {
  const raw = (data.user as Record<string, unknown> | undefined) ?? data;
  return withPfp(
    {
      ...user,
      email: (raw.email as string | undefined) ?? user.email,
      username: (raw.username as string | undefined) ?? user.username,
      displayName: (raw.displayName as string | undefined) ?? user.displayName,
      admin_level: (raw.admin_level as number | undefined) ?? user.admin_level,
      signup_number: (raw.signup_number as number | null | undefined) ?? user.signup_number,
      badges: (raw.badges as CloudUser["badges"]) ?? user.badges,
      is_founding_2500: (raw.is_founding_2500 as boolean | undefined) ?? user.is_founding_2500,
    },
    raw,
  );
}

async function authedFetch(url: string, init?: RequestInit) {
  const token = await cloudAuth.getStoredToken();
  if (!token) return null;
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init?.headers },
  });
  return { res, data: await parseJson(res) };
}

function requestError(data: Record<string, unknown>, status: number, fallback: string) {
  return (data.error as string | undefined) ?? `${fallback} (${status})`;
}

async function cropToSquare(source: Blob): Promise<File> {
  if (!source.type.startsWith("image/")) throw new Error("Invalid file type");
  if (source.size > MAX_SOURCE_BYTES) throw new Error("File too large (max 20MB)");

  const bitmap = await createImageBitmap(source);
  try {
    const size = Math.min(bitmap.width, bitmap.height);
    const canvas = new OffscreenCanvas(UPLOAD_EDGE, UPLOAD_EDGE);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare image");
    const sx = (bitmap.width - size) / 2;
    const sy = (bitmap.height - size) / 2;
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, UPLOAD_EDGE, UPLOAD_EDGE);

    let blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.88 });
    if (blob.type !== "image/webp") {
      blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
    }
    return new File([blob], blob.type === "image/webp" ? "profile.webp" : "profile.jpg", {
      type: blob.type,
    });
  } finally {
    bitmap.close();
  }
}

export async function refreshCloudUserFromServer(): Promise<Result> {
  const current = cloudAuth.state.user;
  if (!cloudAuth.state.isLoggedIn || !current?.id) {
    return { success: false, error: "Not signed in to BetterSEQTA Cloud" };
  }

  try {
    const me = await authedFetch(`${ACCOUNTS_BASE}/api/auth/me`);
    if (!me) return { success: false, error: "Not signed in to BetterSEQTA Cloud" };
    if (!me.res.ok) {
      return {
        success: false,
        error: requestError(me.data, me.res.status, "Could not refresh account"),
      };
    }

    let user = withMe(current, me.data);
    const pfp = await authedFetch(BSPLUS_PFP);
    if (pfp?.res.ok) user = withPfp(user, pfp.data);
    await cloudAuth.setUser(user);
    await clearCloudPfpCache(current.id);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not refresh account",
    };
  }
}

export async function uploadCloudProfilePicture(source: Blob): Promise<Result> {
  const current = cloudAuth.state.user;
  if (!cloudAuth.state.isLoggedIn || !current?.id) {
    return { success: false, error: "Not signed in to BetterSEQTA Cloud" };
  }

  try {
    const file = await cropToSquare(source);
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("clientProcessed", "true");
    form.append("preCropped", "true");
    const upload = await authedFetch(BSPLUS_PFP, { method: "POST", body: form });
    if (!upload) return { success: false, error: "Not signed in to BetterSEQTA Cloud" };
    if (!upload.res.ok) {
      return {
        success: false,
        error: requestError(upload.data, upload.res.status, "Upload failed"),
      };
    }
    await clearCloudPfpCache(current.id);
    await cloudAuth.setUser(withPfp(current, upload.data));
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Upload failed" };
  }
}
