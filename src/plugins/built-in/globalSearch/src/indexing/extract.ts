import { htmlToPlainText } from "./utils";
import type { IndexItem } from "./types";

/**
 * Safe extraction helpers used by both active SEQTA jobs and the passive
 * network observer.
 *
 * The goal is to take arbitrary SEQTA JSON / embedded HTML fragments and
 * derive concise, redacted, search-friendly text without ever indexing
 * obvious credentials, tokens, JWTs, or large binary blobs.
 */

/* ------------------------------------------------------------------ */
/*                          sensitive keys                            */
/* ------------------------------------------------------------------ */

/**
 * Field names whose values should never be indexed regardless of context.
 * Matches SEQTA's frequently-used credential / config keys plus generic
 * security-related names. Comparison is case-insensitive and matches both
 * the full key and any sub-string fragments (so `client_secret`,
 * `apiKey`, `dropboxKey` all hit).
 */
const SENSITIVE_KEY_FRAGMENTS: readonly string[] = [
  "password",
  "passwd",
  "pwd",
  "secret",
  "token",
  "jwt",
  "session",
  "cookie",
  "auth",
  "apikey",
  "api_key",
  "clientid",
  "client_id",
  "clientsecret",
  "client_secret",
  "credential",
  "private",
  "salt",
  "hash",
  "csrf",
  "x-api",
  "bearer",
  "dropbox",
  "oauth",
  "signature",
];

export function isSensitiveKey(key: string): boolean {
  if (!key) return false;
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((frag) => lower.includes(frag));
}

/**
 * Returns true if the supplied scalar value looks credential-shaped: a long
 * hex/base64-like blob that doesn't decode to readable text. This catches
 * arbitrary tokens that don't have a clear field-name signal.
 */
export function looksLikeSecretValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < 32) return false;

  // Long contiguous base64 / hex with no whitespace and no humanish punctuation.
  if (/\s/.test(trimmed)) return false;
  if (/^[A-Za-z0-9+/=._-]{32,}$/.test(trimmed) && !/[.,!?]/.test(trimmed)) {
    // Reject obvious URLs and UUIDs (they're useful and not secret).
    if (/^https?:\/\//i.test(trimmed)) return false;
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmed,
      )
    ) {
      return false;
    }
    return true;
  }

  // JWT detection: three base64url segments separated by dots.
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) {
    return true;
  }

  return false;
}

/* ------------------------------------------------------------------ */
/*                          text extraction                           */
/* ------------------------------------------------------------------ */

/**
 * Recursively pulls human-readable text out of an arbitrary JSON value.
 *
 * - HTML strings are passed through `htmlToPlainText`.
 * - Sensitive keys and secret-shaped values are skipped.
 * - Long blobs are truncated to keep the index lean.
 * - Arrays and objects are walked; depth is bounded to avoid pathological
 *   structures.
 */
export interface ExtractTextOptions {
  /** Hard cap on combined characters across the walk (default 4000). */
  maxChars?: number;
  /** Maximum recursion depth (default 6). */
  maxDepth?: number;
  /** Maximum array length to traverse (default 200). */
  maxArrayItems?: number;
  /** Skip individual string values longer than this (default 8000). */
  maxStringLength?: number;
}

const DEFAULT_EXTRACT_OPTIONS: Required<ExtractTextOptions> = {
  maxChars: 4000,
  maxDepth: 6,
  maxArrayItems: 200,
  maxStringLength: 8000,
};

