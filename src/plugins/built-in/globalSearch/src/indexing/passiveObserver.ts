import type { IndexItem } from "./types";
import { put, getAll } from "./db";
import {
  buildIndexItem,
  extractTextFromValue,
  pickId,
  pickTitle,
} from "./extract";
import { isSensitiveSeqtaPath, normalizeSeqtaPath } from "./api";
import { loadAllStoredItems } from "./indexer";
import { loadDynamicItems } from "../utils/dynamicItems";
import { renderComponentMap } from "./renderComponents";
import { jobs } from "./jobs";

/**
 * Passive network observer.
 *
 * Wraps the page's `fetch` (and best-effort `XMLHttpRequest`) so that any
 * successful same-origin SEQTA JSON response observed while the user
 * browses is opportunistically distilled into IndexItems and persisted to
 * the `passive` object store.
 *
 * Hard guarantees:
 *  - Only same-origin requests under `/seqta/student/` are considered.
 *  - The shared sensitive-route denylist (login, save/*, settings, prefs,
 *    heartbeat, branding, themes, file streams, masquerade, ...) is checked
 *    before any persistence.
 *  - Response bodies are read via `Response.clone()` so we never consume the
 *    body the host page intends to use.
 *  - Sensitive keys/values are stripped via `redactSensitive` before the
 *    item is stored.
 *  - Binary file contents are never indexed (we only work on JSON responses
 *    served as `text/json` / `application/json`).
 */

const STORE_ID = "passive";
const FLUSH_DEBOUNCE_MS = 1500;
const MAX_ITEMS_PER_RESPONSE = 50;
const MAX_PER_RESPONSE_TEXT_CHARS = 1500;

let installed = false;
let pendingFlush: ReturnType<typeof setTimeout> | null = null;
let pendingDirty = false;

export function isPassiveObserverInstalled(): boolean {
  return installed;
}

/* ------------------------------------------------------------------ */
/*                          eligibility checks                        */
/* ------------------------------------------------------------------ */

function isSameOriginSeqtaUrl(url: string): boolean {
  try {
    const parsed = new URL(url, location.origin);
    if (parsed.origin !== location.origin) return false;
    return parsed.pathname.startsWith("/seqta/student/");
  } catch {
    return false;
  }
}

function looksLikeJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return /json/i.test(contentType);
}

/* ------------------------------------------------------------------ */
/*                        item synthesis                              */
/* ------------------------------------------------------------------ */

interface CapturedContext {
  route: string;
  requestBody: unknown;
  observedAt: number;
}

function categoryFromRoute(route: string): string {
  // /seqta/student/load/courses -> courses
  // /seqta/student/load/message -> message
  const tail = route.replace(/^\/seqta\/student\//, "").split("/").filter(Boolean);
  if (tail.length === 0) return "passive";
  // message/people is a support endpoint that backs the messages compose UI.
  // We treat it as a low-priority `messages-support` record rather than a
  // standalone "people" category so it never competes with real assessments
  // / messages in the result list.
  if (route.includes("/load/message/people")) return "messages-support";
  return tail[tail.length - 1].toLowerCase();
}

/**
 * `/seqta/student/load/message/people` returns the contact picker dataset
 * used by the messages compose view. We only want to surface entries that
 * actually carry a human display name — the rest is structural noise that
 * historically caused raw API paths to appear as titles.
 */
function isPeopleEntityWorthIndexing(entity: unknown): boolean {
  if (!entity || typeof entity !== "object") return false;
  const obj = entity as Record<string, unknown>;
  const first = stringField(obj, [
    "preferredName",
    "preferred",
    "firstname",
    "firstName",
    "first_name",
    "given",
    "givenName",
  ]);
  const last = stringField(obj, [
    "surname",
    "lastname",
    "lastName",
    "last_name",
    "familyName",
  ]);
  const display = stringField(obj, ["displayName", "name", "fullName"]);
  return Boolean((first && last) || display);
}

function sourcePageForRoute(route: string): string | undefined {
  if (route.includes("/load/message/people")) return "/messages";
  if (route.includes("/load/message")) return "/messages";
  if (route.includes("/load/messages")) return "/messages";
  if (route.includes("/load/courses")) return "/courses";
  if (route.includes("/load/assessments")) return "/assessments/upcoming";
  if (route.includes("/load/notices")) return "/notices";
  if (route.includes("/load/documents")) return "/documents";
  if (route.includes("/folio")) return "/folios/read";
  if (route.includes("/load/forums")) return "/forums";
  if (route.includes("/load/goals")) return "/goals";
  if (route.includes("/load/reports")) return "/reports";
  if (route.includes("/load/portals")) return "/dashboard";
  return undefined;
}

function entitiesFromPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    // SEQTA frequently nests arrays as `payload.list`, `.messages`,
    // `.items`, `.tasks`, etc. Pull the first array-shaped child as our
    // best guess; if none exists, fall back to the object itself so we
    // still index a single entry.
    for (const key of [
      "list",
      "items",
      "messages",
      "tasks",
      "pending",
      "forums",
      "docs",
    ]) {
      const value = obj[key];
      if (Array.isArray(value)) return value;
    }
    return [payload];
  }
  return [];
}

