import localforage from "localforage";
import { cloudAuth } from "@/seqta/utils/CloudAuth";

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

async function fetchServerHash(userId: string): Promise<string | null> {
  const res = await fetch(`${ACCOUNTS_BASE}/api/user/pfp/${userId}/meta`);
  if (!res.ok) return null;
  const data = (await res.json()) as { pfpHash?: string | null };
  return data.pfpHash ?? null;
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

export type ResolveCloudPfpResult = {
  src: string;
  fromCache: boolean;
};

/**
 * Returns an object URL or direct URL for the cloud profile picture.
 * Order: session hash match → local blob; else meta → download → store blob then hash.
 */
export async function resolveCloudPfp(
  userId: string,
  pfpUrl: string,
): Promise<ResolveCloudPfpResult | null> {
  if (!isAccountsHostedPfpUrl(pfpUrl)) {
    return { src: pfpUrl, fromCache: false };
  }

  const sessionHash = cloudAuth.state.user?.pfpHash ?? null;
  const localHash = await store.getItem<string>(hashKey(userId));
  const localBlob = await store.getItem<Blob>(blobKey(userId));

  let serverHash = sessionHash;

  const localMatches =
    !!serverHash && serverHash === localHash && localBlob instanceof Blob;
  if (localMatches) {
    return { src: URL.createObjectURL(localBlob), fromCache: true };
  }

  if (!serverHash || serverHash !== localHash) {
    serverHash = await fetchServerHash(userId);
  }

  if (!serverHash) {
    await clearLocal(userId);
    return null;
  }

  if (serverHash === localHash && localBlob instanceof Blob) {
    return { src: URL.createObjectURL(localBlob), fromCache: true };
  }

  await clearLocal(userId);

  const imageUrl = pfpUrlWithHash(pfpUrl, serverHash);
  const headers: HeadersInit = {};
  if (localHash) {
    headers["If-None-Match"] = `"${localHash}"`;
  }

  const res = await fetch(imageUrl, { headers });
  if (res.status === 304 && localBlob instanceof Blob) {
    await store.setItem(hashKey(userId), serverHash);
    return { src: URL.createObjectURL(localBlob), fromCache: true };
  }

  if (!res.ok) return null;

  const blob = await res.blob();
  await store.setItem(blobKey(userId), blob);
  await store.setItem(hashKey(userId), serverHash);

  return { src: URL.createObjectURL(blob), fromCache: false };
}
