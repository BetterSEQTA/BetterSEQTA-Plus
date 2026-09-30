import browser from "webextension-polyfill";
import { getInstanceHostname } from "@/seqta/utils/feedback/client";
import { cloudAuth } from "@/seqta/utils/CloudAuth";
import {
  deleteOptIn,
  fetchPeers,
  fetchRelaySession,
  postHeartbeat,
  putOptIn,
  rememberPeerCloudIds,
} from "./accountsClient";
import {
  archiveMember,
  mergePayloadIntoRoster,
  removeMemberFromRoster,
} from "./rosterMerge";
import {
  loadArchivedMembers,
  loadRosterIndex,
  loadSession,
  notifyClassmatesUpdated,
  patchSession,
  recordConsent,
  resolveClassmatesScope,
  saveArchivedMembers,
  saveCiToClassKey,
  saveRosterIndex,
} from "./rosterStore";
import { setScopeSyncOptIn } from "./syncScopes";
import {
  cloudUserIdFromAccessToken,
  heartbeatIdentityFields,
  optInIdentityDigest,
} from "./identityBinding";
import { resolvePersonUuid, resolveStudentId } from "./seqtaClient";
import {
  fetchSchoolYearEnrollmentSnapshot,
  fingerprintEnrollment,
  type EnrollmentSnapshot,
} from "./timetableYearSnapshot";
import { buildEncryptedBundlesForClasses, decodeBundleKey, decryptClassBundle } from "./relayCrypto";
import { buildSharePayload } from "./relayPayload";
import { runRelayRoundTrip, sendRelayRevoke, type RelaySnapshotShare } from "./relayClient";
import type { ClassRef } from "./classKeys";
import { CLASSMATES_PEER_REFRESH_MS } from "./constants";

const HEARTBEAT_MIN_MS = 15 * 60 * 1000;

export type SyncRunResult = { ok: boolean; error?: string; peers?: number };

let syncChain: Promise<void> = Promise.resolve();

export function scheduleClassmatesSyncIfNeeded(force = false): void {
  syncChain = syncChain
    .then(() => runClassmatesSyncIfNeeded(force))
    .catch(() => {});
}

async function runClassmatesSyncIfNeeded(force = false): Promise<void> {
  const session = await loadSession();
  if (!session.syncOptIn) return;

  let yearSnap: EnrollmentSnapshot | undefined;
  if (!force) {
    const stale =
      !session.lastSyncAt || Date.now() - session.lastSyncAt > CLASSMATES_PEER_REFRESH_MS;
    if (!stale) {
      try {
        yearSnap = await fetchSchoolYearEnrollmentSnapshot();
        if (fingerprintEnrollment(yearSnap) === session.lastPublishedEnrollmentHash) return;
      } catch {
        /* fetch failed — try full sync */
      }
    }
  }

  await runTimetableClassmatesSync(yearSnap);
}

async function resolveCloudUserIdForBinding(): Promise<string | null> {
  const { bsplus_token } = await browser.storage.local.get("bsplus_token");
  const fromToken =
    typeof bsplus_token === "string" ? cloudUserIdFromAccessToken(bsplus_token) : null;
  return fromToken ?? cloudAuth.state.user?.id ?? null;
}

export async function registerOptIn(): Promise<{ ok: boolean; error?: string }> {
  const instanceHost = getInstanceHostname();
  if (!instanceHost) return { ok: false, error: "Open SEQTA on your school site first." };
  const cloudUserId = await resolveCloudUserIdForBinding();
  if (!cloudAuth.state.isLoggedIn || !cloudUserId) {
    return { ok: false, error: "Sign in to BetterSEQTA Cloud to opt in." };
  }
  const body = await optInIdentityDigest(instanceHost, cloudUserId);
  if (!body) return { ok: false, error: "Could not read your SEQTA login." };
  await recordConsent();
  const res = await putOptIn(body);
  if (!res.ok) return res;
  const scope = await resolveClassmatesScope();
  if (scope) await setScopeSyncOptIn(scope, true);
  await patchSession({ syncOptIn: true, showAvatars: true });
  const sync = await runTimetableClassmatesSync();
  if (!sync.ok) {
    return { ok: true, error: sync.error ?? "Opt-in saved but initial sync failed." };
  }
  return res;
}

