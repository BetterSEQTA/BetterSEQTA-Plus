import { waitForElm } from "@/seqta/utils/waitForElm";
import type { IndexItem } from "./types";
import ReactFiber from "@/seqta/utils/ReactFiber";
import { delay } from "@/seqta/utils/delay";

import { verboseLog } from "@/utils/verboseLog";
interface MessageMetadata {
  messageId: number;
  author: string;
  senderId: number;
  senderType: string;
  timestamp: string;
  hasAttachments: boolean;
  attachmentCount: number;
  read: boolean;
}

interface AssessmentMetadata {
  assessmentId?: number;
  messageId?: number;
  subject?: string;
  term?: string;
  programmeId?: number;
  metaclassId?: number;
  timestamp: string;
  isMessageBased?: boolean;
  author?: string;
}

type ActionHandler<T extends Record<string, unknown> = Record<string, unknown>> = (
  item: IndexItem & { metadata: T },
) => void;

/**
 * Navigate to a SEQTA SPA hash route in the most reliable way available.
 *
 * Setting `location.hash` works when the destination module is already
 * registered with SEQTA's hashchange router (as is the case for the
 * existing `message`/`assessment` actions, which then poke at the live
 * DOM). For navigations that switch to a module the SPA may not have
 * loaded yet (courses, forums, folios, portals, documents, reports,
 * goals, notices, ...) we instead assign through `location.href` against
 * the canonical `${origin}/` base. The path stays `/`, so the browser
 * still treats this as a hash-only change in practice — but if anything
 * went sideways with the path, we get a clean reload that bootstraps the
 * SPA fresh, which is far less surprising than a blank screen.
 */
function navigateToHashRoute(routeWithLeadingSlash: string): void {
  const target = `${location.origin}/#?page=${routeWithLeadingSlash}`;
  window.location.href = target;
}

function navigateInCurrentSeqtaApp(routeWithLeadingSlash: string): void {
  window.location.hash = `#?page=${routeWithLeadingSlash}`;
}

/**
 * Final-fallback hub when an item has no usable deep-link metadata.
 *
 * `/dashboard` is the standard SEQTA Learn landing page and is the
 * destination the websiteskimmer recording captured for unknown routes.
 * `/home` is BetterSEQTA-Plus's custom replacement which only renders
 * after our content script has hooked the SPA — using it as a fallback
 * from a fresh nav can produce a blank frame.
 */
const FALLBACK_ROUTE = "/dashboard";

function cloneAssessmentActionItem(item: IndexItem & { metadata: AssessmentMetadata }): {
  itemClone: IndexItem & { metadata: AssessmentMetadata };
  metadata: AssessmentMetadata;
} {
  try {
    const itemClone = JSON.parse(JSON.stringify(item)) as IndexItem & {
      metadata: AssessmentMetadata;
    };
    return { itemClone, metadata: itemClone.metadata || {} };
  } catch (e) {
    console.warn(
      "[Assessment Action] Failed to clone item, trying to clone metadata separately:",
      e,
    );
    try {
      const metadata = JSON.parse(JSON.stringify(item.metadata || {})) as AssessmentMetadata;
      return { itemClone: { ...item, metadata }, metadata };
    } catch (e2) {
      console.warn("[Assessment Action] Failed to clone metadata, using direct access:", e2);
      const metadata = item.metadata || ({} as AssessmentMetadata);
      return { itemClone: item, metadata };
    }
  }
}

function createMetadataValueReader(metadata: AssessmentMetadata) {
  const bag = metadata as Record<string, unknown>;
  return (key: string, altKey?: string): unknown => {
    try {
      const value = bag[key];
      if (value !== undefined && value !== null) {
        return value;
      }
      if (altKey) {
        const altValue = bag[altKey];
        if (altValue !== undefined && altValue !== null) {
          return altValue;
        }
      }
      try {
        for (const k of Object.keys(bag)) {
          if (k === key || k === altKey) {
            const val = bag[k];
            if (val !== undefined && val !== null) {
              return val;
            }
          }
        }
      } catch {
        // Object.keys might fail on XrayWrapper, that's okay
      }
      return undefined;
    } catch (e) {
      console.warn(`[Assessment Action] Failed to access metadata.${key}:`, e);
      return undefined;
    }
  };
}

