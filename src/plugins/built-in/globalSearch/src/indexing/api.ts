import { delay } from "@/seqta/utils/delay";

/**
 * Shared SEQTA HTTP layer used by every indexing job.
 *
 * - All requests are same-origin POSTs against `/seqta/student/...` with
 *   `credentials: "include"` so they inherit the user's existing session.
 * - Responses are parsed as JSON and lightly validated (status === "200" and
 *   payload present, mirroring the SEQTA convention).
 * - Failures are retried with exponential backoff up to a configurable limit.
 * - A simple per-route concurrency / spacing limiter prevents heavy jobs (e.g.
 *   per-subject course crawls) from hammering SEQTA.
 */

export interface SeqtaResponse<T = any> {
  payload: T;
  status: string;
}

export interface SeqtaFetchOptions {
  /** Defaults to "POST". */
  method?: "POST" | "GET";
  /** Maximum number of retries for transient failures (default 2). */
  retries?: number;
  /** Initial backoff delay in ms (default 200). */
  baseDelayMs?: number;
  /** Hard cap on total request time in ms (default 20s). */
  timeoutMs?: number;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
  /** Skip the routing limiter (rare; only for already-throttled callers). */
  skipLimiter?: boolean;
}

const DEFAULT_RETRIES = 2;
const DEFAULT_BASE_DELAY = 200;
const DEFAULT_TIMEOUT = 20_000;

/* ------------------------------------------------------------------ */
/*                              limiter                               */
/* ------------------------------------------------------------------ */

/**
 * Caps concurrent in-flight requests per normalized SEQTA route. Indexing
 * jobs often fan out (e.g. one /load/courses per subject); we don't want them
 * sending dozens of requests in parallel.
 */
class RouteLimiter {
  private inFlight = new Map<string, number>();
  private waiters = new Map<string, Array<() => void>>();
  private readonly maxConcurrent: number;

  constructor(maxConcurrent = 4) {
    this.maxConcurrent = maxConcurrent;
  }

  async acquire(route: string): Promise<() => void> {
    const current = this.inFlight.get(route) ?? 0;
    if (current < this.maxConcurrent) {
      this.inFlight.set(route, current + 1);
      return () => this.release(route);
    }

    return new Promise((resolve) => {
      const queue = this.waiters.get(route) ?? [];
      queue.push(() => {
        this.inFlight.set(route, (this.inFlight.get(route) ?? 0) + 1);
        resolve(() => this.release(route));
      });
      this.waiters.set(route, queue);
    });
  }

  private release(route: string) {
    const next = (this.inFlight.get(route) ?? 1) - 1;
    if (next <= 0) {
      this.inFlight.delete(route);
    } else {
      this.inFlight.set(route, next);
    }
    const queue = this.waiters.get(route);
    if (queue && queue.length > 0) {
      const wake = queue.shift()!;
      if (queue.length === 0) this.waiters.delete(route);
      wake();
    }
  }
}

const routeLimiter = new RouteLimiter(4);

/* ------------------------------------------------------------------ */
/*                       route normalization                          */
/* ------------------------------------------------------------------ */

/**
 * Strips the volatile anti-replay query token (e.g. `?mokx3qef`) so we can
 * key caches and limiters off the canonical route.
 */
export function normalizeSeqtaPath(url: string): string {
  try {
    const parsed = new URL(url, location.origin);
    // SEQTA appends a single random query token like `?mokx3qef`. Drop the
    // entire query string so canonicalization is robust.
    return parsed.pathname;
  } catch {
    // Fallback for already-relative URLs.
    return url.split("?")[0];
  }
}

/* ------------------------------------------------------------------ */
/*                           sensitive routes                         */
/* ------------------------------------------------------------------ */

/**
 * Routes whose responses must never be indexed because they contain
 * credentials, secrets, JWTs, or arbitrary configuration blobs.
 */
