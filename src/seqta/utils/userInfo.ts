export type SeqtaUserInfo = {
  id?: number;
  student?: number;
  personUUID?: string;
  type?: string;
  userDesc?: string;
  [key: string]: unknown;
};

let cachedUserInfo: SeqtaUserInfo | null = null;
let userInfoFetchPromise: Promise<SeqtaUserInfo> | null = null;

function invalidateCachedUserInfo(): void {
  cachedUserInfo = null;
  userInfoFetchPromise = null;
}

if (typeof window !== "undefined") {
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) invalidateCachedUserInfo();
  });
}

export async function getUserInfo(options?: { validateSession?: boolean }) {
  if (cachedUserInfo && !options?.validateSession) {
    return cachedUserInfo;
  }

  if (userInfoFetchPromise && !options?.validateSession) {
    return userInfoFetchPromise;
  }

  const fetchUserInfo = async () => {
    try {
      const response = await fetch(`${location.origin}/seqta/student/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          mode: "normal",
          query: null,
          redirect_url: location.origin,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get user info: HTTP ${response.status}`);
      }

      const payload = (await response.json()).payload;

      if (
        cachedUserInfo &&
        options?.validateSession &&
        payload?.id != null &&
        cachedUserInfo.id != null &&
        payload.id !== cachedUserInfo.id
      ) {
        console.warn("[BetterSEQTA+] Session user changed; invalidating cached user info");
        invalidateCachedUserInfo();
      }

      cachedUserInfo = payload as SeqtaUserInfo;
      return cachedUserInfo;
    } catch (error) {
      console.error("[BetterSEQTA+] Failed to get user info:", error);
      throw error;
    } finally {
      if (!options?.validateSession) {
        userInfoFetchPromise = null;
      }
    }
  };

  if (options?.validateSession) {
    return fetchUserInfo();
  }

  userInfoFetchPromise = fetchUserInfo();
  return userInfoFetchPromise;
}

export async function tryGetUserInfo(): Promise<SeqtaUserInfo | undefined> {
  return (await getUserInfo().catch(() => undefined)) ?? undefined;
}

export async function getStudentId(): Promise<number | undefined> {
  const info = await tryGetUserInfo();
  const id = info?.id ?? info?.student;
  return typeof id === "number" && Number.isFinite(id) ? id : undefined;
}
