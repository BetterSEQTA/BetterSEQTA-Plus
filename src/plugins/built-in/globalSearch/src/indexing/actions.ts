import { waitForElm } from "@/seqta/utils/waitForElm";
import type { IndexItem } from "./types";
import ReactFiber from "@/seqta/utils/ReactFiber";
import { delay } from "@/seqta/utils/delay";

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

type ActionHandler<T = any> = (item: IndexItem & { metadata: T }) => void;

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

export const actionMap: Record<string, ActionHandler<any>> = {
  message: (async (item: IndexItem & { metadata: MessageMetadata }) => {
    window.location.hash = `#?page=/messages`;

    await waitForElm('[class*="Viewer__Viewer___"] > div', true, 20);

    // Select the specific direct message
    ReactFiber.find('[class*="Viewer__Viewer___"] > div').setState({
      selected: new Set([item.metadata.messageId]),
    });
    
    // send a network request to mark as read
    fetch('/seqta/student/save/message', {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({
        items: [item.metadata.messageId],
        mode: 'x-read',
        read: true,
      }),
    });

    await delay(10);

    const button = document.querySelector('[class*="MessageList__selected___"]');
    if (button) {
      (button as HTMLElement).click();
    }
  }) as ActionHandler<any>,

  assessment: (async (item: IndexItem & { metadata: AssessmentMetadata }) => {
    // Deep clone the entire item to avoid Firefox XrayWrapper issues
    // Firefox XrayWrapper prevents direct access to nested properties
    let itemClone: IndexItem & { metadata: AssessmentMetadata };
    let metadata: AssessmentMetadata;
    
    try {
      // First try to clone the entire item
      itemClone = JSON.parse(JSON.stringify(item));
      metadata = itemClone.metadata || {};
    } catch (e) {
      console.warn("[Assessment Action] Failed to clone item, trying to clone metadata separately:", e);
      try {
        // If full clone fails, try cloning just metadata
        metadata = JSON.parse(JSON.stringify(item.metadata || {}));
        itemClone = { ...item, metadata };
      } catch (e2) {
        console.warn("[Assessment Action] Failed to clone metadata, using direct access:", e2);
        itemClone = item;
        metadata = item.metadata || {} as AssessmentMetadata;
      }
    }
    
    // Try to extract metadata values using multiple methods to handle XrayWrapper.
    // The metadata bag is intentionally typed loosely here because Firefox's
    // XrayWrapper occasionally surfaces extra/casing-variant keys we still
    // want to read defensively.
    const getMetadataValue = (key: string, altKey?: string): any => {
      const bag = metadata as unknown as Record<string, any>;
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
          const keys = Object.keys(bag);
          for (const k of keys) {
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
    
    if (getMetadataValue('isMessageBased')) {
      window.location.hash = `#?page=/messages`;

      await waitForElm('[class*="Viewer__Viewer___"] > div', true, 20);

      // Select the specific direct message
      ReactFiber.find('[class*="Viewer__Viewer___"] > div').setState({
        selected: new Set([getMetadataValue('messageId')]),
      });
    } else {
      // Extract values - check both camelCase and PascalCase, and try multiple access methods
      let programmeId = getMetadataValue('programmeId', 'programmeID');
      let metaclassId = getMetadataValue('metaclassId', 'metaclassID');
      let assessmentId = getMetadataValue('assessmentId', 'assessmentID');
      
      // Fallback: try to extract assessmentId from item ID if metadata is missing
      if ((assessmentId === undefined || assessmentId === null) && itemClone.id && itemClone.id.startsWith('assignment-')) {
        const extractedId = itemClone.id.replace('assignment-', '');
        assessmentId = Number(extractedId) || extractedId;
        console.log("[Assessment Action] Extracted assessmentId from item ID:", assessmentId);
      }
      
      // Convert to numbers, but preserve 0 as valid
      if (programmeId !== undefined && programmeId !== null && programmeId !== '') {
        const num = Number(programmeId);
        programmeId = isNaN(num) ? programmeId : num;
      }
      if (metaclassId !== undefined && metaclassId !== null && metaclassId !== '') {
        const num = Number(metaclassId);
        metaclassId = isNaN(num) ? metaclassId : num;
      }
      if (assessmentId !== undefined && assessmentId !== null && assessmentId !== '') {
        const num = Number(assessmentId);
        assessmentId = isNaN(num) ? assessmentId : num;
      }
      
      // Check if values exist (including 0, which is a valid ID)
      // Use typeof check to properly handle 0
      const hasProgrammeId = programmeId !== undefined && programmeId !== null && programmeId !== '' && typeof programmeId === 'number';
      const hasMetaclassId = metaclassId !== undefined && metaclassId !== null && metaclassId !== '' && typeof metaclassId === 'number';
      const hasAssessmentId = assessmentId !== undefined && assessmentId !== null && assessmentId !== '' && typeof assessmentId === 'number';
      
     
      
      if (hasProgrammeId && hasMetaclassId && hasAssessmentId) {
        const url = `#?page=/assessments/${programmeId}:${metaclassId}&item=${assessmentId}`;
        console.log("[Assessment Action] ✅ Navigating to:", url);
        window.location.hash = url;
      } else {
        // Fallback: try to navigate to assessments page if metadata is incomplete
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
        // If we at least have an assessmentId, try to navigate to the general assessments page
        if (hasAssessmentId) {
          window.location.hash = `#?page=/assessments/upcoming&item=${assessmentId}`;
        } else {
          console.warn("[Assessment Action] No valid assessment ID, redirecting to upcoming");
          window.location.hash = `#?page=/assessments/upcoming`;
        }
      }
    }
  }) as ActionHandler<any>,

  subjectassessment: ((item: IndexItem) => {
    navigateToHashRoute(
      `/assessments/${item.metadata.programme}:${item.metadata.subjectId}`,
    );
  }) as ActionHandler<any>,

  subjectcourse: ((item: IndexItem) => {
    navigateToHashRoute(
      `/courses/${item.metadata.programme}:${item.metadata.subjectId}`,
    );
  }) as ActionHandler<any>,

  forum: ((item: IndexItem) => {
    navigateToHashRoute(`/forums/${item.metadata.forumId}`);
  }) as ActionHandler<any>,

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
  }) as ActionHandler<any>,

  notice: ((_item: IndexItem) => {
    // SEQTA's notices route doesn't honour `&date=` from the hash, so just
    // open the listing.
    navigateToHashRoute("/notices");
  }) as ActionHandler<any>,

  document: ((_item: IndexItem) => {
    // We don't trigger downloads automatically: opening the documents page
    // gives users full SEQTA controls (preview, download, share) without
    // needing the JWT-stamped streaming URL we deliberately avoid storing.
    navigateToHashRoute("/documents");
  }) as ActionHandler<any>,

  folio: ((_item: IndexItem) => {
    // SEQTA's folio SPA does not expose a per-id route; the previous
    // `?page=/folios/read?id=N` shape contained a literal `?` inside the
    // `page` query value and was unmatchable, which sent users to the
    // dashboard. Always land on the read view and let the user pick.
    navigateToHashRoute("/folios/read");
  }) as ActionHandler<any>,

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
  }) as ActionHandler<any>,

  report: ((_item: IndexItem) => {
    navigateToHashRoute("/reports");
  }) as ActionHandler<any>,

  goal: ((item: IndexItem) => {
    const year = item.metadata?.year;
    if (year !== undefined) {
      navigateToHashRoute(`/goals/${year}`);
    } else {
      navigateToHashRoute("/goals");
    }
  }) as ActionHandler<any>,

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
    const md = (item.metadata ?? {}) as Record<string, unknown>;
    const route = typeof md.route === "string" ? (md.route as string) : "";
    const sourcePage =
      typeof md.sourcePage === "string" ? (md.sourcePage as string) : "";
    const routeParts = route
      .replace(/^\/seqta\/student\/?/, "")
      .replace(/^load\//, "")
      .split("/")
      .filter(Boolean)
      .map((part) => part.toLowerCase());
    const tail = routeParts[0] ?? "";
    const child = routeParts[1] ?? "";

    const num = (key: string): number | undefined => {
      const value = md[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value && Number.isFinite(Number(value))) {
        return Number(value);
      }
      return undefined;
    };
    const str = (key: string): string | undefined => {
      const value = md[key];
      return typeof value === "string" && value ? value : undefined;
    };

    const programme = num("programme") ?? num("programmeId") ?? num("programmeID");
    const metaclass =
      num("metaclass") ?? num("metaclassId") ?? num("metaclassID");
    const portalUuid = str("portalUuid") ?? str("uuid");
    const forumId = num("forumId") ?? num("forum");
    const year = num("year");
    const assessmentId =
      num("assessmentId") ?? num("assessmentID") ?? num("id");
    const messageId = num("messageId");

    if (sourcePage === "/messages") {
      navigateInCurrentSeqtaApp("/messages");
      return;
    }

    switch (tail) {
      case "courses":
        if (programme !== undefined && metaclass !== undefined) {
          navigateToHashRoute(`/courses/${programme}:${metaclass}`);
          return;
        }
        break;
      case "assessments":
        if (programme !== undefined && metaclass !== undefined) {
          const itemSuffix =
            assessmentId !== undefined ? `&item=${assessmentId}` : "";
          navigateToHashRoute(
            `/assessments/${programme}:${metaclass}${itemSuffix}`,
          );
          return;
        }
        if (assessmentId !== undefined) {
          navigateToHashRoute(`/assessments/upcoming&item=${assessmentId}`);
          return;
        }
        navigateToHashRoute("/assessments/upcoming");
        return;
      case "forums":
      case "forum":
        if (forumId !== undefined) {
          navigateToHashRoute(`/forums/${forumId}`);
          return;
        }
        break;
      case "portals":
      case "portal":
        if (portalUuid) {
          navigateToHashRoute(`/portals/${portalUuid}`);
          return;
        }
        break;
      case "goals":
      case "goal":
        navigateToHashRoute(year !== undefined ? `/goals/${year}` : "/goals");
        return;
      case "folio":
      case "folios":
        navigateToHashRoute("/folios/read");
        return;
      case "notices":
      case "notice":
        navigateToHashRoute("/notices");
        return;
      case "documents":
      case "document":
        navigateToHashRoute("/documents");
        return;
      case "reports":
      case "report":
        navigateToHashRoute("/reports");
        return;
      case "messages":
      case "message":
        // `/seqta/student/load/message/people` and related endpoints are
        // only meaningful while SEQTA's message module is mounted. Use the
        // same live hash navigation as the real message action instead of
        // forcing a fresh bootstrap, which can drop back to dashboard for
        // context-only endpoints.
        void messageId; // noqa — preserved for future deep-select work
        navigateInCurrentSeqtaApp("/messages");
        return;
      case "people":
        if (route.includes("/load/message/people") || child === "people") {
          navigateInCurrentSeqtaApp("/messages");
          return;
        }
        break;
      case "timetable":
        navigateToHashRoute("/timetable");
        return;
    }

    navigateToHashRoute(FALLBACK_ROUTE);
  }) as ActionHandler<any>,
};