const SENSITIVE_PATH_PATTERNS: RegExp[] = [
  /\/seqta\/student\/login(\b|\/)/i,
  /\/seqta\/student\/save\//i,
  /\/seqta\/student\/load\/settings(\b|\/)/i,
  /\/seqta\/student\/load\/prefs(\b|\/)/i,
  /\/seqta\/student\/heartbeat(\b|\/)/i,
  /\/seqta\/student\/storage(\b|\/)/i,
  /\/seqta\/student\/themes\//i,
  /\/seqta\/student\/branding\//i,
  /\/seqta\/student\/releasealert\//i,
  /\/seqta\/student\/files\/stream(\b|\/)/i,
  /\/seqta\/student\/load\/file(\b|\/)/i,
  /\/seqta\/ta\/masquerade(\b|\/)/i,
];

export function isSensitiveSeqtaPath(path: string): boolean {
  const normalized = normalizeSeqtaPath(path);
  return SENSITIVE_PATH_PATTERNS.some((re) => re.test(normalized));
}

/* ------------------------------------------------------------------ */
/*                     student / user identity                        */
/* ------------------------------------------------------------------ */

interface SeqtaUserInfo {
  id?: number;
  personUUID?: string;
  username?: string;
  [key: string]: unknown;
}

let cachedUserInfo: SeqtaUserInfo | null = null;
let inflightUserInfo: Promise<SeqtaUserInfo | null> | null = null;

/**
 * Resolves the current SEQTA user identity by re-using the same `login`
 * handshake that the host page performs. This is the canonical way to
 * discover the active student id and avoids the historical hard-coded
 * `student: 69` placeholder that was incorrect on every real instance.
 *
 * Failures are intentionally NOT cached — a transient login glitch on the
 * very first call must not poison the cache for the lifetime of the page,
 * because every subsequent indexing pass that needs the student id (e.g.
 * the assignments job) would skip silently.
 */