function coerceNumericMetadataId(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return value;
  const num = Number(value);
  return Number.isNaN(num) ? value : num;
}

async function runAssessmentSearchAction(item: IndexItem & { metadata: AssessmentMetadata }) {
  const { itemClone, metadata } = cloneAssessmentActionItem(item);
  const getMetadataValue = createMetadataValueReader(metadata);

  if (getMetadataValue("isMessageBased")) {
    window.location.hash = `#?page=/messages`;

    await waitForElm('[class*="Viewer__Viewer___"] > div', true, 20);

    ReactFiber.find('[class*="Viewer__Viewer___"] > div').setState({
      selected: new Set([getMetadataValue("messageId")]),
    });
    return;
  }

  let programmeId = getMetadataValue("programmeId", "programmeID");
  let metaclassId = getMetadataValue("metaclassId", "metaclassID");
  let assessmentId = getMetadataValue("assessmentId", "assessmentID");

  if (
    (assessmentId === undefined || assessmentId === null) &&
    itemClone.id?.startsWith("assignment-")
  ) {
    const extractedId = itemClone.id.replace("assignment-", "");
    assessmentId = Number(extractedId) || extractedId;
    verboseLog("[Assessment Action] Extracted assessmentId from item ID:", assessmentId);
  }

  programmeId = coerceNumericMetadataId(programmeId);
  metaclassId = coerceNumericMetadataId(metaclassId);
  assessmentId = coerceNumericMetadataId(assessmentId);

  const hasProgrammeId = typeof programmeId === "number";
  const hasMetaclassId = typeof metaclassId === "number";
  const hasAssessmentId = typeof assessmentId === "number";

  if (hasProgrammeId && hasMetaclassId && hasAssessmentId) {
    const url = `#?page=/assessments/${programmeId}:${metaclassId}&item=${assessmentId}`;
    verboseLog("[Assessment Action] ✅ Navigating to:", url);
    window.location.hash = url;
    return;
  }

  console.error("[Assessment Action] ❌ Missing required metadata:", {
    programmeId,
    metaclassId,
    assessmentId,
    hasProgrammeId,
    hasMetaclassId,
    hasAssessmentId,
    metadataKeys: Object.keys(metadata),
    metadataString: JSON.stringify(metadata),
    itemId: itemClone.id,
  });

  if (hasAssessmentId) {
    window.location.hash = `#?page=/assessments/upcoming&item=${assessmentId}`;
  } else {
    console.warn("[Assessment Action] No valid assessment ID, redirecting to upcoming");
    window.location.hash = `#?page=/assessments/upcoming`;
  }
}

type PassiveRouteContext = {
  route: string;
  sourcePage: string;
  tail: string;
  child: string;
  programme?: number;
  metaclass?: number;
  portalUuid?: string;
  forumId?: number;
  year?: number;
  assessmentId?: number;
};