export function extractTextFromValue(
  value: unknown,
  options: ExtractTextOptions = {},
): string {
  const opts = { ...DEFAULT_EXTRACT_OPTIONS, ...options };
  const parts: string[] = [];
  let remaining = opts.maxChars;

  const push = (text: string) => {
    if (!text || remaining <= 0) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const slice = trimmed.length > remaining ? trimmed.slice(0, remaining) : trimmed;
    parts.push(slice);
    remaining -= slice.length + 1;
  };

  const walk = (node: unknown, depth: number, parentKey: string | null) => {
    if (remaining <= 0) return;
    if (node === null || node === undefined) return;
    if (parentKey && isSensitiveKey(parentKey)) return;

    if (typeof node === "string") {
      if (node.length > opts.maxStringLength) return;
      if (looksLikeSecretValue(node)) return;
      if (node.includes("<") && node.includes(">")) {
        push(htmlToPlainText(node));
      } else {
        push(node);
      }
      return;
    }

    if (typeof node === "number" || typeof node === "boolean") {
      // Numbers/booleans rarely contribute to search recall; skip to keep
      // the index focused on text.
      return;
    }

    if (depth >= opts.maxDepth) return;

    if (Array.isArray(node)) {
      const limit = Math.min(node.length, opts.maxArrayItems);
      for (let i = 0; i < limit; i++) {
        walk(node[i], depth + 1, parentKey);
        if (remaining <= 0) return;
      }
      return;
    }

    if (typeof node === "object") {
      for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
        if (remaining <= 0) return;
        if (isSensitiveKey(key)) continue;
        walk(child, depth + 1, key);
      }
    }
  };

  walk(value, 0, null);

  return parts.join("\n").trim();
}

/* ------------------------------------------------------------------ */
/*                         redacted clones                            */
/* ------------------------------------------------------------------ */

/**
 * Returns a deep clone of `value` with sensitive keys/values stripped. The
 * passive observer uses this when persisting metadata so we never store
 * raw tokens or settings blobs in IndexedDB.
 */
export function redactSensitive<T>(value: T, depth = 0): T {
  if (value === null || value === undefined) return value;
  if (depth >= 8) return value;

  if (Array.isArray(value)) {
    return value
      .slice(0, 200)
      .map((v) => redactSensitive(v, depth + 1)) as unknown as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(key)) continue;
      if (typeof child === "string" && looksLikeSecretValue(child)) continue;
      out[key] = redactSensitive(child, depth + 1);
    }
    return out as T;
  }
  if (typeof value === "string" && looksLikeSecretValue(value)) {
    return "" as unknown as T;
  }
  return value;
}

/* ------------------------------------------------------------------ */
/*                       title / id heuristics                        */
/* ------------------------------------------------------------------ */

const TITLE_KEYS = [
  "title",
  "subject",
  "name",
  "label",
  "heading",
  "displayName",
  "filename",
  "code",
];

const ID_KEYS = ["id", "uuid", "messageID", "assessmentID", "notificationID"];

/**
 * Best-effort title extraction: returns the first sensible string-valued
 * field commonly used by SEQTA payloads. Falls back to an empty string when
 * none are present.
 */
export function pickTitle(node: unknown, fallback = ""): string {
  if (!node || typeof node !== "object") return fallback;
  const obj = node as Record<string, unknown>;
  for (const key of TITLE_KEYS) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return fallback;
}

export function pickId(node: unknown, fallback = ""): string {
  if (!node || typeof node !== "object") return fallback;
  const obj = node as Record<string, unknown>;
  for (const key of ID_KEYS) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/*                         IndexItem builders                         */
/* ------------------------------------------------------------------ */

/**
 * Constructs an `IndexItem` from a raw entity, applying our standard
 * extraction rules. Callers fill in the things that need domain knowledge
 * (`category`, `actionId`, `metadata`, deep-link route hints) and we handle
 * the boring text + redaction work.
 */
export function buildIndexItem(input: {
  id: string;
  text: string;
  category: string;
  rawForContent?: unknown;
  contentOverride?: string;
  metadata?: Record<string, unknown>;
  actionId: string;
  renderComponentId: string;
  dateAdded?: number;
  contentMaxChars?: number;
}): IndexItem {
  const content =
    input.contentOverride !== undefined
      ? input.contentOverride
      : extractTextFromValue(input.rawForContent, {
          maxChars: input.contentMaxChars ?? 1500,
        });

  const metadata = input.metadata ? redactSensitive(input.metadata) : {};

  return {
    id: input.id,
    text: input.text,
    category: input.category,
    content,
    dateAdded: input.dateAdded ?? Date.now(),
    metadata,
    actionId: input.actionId,
    renderComponentId: input.renderComponentId,
  };
}