export async function revokeOptIn(): Promise<{ ok: boolean; error?: string }> {
  const instanceHost = getInstanceHostname();

  if (instanceHost && cloudAuth.state.isLoggedIn) {
    const session = await fetchRelaySession(instanceHost);
    if (session) {
      try {
        await sendRelayRevoke(instanceHost, session);
      } catch {
        /* best-effort */
      }
    }
  }

  if (instanceHost) {
    const res = await deleteOptIn(instanceHost);
    if (!res.ok) return res;
  }

  const seqtaId = await resolveStudentId();
  if (seqtaId != null) {
    const [index, archived] = await Promise.all([loadRosterIndex(), loadArchivedMembers()]);
    await Promise.all([
      saveRosterIndex(removeMemberFromRoster(index, seqtaId)),
      saveArchivedMembers(archiveMember(archived, seqtaId)),
    ]);
  }

  const scope = await resolveClassmatesScope();
  if (scope) await setScopeSyncOptIn(scope, false);
  await patchSession({
    syncOptIn: false,
    lastSyncAt: undefined,
    lastPeerCount: undefined,
    lastPublishedEnrollmentHash: undefined,
  });

  notifyClassmatesUpdated();
  return { ok: true };
}

async function maybeHeartbeat(instanceHost: string): Promise<void> {
  const session = await loadSession();
  if (session.lastHeartbeatAt && Date.now() - session.lastHeartbeatAt < HEARTBEAT_MIN_MS) return;

  const cloudUserId = await resolveCloudUserIdForBinding();
  if (!cloudUserId) return;
  const binding = await heartbeatIdentityFields(instanceHost, cloudUserId);
  if (!binding) return;

  await postHeartbeat(binding);
  await patchSession({ lastHeartbeatAt: Date.now() });
}

async function applyRelaySnapshot(
  instanceHost: string,
  shares: RelaySnapshotShare[],
  bundleKey: Uint8Array,
  allowedSeqtaIds: ReadonlySet<number>,
): Promise<void> {
  let index = await loadRosterIndex();

  for (const share of shares) {
    if (!allowedSeqtaIds.has(share.seqta_student_id)) continue;

    const classes: ClassRef[] = [];
    let personUuid = "";
    let cloudUserId: string | null = share.cloud_user_id;

    for (const bundle of share.bundles) {
      const plain = await decryptClassBundle(bundleKey, bundle);
      if (!plain) continue;
      const cls = plain.class as ClassRef | undefined;
      if (cls) classes.push(cls);
      if (typeof plain.person_uuid === "string") personUuid = plain.person_uuid;
      if (typeof plain.cloud_user_id === "string") cloudUserId = plain.cloud_user_id;
    }

    if (classes.length === 0) continue;

    index = mergePayloadIntoRoster(
      index,
      buildSharePayload({
        instance: instanceHost,
        sender: {
          seqtaId: share.seqta_student_id,
          personUuid,
          cloudUserId: cloudUserId ?? share.cloud_user_id,
        },
        period: share.period,
        classes,
      }),
      allowedSeqtaIds,
    );
  }

  await saveRosterIndex(index);
}

export async function runTimetableClassmatesSync(
  preloadedYear?: EnrollmentSnapshot,
): Promise<SyncRunResult> {
  const instanceHost = getInstanceHostname();
  if (!instanceHost) return { ok: false, error: "Not on a SEQTA page" };
  if (!cloudAuth.state.isLoggedIn) return { ok: false, error: "Cloud login required" };

  const seqtaId = await resolveStudentId();
  const personUuid = await resolvePersonUuid();
  if (seqtaId == null || !personUuid) return { ok: false, error: "SEQTA login required" };

  await maybeHeartbeat(instanceHost);

  const peersData = await fetchPeers(instanceHost);
  if (!peersData) return { ok: false, error: "Not opted in on this school" };
  rememberPeerCloudIds(peersData);

  const allowed = new Set<number>([peersData.self.seqta_student_id]);
  for (const p of peersData.peers) allowed.add(p.seqta_student_id);

  const yearSnap = preloadedYear ?? (await fetchSchoolYearEnrollmentSnapshot());
  await saveCiToClassKey(yearSnap.ciToClassKey);

  const relaySession = await fetchRelaySession(instanceHost);
  if (!relaySession) return { ok: false, error: "Relay unavailable — update accounts worker" };

  const bundleKey = decodeBundleKey(relaySession.bundle_key_b64);
  const cloudUserId = await resolveCloudUserIdForBinding();

  const relayResult = await runRelayRoundTrip(instanceHost, relaySession, {
    onSnapshot: (shares) => applyRelaySnapshot(instanceHost, shares, bundleKey, allowed),
    buildPublish: async () => ({
      period: yearSnap.period,
      bundles: await buildEncryptedBundlesForClasses({
        bundleKey,
        seqtaStudentId: seqtaId,
        personUuid,
        cloudUserId,
        classes: yearSnap.classes,
      }),
    }),
  });

  if (!relayResult.ok) {
    return { ok: false, error: relayResult.error ?? "Relay sync failed" };
  }

  await patchSession({
    lastSyncAt: Date.now(),
    lastPeerCount: peersData.peers.length,
    lastPublishedEnrollmentHash: fingerprintEnrollment(yearSnap),
  });

  notifyClassmatesUpdated();
  return { ok: true, peers: peersData.peers.length };
}
