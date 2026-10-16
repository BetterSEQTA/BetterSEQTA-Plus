import browser from "webextension-polyfill";
import { getInstanceHostname } from "@/seqta/utils/feedback/client";
import { ACCOUNTS_BASE } from "./constants";
import type {
  OptInBindingBody,
  TimetableClassmatesBindingFields,
} from "./identityBinding";

export type PeersResponse = {
  self: { seqta_student_id: number; cloud_user_id?: string };
  peers: Array<{ seqta_student_id: number; cloud_user_id?: string }>;
};

export type RelaySessionResponse = {
  ws_url: string;
  relay_token: string;
  bundle_key_b64: string;
  share_code: string;
  relay_protocol: number;
};

const PEER_CLOUD_ID_TTL_MS = 5 * 60_000;
let peerCloudIds: Record<string, string> = {};
let peerCloudIdsAt = 0;

function peersToCloudIdMap(data: PeersResponse): Record<string, string> {
  const map: Record<string, string> = {};
  if (data.self.cloud_user_id) {
    map[String(data.self.seqta_student_id)] = data.self.cloud_user_id;
  }
  for (const peer of data.peers) {
    if (peer.cloud_user_id) map[String(peer.seqta_student_id)] = peer.cloud_user_id;
  }
  return map;
}

export function rememberPeerCloudIds(data: PeersResponse): void {
  peerCloudIds = peersToCloudIdMap(data);
  peerCloudIdsAt = Date.now();
}

export async function peerCloudIdsForPaint(): Promise<Record<string, string>> {
  if (Date.now() - peerCloudIdsAt < PEER_CLOUD_ID_TTL_MS && Object.keys(peerCloudIds).length > 0) {
    return peerCloudIds;
  }
  const host = getInstanceHostname();
  if (!host) return peerCloudIds;
  const data = await fetchPeers(host);
  if (data) rememberPeerCloudIds(data);
  return peerCloudIds;
}

async function getAccessToken(): Promise<string | null> {
  const { bsplus_token } = await browser.storage.local.get("bsplus_token");
  return typeof bsplus_token === "string" && bsplus_token.length > 0 ? bsplus_token : null;
}

async function accountsFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, status: 401, error: "Not signed in to BetterSEQTA Cloud" };

  const res = await fetch(`${ACCOUNTS_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let data: T | undefined;
  try {
    data = text ? (JSON.parse(text) as T) : undefined;
  } catch {
    data = undefined;
  }

  if (!res.ok) {
    const err =
      data && typeof data === "object" && "error" in data
        ? String((data as { error?: string }).error)
        : res.statusText;
    return { ok: false, status: res.status, error: err };
  }
  return { ok: true, status: res.status, data };
}

export async function putOptIn(body: OptInBindingBody): Promise<{ ok: boolean; error?: string }> {
  const res = await accountsFetch<{ opted_in_at?: string }>(
    "/api/bsplus/timetable-classmates/opt-in",
    { method: "PUT", body: JSON.stringify(body) },
  );
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function deleteOptIn(instanceHost: string): Promise<{ ok: boolean; error?: string }> {
  const q = encodeURIComponent(instanceHost);
  const res = await accountsFetch<unknown>(
    `/api/bsplus/timetable-classmates/opt-in?instance_host=${q}`,
    { method: "DELETE" },
  );
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function fetchPeers(instanceHost: string): Promise<PeersResponse | null> {
  const q = encodeURIComponent(instanceHost);
  const res = await accountsFetch<PeersResponse>(
    `/api/bsplus/timetable-classmates/peers?instance_host=${q}`,
  );
  return res.ok && res.data ? res.data : null;
}

export async function fetchRelaySession(
  instanceHost: string,
): Promise<RelaySessionResponse | null> {
  const q = encodeURIComponent(instanceHost);
  const res = await accountsFetch<RelaySessionResponse>(
    `/api/bsplus/timetable-classmates/relay-session?instance_host=${q}`,
  );
  return res.ok && res.data ? res.data : null;
}

export async function postHeartbeat(body: TimetableClassmatesBindingFields): Promise<void> {
  await accountsFetch("/api/bsplus/timetable-classmates/heartbeat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
