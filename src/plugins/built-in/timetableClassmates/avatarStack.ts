import { resolveCloudPfp, defaultAccountsPfpUrl } from "@/seqta/utils/cloudPfpCache";
import { buildAvatarDisplayList, type AvatarListInput } from "./classKeys";
import { MAX_VISIBLE_CLASSMATE_AVATARS, maxClassmatesVisibleForWidth } from "./constants";
import type { ArchivedMembers, ClassRosterIndex } from "./rosterMerge";
import { rosterPeersForClass } from "./rosterMerge";
import type { PeopleCache } from "./rosterStore";
import { displayNameForSeqtaId } from "./peopleCache";
import { openClassmatesRosterPopup } from "./openTimetableClassmatesPopup";

const STACK = "bsplus-classmate-stack";
const AVATAR = "bsplus-classmate-avatar";

export function isClassmatesPluginMutation(record: MutationRecord): boolean {
  const inStack = (el: Element | null) => Boolean(el?.closest(`.${STACK}`));
  if (record.target instanceof Element && inStack(record.target)) return true;
  for (const node of [...record.addedNodes, ...record.removedNodes]) {
    const el = node instanceof Element ? node : node.parentElement;
    if (inStack(el)) return true;
  }
  return false;
}

function stackSignature(classKey: string, maxVisible: number, overflow: number, peerIds: number[]): string {
  return `${classKey}|${maxVisible}|${overflow}|${peerIds.join(",")}`;
}

function avatarColumnWidth(host: HTMLElement): number {
  const scope =
    (host.classList.contains("entry") ? host : host.closest(".timetablepage .entry.class")) ??
    host.closest(".timetablepage .quickbar .meta") ??
    host.closest(".timetablepage .days tbody td");
  if (!(scope instanceof HTMLElement)) return 0;
  const w = scope.getBoundingClientRect().width;
  return w > 0 ? w * 0.5 : 0;
}

function maxVisibleForHost(host: HTMLElement): number {
  const width = avatarColumnWidth(host);
  return width > 0 ? maxClassmatesVisibleForWidth(width) : MAX_VISIBLE_CLASSMATE_AVATARS;
}

export function removeClassmateStacks(root: ParentNode = document): void {
  root.querySelectorAll(`.${STACK}`).forEach((el) => el.remove());
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function createAvatarChip(
  peopleCache: PeopleCache,
  opts: { studentId: number } | { overflow: number; onOpen: () => void },
): HTMLElement {
  const wrap = document.createElement("span");
  const overflow = "overflow" in opts;
  wrap.className = overflow ? `${AVATAR} bsplus-classmate-avatar--overflow` : AVATAR;

  const label = overflow
    ? `Show ${opts.overflow} more classmates`
    : displayNameForSeqtaId(peopleCache, opts.studentId);
  wrap.title = label;
  wrap.setAttribute("aria-label", label);

  if (overflow) {
    wrap.setAttribute("role", "button");
    wrap.tabIndex = 0;
    const open = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      opts.onOpen();
    };
    wrap.addEventListener("click", open);
    wrap.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") open(e);
    });
  }

  const placeholder = document.createElement("span");
  placeholder.className = "bsplus-classmate-avatar-placeholder";
  placeholder.textContent = overflow ? `+${opts.overflow}` : initials(label);
  wrap.appendChild(placeholder);

  if (!overflow) {
    const people = peopleCache[String(opts.studentId)];
    if (people?.house_colour) wrap.style.setProperty("--bsplus-house-color", people.house_colour);
  }
  return wrap;
}

async function hydrateAvatarFromCloud(wrap: HTMLElement, cloudUserId: string): Promise<void> {
  const mark = wrap.dataset.bsplusPfp;
  if (mark === cloudUserId || mark === `none:${cloudUserId}`) return;
  try {
    wrap.dataset.bsplusPfp = cloudUserId;
    const resolved = await resolveCloudPfp(cloudUserId, defaultAccountsPfpUrl(cloudUserId));
    if (!resolved?.src) {
      wrap.dataset.bsplusPfp = `none:${cloudUserId}`;
      return;
    }
    const img = document.createElement("img");
    img.alt = "";
    img.loading = "lazy";
    img.src = resolved.src;
    wrap.querySelector(".bsplus-classmate-avatar-placeholder")?.remove();
    wrap.appendChild(img);
  } catch {
    wrap.dataset.bsplusPfp = `none:${cloudUserId}`;
  }
}

function openRosterPopup(classTitle: string, allSorted: AvatarListInput[], peopleCache: PeopleCache): void {
  openClassmatesRosterPopup(
    classTitle || "Classmates",
    allSorted.map((p) => {
      const displayName = displayNameForSeqtaId(peopleCache, p.seqtaStudentId);
      const people = peopleCache[String(p.seqtaStudentId)];
      return {
        displayName,
        initials: initials(displayName),
        houseColour: people?.house_colour,
      };
    }),
  );
}

export async function renderClassmateStackForEntry(
  entry: HTMLElement,
  classKey: string | null,
  roster: ClassRosterIndex,
  peopleCache: PeopleCache,
  selfSeqtaId: number,
  archived: ArchivedMembers = {},
  cloudUserIdByStudentId: Record<string, string> = {},
  maxVisible = maxVisibleForHost(entry),
): Promise<void> {
  if (!classKey) {
    entry.querySelector(`.${STACK}`)?.remove();
    return;
  }

  const { visible, overflow, allSorted } = buildAvatarDisplayList(
    rosterPeersForClass(roster, classKey, archived).map((p) => ({
      seqtaStudentId: p.seqtaStudentId,
      cloudUserId: p.cloudUserId,
      updatedAt: p.updatedAt,
    })),
    selfSeqtaId,
    maxVisible,
  );

  const signature = stackSignature(
    classKey,
    maxVisible,
    overflow,
    visible.map((p) => p.seqtaStudentId),
  );
  const existing = entry.querySelector(`.${STACK}`) as HTMLElement | null;
  if (visible.length === 0) {
    existing?.remove();
    return;
  }
  if (existing?.dataset.bsplusPeers === signature) return;
  existing?.remove();

  const classTitle = entry.querySelector(".title")?.textContent?.trim() ?? "";
  const stack = document.createElement("div");
  stack.className = STACK;
  stack.dataset.bsplusPeers = signature;
  stack.setAttribute("aria-label", "Classmates in this class");

  for (const peer of visible) {
    const el = createAvatarChip(peopleCache, { studentId: peer.seqtaStudentId });
    stack.appendChild(el);
    const cloudUserId =
      peer.cloudUserId ?? cloudUserIdByStudentId[String(peer.seqtaStudentId)] ?? null;
    if (cloudUserId) void hydrateAvatarFromCloud(el, cloudUserId);
  }

  if (overflow > 0) {
    stack.appendChild(
      createAvatarChip(peopleCache, {
        overflow,
        onOpen: () => openRosterPopup(classTitle, allSorted, peopleCache),
      }),
    );
  }

  entry.appendChild(stack);
}

export function classKeyFromCi(ci: number | null, ciMap: Record<string, string>): string | null {
  if (ci == null) return null;
  return ciMap[String(ci)] ?? null;
}

export function findClassEntryByTitle(page: ParentNode, title: string): HTMLElement | null {
  const normalized = title.trim();
  if (!normalized) return null;
  for (const entry of page.querySelectorAll(".entry.class")) {
    const el = entry as HTMLElement;
    if ((el.querySelector(".title")?.textContent?.trim() ?? "") === normalized) return el;
  }
  return null;
}
