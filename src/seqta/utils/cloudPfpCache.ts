import localforage from "localforage";
import { cloudAuth } from "@/seqta/utils/cloudAuth";

const ACCOUNTS_BASE = "https://accounts.betterseqta.org";

const store = localforage.createInstance({
  name: "cloud-pfp-store",
  storeName: "cloudPfp",
});

function hashKey(userId: string) {
  return `hash:${userId}`;
}

function blobKey(userId: string) {
  return `blob:${userId}`;
}

export function isAccountsHostedPfpUrl(url: string): boolean {
  if (!url.includes("/api/user/pfp/")) return false;
  if (url.includes("/hist/")) return false;
  return /\/api\/user\/pfp\/[^/?#]+/.test(url.split("?")[0]!);
}

export function pfpUrlWithHash(url: string, hash: string | null | undefined): string {
  if (!url || !hash || !isAccountsHostedPfpUrl(url)) return url;
  const base = url.split("?")[0]!;
  return `${base}?v=${hash}`;
}

export function defaultAccountsPfpUrl(userId: string): string {
  return `${ACCOUNTS_BASE}/api/user/pfp/${userId}`;
}

const NO_PFP_META_TTL_MS = 10 * 60 * 1000;
const noPfpMetaUntil = new Map<string, number>();
const metaInflight = new Map<string, Promise<string | null>>();

async function fetchServerHash(userId: string): Promise<string | null> {
  const cachedUntil = noPfpMetaUntil.get(userId);
  if (cachedUntil != null && Date.now() < cachedUntil) return null;

  const inflight = metaInflight.get(userId);
  if (inflight) return inflight;

  const work = (async () => {
    try {
      const res = await fetch(`${ACCOUNTS_BASE}/api/user/pfp/${userId}/meta`);
      if (!res.ok) {
        if (res.status === 404) {
          noPfpMetaUntil.set(userId, Date.now() + NO_PFP_META_TTL_MS);
          return null;
        }
        throw new Error(`pfp meta HTTP ${res.status}`);
      }
      const data = (await res.json()) as { pfpHash?: string | null };
      const hash = data.pfpHash ?? null;
      if (!hash) {
        noPfpMetaUntil.set(userId, Date.now() + NO_PFP_META_TTL_MS);
        return null;
      }
      noPfpMetaUntil.delete(userId);
      return hash;
    } finally {
      metaInflight.delete(userId);
    }
  })();

  metaInflight.set(userId, work);
  return work;
}

async function clearLocal(userId: string): Promise<void> {
  await store.removeItem(hashKey(userId));
  await store.removeItem(blobKey(userId));
}

export async function clearCloudPfpCache(userId?: string): Promise<void> {
  const id = userId ?? cloudAuth.state.user?.id;
  if (!id) return;
  await clearLocal(id);
}

export function revokePfpUrl(url: string | null | undefined): void {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function sessionPfpHash(viewerId: string | null, userId: string): string | null {
  if (!viewerId || viewerId !== userId) return null;
  return cloudAuth.state.user?.pfpHash ?? null;
}

function localHashHit(
  serverHash: string | null | undefined,
  localHash: string | null | undefined,
  localBlob: Blob | null | undefined,
): string | null {
  if (!serverHash || serverHash !== localHash || !(localBlob instanceof Blob)) {
    return null;
  }
  return URL.createObjectURL(localBlob);
}

async function fetchAndCachePfp(
  userId: string,
  pfpUrl: string,
  serverHash: string,
  localHash: string | null | undefined,
  localBlob: Blob | null | undefined,
): Promise<string | null> {
  const imageUrl = pfpUrlWithHash(pfpUrl, serverHash);
  const headers: HeadersInit = {};
  if (localHash) {
    headers["If-None-Match"] = `"${localHash}"`;
  }
  const token = await cloudAuth.getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(imageUrl, { headers });
  if (res.status === 304 && localBlob instanceof Blob) {
    await store.setItem(hashKey(userId), serverHash);
    return URL.createObjectURL(localBlob);
  }
  if (!res.ok) return null;

  const blob = await res.blob();
  await store.setItem(blobKey(userId), blob);
  await store.setItem(hashKey(userId), serverHash);
  return URL.createObjectURL(blob);
}

/**
 * Returns an object URL or direct URL for the cloud profile picture.
 * Order: session hash match → local blob; else meta → download → store blob then hash.
 */
export async function resolveCloudPfp(userId: string, pfpUrl: string): Promise<string | null> {
  if (!isAccountsHostedPfpUrl(pfpUrl)) return pfpUrl;

  const viewerId = cloudAuth.state.user?.id ?? null;
  const localHash = await store.getItem<string>(hashKey(userId));
  const localBlob = await store.getItem<Blob>(blobKey(userId));

  let serverHash: string | null = sessionPfpHash(viewerId, userId);
  const sessionHit = localHashHit(serverHash, localHash, localBlob);
  if (sessionHit) return sessionHit;

  try {
    serverHash = await fetchServerHash(userId);
  } catch {
    return localHashHit(localHash, localHash, localBlob);
  }

  if (!serverHash) {
    if (!localHash && !localBlob) return null;
    await clearLocal(userId);
    return null;
  }

  const metaHit = localHashHit(serverHash, localHash, localBlob);
  if (metaHit) return metaHit;

  await clearLocal(userId);
  return fetchAndCachePfp(userId, pfpUrl, serverHash, localHash, localBlob);
}