function readPassiveMetadataNumber(md: Record<string, unknown>, key: string): number | undefined {
  const value = md[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function readPassiveMetadataString(md: Record<string, unknown>, key: string): string | undefined {
  const value = md[key];
  return typeof value === "string" && value ? value : undefined;
}

function parsePassiveRouteContext(item: IndexItem): PassiveRouteContext {
  const md = (item.metadata ?? {}) as Record<string, unknown>;
  const route = typeof md.route === "string" ? md.route : "";
  const sourcePage = typeof md.sourcePage === "string" ? md.sourcePage : "";
  const routeParts = route
    .replace(/^\/seqta\/student\/?/, "")
    .replace(/^load\//, "")
    .split("/")
    .filter(Boolean)
    .map((part) => part.toLowerCase());

  const num = (key: string) => readPassiveMetadataNumber(md, key);
  const str = (key: string) => readPassiveMetadataString(md, key);

  return {
    route,
    sourcePage,
    tail: routeParts[0] ?? "",
    child: routeParts[1] ?? "",
    programme: num("programme") ?? num("programmeId") ?? num("programmeID"),
    metaclass: num("metaclass") ?? num("metaclassId") ?? num("metaclassID"),
    portalUuid: str("portalUuid") ?? str("uuid"),
    forumId: num("forumId") ?? num("forum"),
    year: num("year"),
    assessmentId: num("assessmentId") ?? num("assessmentID") ?? num("entityId") ?? num("id"),
  };
}

function navigatePassiveAssessment(ctx: PassiveRouteContext): void {
  const { programme, metaclass, assessmentId } = ctx;
  if (programme !== undefined && metaclass !== undefined) {
    const itemSuffix = assessmentId !== undefined ? `&item=${assessmentId}` : "";
    navigateToHashRoute(`/assessments/${programme}:${metaclass}${itemSuffix}`);
    return;
  }
  if (assessmentId !== undefined) {
    navigateToHashRoute(`/assessments/upcoming&item=${assessmentId}`);
    return;
  }
  navigateToHashRoute("/assessments/upcoming");
}

type PassiveTailHandler = (ctx: PassiveRouteContext) => boolean;

function passiveTailCourses(ctx: PassiveRouteContext): boolean {
  const { programme, metaclass } = ctx;
  if (programme === undefined || metaclass === undefined) return false;
  navigateToHashRoute(`/courses/${programme}:${metaclass}`);
  return true;
}

function passiveTailForums(ctx: PassiveRouteContext): boolean {
  if (ctx.forumId === undefined) return false;
  navigateToHashRoute(`/forums/${ctx.forumId}`);
  return true;
}

function passiveTailPortals(ctx: PassiveRouteContext): boolean {
  if (!ctx.portalUuid) return false;
  navigateToHashRoute(`/portals/${ctx.portalUuid}`);
  return true;
}

function passiveTailGoals(ctx: PassiveRouteContext): boolean {
  navigateToHashRoute(ctx.year !== undefined ? `/goals/${ctx.year}` : "/goals");
  return true;
}

function passiveTailPeople(ctx: PassiveRouteContext): boolean {
  if (!ctx.route.includes("/load/message/people") && ctx.child !== "people") return false;
  navigateInCurrentSeqtaApp("/messages");
  return true;
}

const PASSIVE_TAIL_HANDLERS: Record<string, PassiveTailHandler> = {
  courses: passiveTailCourses,
  assessments: (ctx) => {
    navigatePassiveAssessment(ctx);
    return true;
  },
  assessment: (ctx) => {
    navigatePassiveAssessment(ctx);
    return true;
  },
  forums: passiveTailForums,
  forum: passiveTailForums,
  portals: passiveTailPortals,
  portal: passiveTailPortals,
  goals: passiveTailGoals,
  goal: passiveTailGoals,
  folio: () => {
    navigateToHashRoute("/folios/read");
    return true;
  },
  folios: () => {
    navigateToHashRoute("/folios/read");
    return true;
  },
  notices: () => {
    navigateToHashRoute("/notices");
    return true;
  },
  notice: () => {
    navigateToHashRoute("/notices");
    return true;
  },
  documents: () => {
    navigateToHashRoute("/documents");
    return true;
  },
  document: () => {
    navigateToHashRoute("/documents");
    return true;
  },
  reports: () => {
    navigateToHashRoute("/reports");
    return true;
  },
  report: () => {
    navigateToHashRoute("/reports");
    return true;
  },
  messages: () => {
    navigateInCurrentSeqtaApp("/messages");
    return true;
  },
  message: () => {
    navigateInCurrentSeqtaApp("/messages");
    return true;
  },
  people: passiveTailPeople,
  timetable: () => {
    navigateToHashRoute("/timetable");
    return true;
  },
};

function passiveRouteHandled(ctx: PassiveRouteContext): boolean {
  const handler = PASSIVE_TAIL_HANDLERS[ctx.tail];
  return handler ? handler(ctx) : false;
}

function runPassiveSearchAction(item: IndexItem): void {
  const ctx = parsePassiveRouteContext(item);

  if (ctx.sourcePage === "/messages") {
    navigateInCurrentSeqtaApp("/messages");
    return;
  }

  if (passiveRouteHandled(ctx)) {
    return;
  }

  navigateToHashRoute(FALLBACK_ROUTE);
}

export const actionMap: Record<string, ActionHandler<Record<string, unknown>>> = {
  message: (async (item: IndexItem & { metadata: MessageMetadata }) => {
    window.location.hash = `#?page=/messages`;

    await waitForElm('[class*="Viewer__Viewer___"] > div', true, 20);

    // Select the specific direct message
    ReactFiber.find('[class*="Viewer__Viewer___"] > div').setState({
      selected: new Set([item.metadata.messageId]),
    });

    // send a network request to mark as read
    fetch("/seqta/student/save/message", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({
        items: [item.metadata.messageId],
        mode: "x-read",
        read: true,
      }),
    });

    await delay(10);

    const button = document.querySelector('[class*="MessageList__selected___"]');
    if (button) {
      (button as HTMLElement).click();
    }
  }) as ActionHandler<Record<string, unknown>>,

  assessment: (async (item: IndexItem & { metadata: AssessmentMetadata }) => {
    await runAssessmentSearchAction(item);
  }) as ActionHandler<Record<string, unknown>>,

  subjectassessment: ((item: IndexItem) => {
    navigateToHashRoute(`/assessments/${item.metadata.programme}:${item.metadata.subjectId}`);
  }) as ActionHandler<Record<string, unknown>>,

  subjectcourse: ((item: IndexItem) => {
    navigateToHashRoute(`/courses/${item.metadata.programme}:${item.metadata.subjectId}`);
  }) as ActionHandler<Record<string, unknown>>,

  forum: ((item: IndexItem) => {
    navigateToHashRoute(`/forums/${item.metadata.forumId}`);
  }) as ActionHandler<Record<string, unknown>>,

  course: ((item: IndexItem) => {
    const programme = item.metadata?.programme;
    const metaclass = item.metadata?.metaclass ?? item.metadata?.subjectId;
    if (programme !== undefined && metaclass !== undefined) {
      navigateToHashRoute(`/courses/${programme}:${metaclass}`);
      return;
    }
    if (item.metadata?.route) {
      navigateToHashRoute(String(item.metadata.route));
      return;
    }
    navigateToHashRoute(FALLBACK_ROUTE);
  }) as ActionHandler<Record<string, unknown>>,

  notice: (() => {
    // SEQTA's notices route doesn't honour `&date=` from the hash, so just
    // open the listing.
    navigateToHashRoute("/notices");
  }) as ActionHandler<Record<string, unknown>>,

  document: (() => {
    // We don't trigger downloads automatically: opening the documents page
    // gives users full SEQTA controls (preview, download, share) without
    // needing the JWT-stamped streaming URL we deliberately avoid storing.
    navigateToHashRoute("/documents");
  }) as ActionHandler<Record<string, unknown>>,

  folio: (() => {
    // SEQTA's folio SPA does not expose a per-id route; the previous
    // `?page=/folios/read?id=N` shape contained a literal `?` inside the
    // `page` query value and was unmatchable, which sent users to the
    // dashboard. Always land on the read view and let the user pick.
    navigateToHashRoute("/folios/read");
  }) as ActionHandler<Record<string, unknown>>,

  portal: ((item: IndexItem) => {
    // SEQTA renders portals via the in-app viewer at `?page=/portals/<uuid>`
    // (verified via the websiteskimmer capture). Prefer that so SSO/headers
    // are preserved; only pop the external URL as a fallback if we don't
    // have a UUID; final fallback to the dashboard rather than blanking.
    const uuid = item.metadata?.portalUuid;
    if (typeof uuid === "string" && uuid) {
      navigateToHashRoute(`/portals/${uuid}`);
      return;
    }
    const url = item.metadata?.url;
    if (typeof url === "string" && url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    navigateToHashRoute(FALLBACK_ROUTE);
  }) as ActionHandler<Record<string, unknown>>,

  report: (() => {
    navigateToHashRoute("/reports");
  }) as ActionHandler<Record<string, unknown>>,

  goal: ((item: IndexItem) => {
    const year = item.metadata?.year;
    if (year !== undefined) {
      navigateToHashRoute(`/goals/${year}`);
    } else {
      navigateToHashRoute("/goals");
    }
  }) as ActionHandler<Record<string, unknown>>,

  /**
   * Routes for passively-captured items.
   *
   * The passive observer captures whatever `/seqta/student/...` JSON the
   * page is fetching, so we can't trust a single category to imply a
   * single SEQTA SPA route. Instead, derive the destination from the API
   * route the entity came from, augmented with entity-shaped hints
   * (programme/metaclass/year/uuid/...) that the observer hoists into
   * metadata. We never replay the original POST: actions are user-driven
   * and must stay safe even though the observer's own denylist excludes
   * `save/*` and friends.
   */
  passive: ((item: IndexItem) => {
    runPassiveSearchAction(item);
  }) as ActionHandler<Record<string, unknown>>,
};
