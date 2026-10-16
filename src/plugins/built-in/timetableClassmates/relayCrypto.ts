import { classRosterKey, type ClassRef } from "./classKeys";
import { classBundlePlaintext } from "./relayPayload";

const IV_BYTES = 12;

function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function decodeBundleKey(bundleKeyB64: string): Uint8Array {
  const binary = atob(bundleKeyB64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

async function classAesKey(bundleKey: Uint8Array, classKey: string): Promise<CryptoKey> {
  const prefix = new TextEncoder().encode(`tq-v1:${classKey}`);
  const material = new Uint8Array(bundleKey.length + 1 + prefix.length);
  material.set(bundleKey, 0);
  material.set([0x7c], bundleKey.length);
  material.set(prefix, bundleKey.length + 1);
  const raw = await sha256(material);
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function compressUtf8(json: string): Promise<Uint8Array> {
  const input = new TextEncoder().encode(json);
  if (typeof CompressionStream === "undefined") return input;
  const stream = new Blob([input]).stream().pipeThrough(new CompressionStream("deflate"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function decompressUtf8(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === "undefined") {
    return new TextDecoder().decode(bytes);
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  const buf = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buf);
}

export type RelayWireBundle = {
  class_key: string;
  iv_b64: string;
  ct_b64: string;
};

export async function encryptClassBundle(
  bundleKey: Uint8Array,
  classKey: string,
  plaintext: Record<string, unknown>,
): Promise<RelayWireBundle> {
  const key = await classAesKey(bundleKey, classKey);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const compressed = await compressUtf8(JSON.stringify(plaintext));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, compressed),
  );
  return {
    class_key: classKey,
    iv_b64: base64FromBytes(iv),
    ct_b64: base64FromBytes(ct),
  };
}

export async function decryptClassBundle(
  bundleKey: Uint8Array,
  bundle: RelayWireBundle,
): Promise<Record<string, unknown> | null> {
  try {
    const key = await classAesKey(bundleKey, bundle.class_key);
    const iv = Uint8Array.from(atob(bundle.iv_b64), (c) => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(bundle.ct_b64), (c) => c.charCodeAt(0));
    const plain = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct),
    );
    const json = await decompressUtf8(plain);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function buildEncryptedBundlesForClasses(input: {
  bundleKey: Uint8Array;
  seqtaStudentId: number;
  personUuid: string;
  cloudUserId: string | null;
  classes: ClassRef[];
}): Promise<RelayWireBundle[]> {
  const seen = new Set<string>();
  const bundles: RelayWireBundle[] = [];
  for (const ref of input.classes) {
    const classKey = classRosterKey(ref);
    if (!classKey || seen.has(classKey)) continue;
    seen.add(classKey);
    const plaintext = classBundlePlaintext({
      seqtaStudentId: input.seqtaStudentId,
      personUuid: input.personUuid,
      cloudUserId: input.cloudUserId,
      classRef: ref,
    });
    bundles.push(await encryptClassBundle(input.bundleKey, classKey, plaintext));
  }
  return bundles;
}
