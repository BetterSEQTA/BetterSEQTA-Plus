import type { IndexItem, Job } from "../types";
import { seqtaFetchPayload } from "../api";

/**
 * Indexes the user's external portal entries from `/seqta/student/load/portals`.
 *
 * Portals are user-facing tiles linking to third-party tools (Mathletics,
 * Seesaw, Google Classroom, ...). We index their labels and external URLs
 * so users can jump to them via the global search palette without scrolling
 * the dashboard.
 */

interface PortalPayload {
  id: number | string;
  label?: string;
  url?: string;
  uuid?: string;
  icon?: string;
  priority?: number;
  is_power_portal?: boolean;
  contents?: string;
  inherit_styles?: boolean;
}

function normalizePortalUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export const portalsJob: Job = {
  id: "portals",
  label: "Portals",
  renderComponentId: "portal",
  frequency: { type: "expiry", afterMs: 1000 * 60 * 60 * 24 * 7 }, // weekly

  boostCriteria: (_item, searchTerm) => {
    if (!searchTerm) return -50;
    return 0;
  },

  run: async (_ctx) => {
    const payload = await seqtaFetchPayload<PortalPayload[] | null>(
      "/seqta/student/load/portals",
      {},
    );
    if (!Array.isArray(payload)) return [];

    const items: IndexItem[] = [];
    const seen = new Set<string>();

    for (const portal of payload) {
      if (!portal || (portal.id === undefined && !portal.uuid)) continue;
      const id = `portal-${portal.uuid ?? portal.id}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const url = normalizePortalUrl(portal.url);
      const label = portal.label?.trim() || `Portal ${portal.id}`;
      const contentParts: string[] = [];
      if (url) contentParts.push(url);
      if (portal.is_power_portal) contentParts.push("Power Portal");

      items.push({
        id,
        text: label,
        category: "portals",
        content: contentParts.join(" \u2022 "),
        dateAdded: Date.now(),
        metadata: {
          portalId: portal.id,
          portalUuid: portal.uuid,
          url,
          isPowerPortal: !!portal.is_power_portal,
          entityType: "portal",
          icon: "\ueb01",
        },
        actionId: "portal",
        renderComponentId: "portal",
      });
    }

    console.debug(`[Portals job] Indexed ${items.length} portal entries.`);
    return items;
  },

  purge: (items) => items,
};
