import { resolveLoginPayload } from "./seqtaClient";

/** Must match `buildIdentityBindingCanonical` in betterseqta-accounts worker. */
export function buildIdentityBindingCanonical(input: {
  version: 1;
  instanceHost: string;
  seqtaStudentId: number;
  seqtaPersonUuid: string;
  cloudUserId: string;
  seqtaAccountType?: string;
}): string {
  const lines = [
    `v=${input.version}`,
    `instance=${input.instanceHost}`,
    `student=${input.seqtaStudentId}`,
    `person=${input.seqtaPersonUuid}`,
    `cloud=${input.cloudUserId.toLowerCase()}`,
  ];
  if (input.seqtaAccountType != null && input.seqtaAccountType !== "") {
    lines.push(`type=${input.seqtaAccountType}`);
  }
  return lines.join("\n");
}

async function sha256Hex(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type TimetableClassmatesBindingFields = {
  instance_host: string;
  seqta_student_id: number;
  seqta_person_uuid: string;
  identity_binding_digest: string;
  identity_binding_version: 1;
  seqta_account_type?: string;
};

export type OptInBindingBody = TimetableClassmatesBindingFields & {
  attested_at: string;
};

/** JWT `id` claim — must match server `user.id` when verifying the digest. */
export function cloudUserIdFromAccessToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? b64 : b64 + "=".repeat(4 - (b64.length % 4));
    const payload = JSON.parse(atob(pad)) as { id?: string; sub?: string };
    const id = payload.id ?? payload.sub;
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

async function bindingFieldsFromSession(
  instanceHost: string,
  cloudUserId: string,
): Promise<TimetableClassmatesBindingFields | null> {
  const login = await resolveLoginPayload();
  const seqtaStudentId = login?.id ?? login?.student;
  const personUuidRaw = login?.personUUID;
  if (
    typeof seqtaStudentId !== "number" ||
    !Number.isFinite(seqtaStudentId) ||
    typeof personUuidRaw !== "string" ||
    !personUuidRaw.trim()
  ) {
    return null;
  }
  const seqtaPersonUuid = personUuidRaw.trim().toLowerCase();
  const seqtaAccountType = login?.type?.trim();
  const normalizedAccountType =
    seqtaAccountType && seqtaAccountType.length <= 64 ? seqtaAccountType : undefined;

  const digest = await sha256Hex(
    buildIdentityBindingCanonical({
      version: 1,
      instanceHost,
      seqtaStudentId,
      seqtaPersonUuid,
      cloudUserId,
      seqtaAccountType: normalizedAccountType,
    }),
  );

  return {
    instance_host: instanceHost,
    seqta_student_id: seqtaStudentId,
    seqta_person_uuid: seqtaPersonUuid,
    identity_binding_digest: digest,
    identity_binding_version: 1,
    ...(normalizedAccountType ? { seqta_account_type: normalizedAccountType } : {}),
  };
}

/** SEQTA session + cloud user binding for opt-in (server recomputes digest). */
export async function optInIdentityDigest(
  instanceHost: string,
  cloudUserId: string,
): Promise<OptInBindingBody | null> {
  const fields = await bindingFieldsFromSession(instanceHost, cloudUserId);
  if (!fields) return null;
  return {
    ...fields,
    attested_at: new Date().toISOString(),
  };
}

/** Same binding proof as opt-in, for heartbeat (no attested_at). */
export async function heartbeatIdentityFields(
  instanceHost: string,
  cloudUserId: string,
): Promise<TimetableClassmatesBindingFields | null> {
  return bindingFieldsFromSession(instanceHost, cloudUserId);
}