export async function getCurrentUserInfo(): Promise<SeqtaUserInfo | null> {
  if (cachedUserInfo) return cachedUserInfo;
  if (inflightUserInfo) return inflightUserInfo;

  inflightUserInfo = (async () => {
    try {
      const res = await fetch(`${location.origin}/seqta/student/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          mode: "normal",
          query: null,
          redirect_url: location.origin,
        }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { payload?: SeqtaUserInfo };
      const payload = json?.payload ?? null;
      if (payload && typeof payload === "object") {
        cachedUserInfo = payload;
        return payload;
      }
      return null;
    } catch (e) {
      console.warn(
        "[Global Search API] Failed to resolve current user info:",
        e,
      );
      return null;
    } finally {
      inflightUserInfo = null;
    }
  })();

  return inflightUserInfo;
}

/**
 * Best-effort lookup of the active student id. Returns `undefined` when the
 * value cannot be discovered (jobs should fall back gracefully rather than
 * fabricating an id).
 */
export async function getCurrentStudentId(): Promise<number | undefined> {
  const info = await getCurrentUserInfo();
  const id = info?.id;
  if (typeof id === "number" && Number.isFinite(id)) return id;
  return undefined;
}

/* ------------------------------------------------------------------ */
/*                            core fetch                              */
/* ------------------------------------------------------------------ */

class SeqtaApiError extends Error {
  status: number;
  route: string;
  constructor(message: string, status: number, route: string) {
    super(message);
    this.name = "SeqtaApiError";
    this.status = status;
    this.route = route;
  }
}

function isTransientError(err: unknown): boolean {
  if (err instanceof SeqtaApiError) {
    if (err.status === 0 || err.status >= 500) return true;
    if (err.status === 429) return true;
    return false;
  }
  if (err instanceof TypeError) return true;
  if ((err as any)?.name === "AbortError") return false;
  return true;
}

/**
 * Sends a JSON POST against a SEQTA route and returns the parsed envelope.
 *
 * - Adds `credentials: "include"` so requests reuse the active session.
 * - Sets `X-Requested-With: XMLHttpRequest` so SEQTA classifies the request
 *   the same way as the first-party SPA (some routes 4xx without it).
 * - Retries transient network/server errors with exponential backoff.
 * - Validates that the response is JSON and has `status === "200"` (matches
 *   the SEQTA convention; jobs that need raw payloads can pass `path` but
 *   call `seqtaFetch` directly via the underlying API if they need to).
 */
export async function seqtaFetchJson<T = any>(
  path: string,
  body: Record<string, unknown> | undefined = {},
  options: SeqtaFetchOptions = {},
): Promise<SeqtaResponse<T>> {
  const route = normalizeSeqtaPath(path);
  const retries = Math.max(0, options.retries ?? DEFAULT_RETRIES);
  const baseDelay = Math.max(50, options.baseDelayMs ?? DEFAULT_BASE_DELAY);
  const timeoutMs = Math.max(1_000, options.timeoutMs ?? DEFAULT_TIMEOUT);

  let release: (() => void) | null = null;
  if (!options.skipLimiter) {
    release = await routeLimiter.acquire(route);
  }

  try {
    let attempt = 0;
    let lastError: unknown = null;

    while (attempt <= retries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const onAbort = () => controller.abort();
      if (options.signal) {
        if (options.signal.aborted) controller.abort();
        else options.signal.addEventListener("abort", onAbort, { once: true });
      }

      try {
        const res = await fetch(`${location.origin}${route}`, {
          method: options.method ?? "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "X-Requested-With": "XMLHttpRequest",
            Accept: "text/javascript, text/html, application/xml, text/xml, */*",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new SeqtaApiError(
            `HTTP ${res.status} ${res.statusText} for ${route}`,
            res.status,
            route,
          );
        }

        const rawJson = (await res.json()) as unknown;
        if (!rawJson || typeof rawJson !== "object") {
          throw new SeqtaApiError(
            `Invalid SEQTA response (not a JSON object) for ${route}`,
            res.status,
            route,
          );
        }

        // SEQTA's "envelope" convention is `{ status, payload }`, but in
        // practice some endpoints — notably `/seqta/student/load/subjects`
        // and `/seqta/student/assessment/list/*` — occasionally return
        // either a bare array or an envelope with a non-"200" status.
        // Strict validation here was historically silently killing the
        // assignments + courses indexing pipelines when those endpoints
        // returned a quirky shape, so we normalize permissively and let
        // callers handle missing/empty payloads.
        let json: SeqtaResponse<T>;
        if (Array.isArray(rawJson)) {
          json = { payload: rawJson as unknown as T, status: "200" };
        } else {
          const obj = rawJson as Record<string, unknown>;
          const hasEnvelopeKey = "payload" in obj || "status" in obj;
          if (hasEnvelopeKey) {
            json = {
              payload: ("payload" in obj ? obj.payload : undefined) as T,
              status:
                typeof obj.status === "string"
                  ? obj.status
                  : typeof obj.status === "number"
                    ? String(obj.status)
                    : "200",
            };
          } else {
            json = { payload: rawJson as unknown as T, status: "200" };
          }
        }

        if (json.status && json.status !== "200") {
          console.warn(
            `[Global Search API] Non-200 SEQTA status "${json.status}" for ${route} — returning payload anyway`,
          );
        }

        return json;
      } catch (err) {
        lastError = err;
        if (!isTransientError(err) || attempt === retries) {
          throw err;
        }
        const wait = Math.min(5_000, baseDelay * Math.pow(2, attempt));
        await delay(wait);
        attempt++;
      } finally {
        clearTimeout(timer);
        if (options.signal) options.signal.removeEventListener("abort", onAbort);
      }
    }

    throw lastError ?? new Error(`seqtaFetchJson exhausted retries for ${route}`);
  } finally {
    if (release) release();
  }
}

/**
 * Convenience helper: fetch and unwrap `.payload` directly. Returns `null`
 * on failure rather than throwing, so jobs can use the value optionally.
 */
export async function seqtaFetchPayload<T = any>(
  path: string,
  body: Record<string, unknown> | undefined = {},
  options: SeqtaFetchOptions = {},
): Promise<T | null> {
  try {
    const res = await seqtaFetchJson<T>(path, body, options);
    return res.payload ?? null;
  } catch (e) {
    console.warn(
      `[Global Search API] Request to ${normalizeSeqtaPath(path)} failed:`,
      e,
    );
    return null;
  }
}