/**
 * Whitelist of entity-shaped fields we hoist into item metadata so the
 * `passive` action handler can deep-link into the right SEQTA SPA route.
 * These mirror what the active jobs already store (see `courses.ts`,
 * `portals.ts`, etc.) so the action only has to consult one source.
 */
const DEEP_LINK_FIELDS = [
  "programme",
  "programmeId",
  "programmeID",
  "metaclass",
  "metaclassId",
  "metaclassID",
  "year",
  "uuid",
  "portalUuid",
  "forum",
  "forumId",
  "assessmentId",
  "assessmentID",
  "messageId",
] as const;

function pickDeepLinkHints(
  entity: unknown,
): Record<string, string | number> {
  if (!entity || typeof entity !== "object") return {};
  const src = entity as Record<string, unknown>;
  const out: Record<string, string | number> = {};
  for (const key of DEEP_LINK_FIELDS) {
    const value = src[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    } else if (typeof value === "string" && value) {
      out[key] = value;
    }
  }
  return out;
}

function stringField(
  entity: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = entity[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function titleFromEndpoint(
  route: string,
  entity: unknown,
  extractedContent: string,
  fallback: string,
): string {
  if (route.includes("/load/message/people") && entity && typeof entity === "object") {
    const obj = entity as Record<string, unknown>;
    const first = stringField(obj, [
      "preferredName",
      "preferred",
      "firstname",
      "firstName",
      "first_name",
      "given",
      "givenName",
    ]);
    const last = stringField(obj, [
      "surname",
      "lastname",
      "lastName",
      "last_name",
      "familyName",
    ]);
    const full = [first, last].filter(Boolean).join(" ").trim();
    if (full) return full.slice(0, 200);
  }

  const picked = pickTitle(entity, "");
  if (picked) return picked.slice(0, 200);

  // Last resort: show a human-readable content preview instead of a raw API
  // path like `/seqta/student/load/message/people#20`.
  const firstLine = extractedContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return (firstLine || fallback).slice(0, 200);
}

function synthesizeItems(
  ctx: CapturedContext,
  payload: unknown,
): IndexItem[] {
  const entities = entitiesFromPayload(payload);
  if (entities.length === 0) return [];

  const category = categoryFromRoute(ctx.route);
  const now = ctx.observedAt;
  const out: IndexItem[] = [];

  const isPeopleSupport = ctx.route.includes("/load/message/people");

  const limit = Math.min(entities.length, MAX_ITEMS_PER_RESPONSE);
  for (let i = 0; i < limit; i++) {
    const entity = entities[i];
    if (!entity || (typeof entity !== "object" && typeof entity !== "string")) {
      continue;
    }

    // For the messages compose-people endpoint, skip records that don't
    // carry a real human name. We never want raw entries like
    // `/seqta/student/load/message/people#20` becoming titles, and we
    // explicitly route the rest to /messages so they're treated as support
    // records, not standalone "people" results.
    if (isPeopleSupport && !isPeopleEntityWorthIndexing(entity)) {
      continue;
    }

    const fallbackId = `${ctx.route}#${i}`;
    const entityId = pickId(entity, fallbackId);
    const stableId = `passive-${ctx.route.replace(/\//g, "_")}-${entityId}`;

    const content = extractTextFromValue(entity, {
      maxChars: MAX_PER_RESPONSE_TEXT_CHARS,
    });
    const title = titleFromEndpoint(ctx.route, entity, content, fallbackId);
    if (!content && (!title || title === fallbackId)) {
      // Skip records that produced neither title nor content; they are
      // structurally noise (e.g. tiny acknowledgement payloads).
      continue;
    }

    const deepLinkHints = pickDeepLinkHints(entity);
    const sourcePage = sourcePageForRoute(ctx.route);

    out.push(
      buildIndexItem({
        id: stableId,
        text: title,
        category,
        contentOverride: content,
        metadata: {
          route: ctx.route,
          source: "passive",
          observedAt: new Date(now).toISOString(),
          entityType: category,
          entityId,
          icon: "\ueb71",
          sourcePage,
          // Mark message/people as a low-priority support record so the
          // search ranker can deprioritize it relative to real messages,
          // assessments, courses, etc.
          ...(isPeopleSupport ? { supportRecord: true, priority: "low" } : {}),
          ...deepLinkHints,
        },
        actionId: "passive",
        renderComponentId: "passive",
        dateAdded: now,
      }),
    );
  }

  return out;
}

/* ------------------------------------------------------------------ */
/*                          persistence                               */
/* ------------------------------------------------------------------ */

async function persistItems(items: IndexItem[]): Promise<void> {
  if (items.length === 0) return;

  // Dedupe against existing entries. We replace on collision so the latest
  // observation wins (e.g. if a message changes title).
  for (const item of items) {
    try {
      await put(STORE_ID, item, item.id);
    } catch (e) {
      console.warn(
        `[Passive Observer] Failed to persist item ${item.id}:`,
        e,
      );
    }
  }

  pendingDirty = true;
  scheduleFlush();
}

function scheduleFlush() {
  if (pendingFlush) return;
  pendingFlush = setTimeout(() => {
    pendingFlush = null;
    if (!pendingDirty) return;
    pendingDirty = false;
    void flushDynamicItems();
  }, FLUSH_DEBOUNCE_MS);
}

async function flushDynamicItems(): Promise<void> {
  try {
    const all = await loadAllStoredItems();
    const decorated = all.map((item) => {
      try {
        const jobDef =
          jobs[item.category] ||
          Object.values(jobs).find((j) => j.id === item.category) ||
          jobs[item.renderComponentId];
        let renderComponent = item.renderComponent;
        if (jobDef) {
          renderComponent =
            renderComponentMap[jobDef.renderComponentId] || renderComponent;
        } else if (renderComponentMap[item.renderComponentId]) {
          renderComponent = renderComponentMap[item.renderComponentId];
        }
        try {
          const cloned = JSON.parse(JSON.stringify(item));
          cloned.renderComponent = renderComponent;
          return cloned;
        } catch {
          return { ...item, renderComponent };
        }
      } catch {
        return item;
      }
    });
    loadDynamicItems(decorated);
    window.dispatchEvent(
      new CustomEvent("dynamic-items-updated", {
        detail: {
          incremental: true,
          jobId: STORE_ID,
          streaming: false,
        },
      }),
    );
  } catch (e) {
    console.warn("[Passive Observer] Failed to refresh dynamic items:", e);
  }
}

/* ------------------------------------------------------------------ */
/*                          fetch hook                                */
/* ------------------------------------------------------------------ */

async function consumeResponse(
  response: Response,
  url: string,
  requestBody: unknown,
): Promise<void> {
  if (!response.ok) return;

  const route = normalizeSeqtaPath(url);
  if (isSensitiveSeqtaPath(route)) return;

  const contentType = response.headers.get("content-type");
  if (!looksLikeJsonContentType(contentType)) return;

  let body: any;
  try {
    body = await response.clone().json();
  } catch {
    return;
  }

  if (!body || typeof body !== "object") return;
  if (body.status && body.status !== "200") return;

  const payload = body.payload;
  if (payload === undefined || payload === null) return;

  const items = synthesizeItems(
    {
      route,
      requestBody,
      observedAt: Date.now(),
    },
    payload,
  );

  if (items.length > 0) {
    await persistItems(items);
  }
}

function tryParseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Installs the passive observer once. Subsequent calls are no-ops.
 *
 * Designed to be called from the global-search plugin bootstrap after
 * `mountSearchBar` succeeds so the observer is only active when the
 * plugin itself is enabled.
 */
export function installPassiveObserver(): void {
  if (installed) return;
  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return;
  }
  installed = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const response = await originalFetch(input, init);

    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (isSameOriginSeqtaUrl(url)) {
        const body = init?.body;
        const parsed =
          body && typeof body === "string"
            ? tryParseJson(body)
            : undefined;
        // Fire-and-forget: never block the host page on indexing work.
        void consumeResponse(response, url, parsed);
      }
    } catch (e) {
      // Never let observer errors bubble up to the host page.
      console.debug("[Passive Observer] fetch hook error:", e);
    }

    return response;
  };

  // Best-effort XHR hook for the rare callers that bypass fetch.
  const ProtoXhr = (window as any).XMLHttpRequest?.prototype;
  if (ProtoXhr) {
    const originalOpen = ProtoXhr.open;
    const originalSend = ProtoXhr.send;
    ProtoXhr.open = function patchedOpen(
      this: XMLHttpRequest,
      method: string,
      url: string,
      ...rest: any[]
    ) {
      try {
        (this as any).__bsplusUrl = url;
        (this as any).__bsplusMethod = method;
      } catch {
        /* ignore */
      }
      return originalOpen.call(this, method, url, ...rest);
    };
    ProtoXhr.send = function patchedSend(
      this: XMLHttpRequest,
      body?: any,
    ) {
      try {
        const url = (this as any).__bsplusUrl as string | undefined;
        if (url && isSameOriginSeqtaUrl(url)) {
          const parsed =
            typeof body === "string" ? tryParseJson(body) : undefined;
          this.addEventListener("load", () => {
            try {
              if (this.status < 200 || this.status >= 300) return;
              const ct = this.getResponseHeader("content-type");
              if (!looksLikeJsonContentType(ct)) return;
              const route = normalizeSeqtaPath(url);
              if (isSensitiveSeqtaPath(route)) return;
              let json: any;
              try {
                json = JSON.parse(this.responseText);
              } catch {
                return;
              }
              if (!json || typeof json !== "object") return;
              if (json.status && json.status !== "200") return;
              const payload = json.payload;
              if (payload === undefined || payload === null) return;
              const items = synthesizeItems(
                {
                  route,
                  requestBody: parsed,
                  observedAt: Date.now(),
                },
                payload,
              );
              if (items.length > 0) {
                void persistItems(items);
              }
            } catch (e) {
              console.debug("[Passive Observer] xhr load error:", e);
            }
          });
        }
      } catch {
        /* ignore */
      }
      return originalSend.call(this, body);
    };
  }

  console.debug("[Passive Observer] Installed.");
}

/**
 * Returns currently-stored passive items. Mainly used for diagnostics from
 * `window.globalSearchDebug`.
 */
export async function getStoredPassiveItems(): Promise<IndexItem[]> {
  try {
    return (await getAll(STORE_ID)) as IndexItem[];
  } catch {
    return [];
  }
}
