import type { Plugin } from "@/plugins/core/types";
import browser from "webextension-polyfill";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { isPluginBlockedByPerformanceMode } from "@/seqta/utils/performanceMode";
import { timetableClassmatesSettings } from "./settings";
import styles from "./styles.css?inline";
import {
  classKeyFromCi,
  findClassEntryByTitle,
  isClassmatesPluginMutation,
  removeClassmateStacks,
  renderClassmateStackForEntry,
} from "./avatarStack";
import {
  CLASSMATES_UPDATED_EVENT,
  ensureCiToClassKey,
  loadArchivedMembers,
  loadCiToClassKey,
  loadRosterIndex,
  loadSession,
} from "./rosterStore";
import { refreshPeopleCacheIfStale } from "./peopleCache";
import { resolveStudentId } from "./seqtaClient";
import { peerCloudIdsForPaint } from "./accountsClient";
import { fetchSchoolYearEnrollmentSnapshot } from "./timetableYearSnapshot";
import { CLASSMATES_TIMETABLE_POLL_MS } from "./constants";
import { scheduleClassmatesSyncIfNeeded } from "./syncOrchestrator";

const timetableClassmatesPlugin: Plugin<typeof timetableClassmatesSettings> = {
  id: "timetable-classmates",
  name: "Timetable Classmates",
  description: "Show opted-in classmates on your timetable via private sync",
  version: "1.0.0",
  settings: timetableClassmatesSettings,
  defaultEnabled: false,
  styles,

  run: async (api) => {
    if (isPluginBlockedByPerformanceMode("timetable-classmates")) return () => {};
    await Promise.all([api.storage.loaded, api.settings.loaded]);

    const onSyncMessage = (request: { type?: string }) => {
      if (request?.type === "timetableClassmatesSync") scheduleClassmatesSyncIfNeeded();
      return false;
    };
    browser.runtime.onMessage.addListener(onSyncMessage);

    let gridObserver: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let paintTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let painting = false;

    const schedulePaint = () => {
      if (paintTimer) clearTimeout(paintTimer);
      paintTimer = setTimeout(() => void paintTimetable(), 120);
    };

    const paintTimetable = async () => {
      if (painting) return;
      painting = true;
      try {
        const session = await loadSession();
        if (!api.settings.enabled || !session.showAvatars) {
          removeClassmateStacks();
          return;
        }

        const page = document.querySelector(".timetablepage");
        if (!page) return;

        const selfId = await resolveStudentId();
        if (selfId == null) return;

        const [roster, peopleCache, archived, ciMap, cloudIds] = await Promise.all([
          loadRosterIndex(),
          refreshPeopleCacheIfStale(),
          loadArchivedMembers(),
          loadCiToClassKey(),
          peerCloudIdsForPaint(),
        ]);

        const paintHost = (host: HTMLElement, ci: number | null) =>
          renderClassmateStackForEntry(
            host,
            classKeyFromCi(ci, ciMap),
            roster,
            peopleCache,
            selfId,
            archived,
            cloudIds,
          );

        const ciOf = (el: Element | null | undefined) => {
          const ci = parseInt(el?.getAttribute("data-instance") ?? "", 10);
          return Number.isNaN(ci) ? null : ci;
        };

        const paints = [...page.querySelectorAll(".entry.class")].map((entry) =>
          paintHost(entry as HTMLElement, ciOf(entry)),
        );

        const quickbar = page.querySelector(".quickbar.visible[data-type='class']");
        if (quickbar) {
          const title = quickbar.querySelector(".title")?.textContent?.trim() ?? "";
          const host =
            (quickbar.querySelector(".meta") as HTMLElement | null) ?? (quickbar as HTMLElement);
          paints.push(paintHost(host, ciOf(findClassEntryByTitle(page, title))));
        }
        await Promise.all(paints);
      } finally {
        painting = false;
      }
    };

    const startTimetablePoll = () => {
      if (pollTimer) return;
      scheduleClassmatesSyncIfNeeded();
      pollTimer = setInterval(() => scheduleClassmatesSyncIfNeeded(), CLASSMATES_TIMETABLE_POLL_MS);
    };

    const handleTimetablePage = async () => {
      try {
        await waitForElm(".timetablepage .entry.class", true, 50, 300);
      } catch {
        /* entries may appear later */
      }

      const page = document.querySelector(".timetablepage");
      if ((await loadSession()).syncOptIn) {
        void ensureCiToClassKey(() => fetchSchoolYearEnrollmentSnapshot()).catch(() => {});
        startTimetablePoll();
      }

      schedulePaint();
      await paintTimetable();

      if (page && !gridObserver) {
        gridObserver = new MutationObserver((mutations) => {
          if (mutations.every(isClassmatesPluginMutation)) return;
          schedulePaint();
        });
        gridObserver.observe(page, { childList: true, subtree: true });

        resizeObserver = new ResizeObserver(() => schedulePaint());
        resizeObserver.observe(page);
      }
    };

    const onUpdated = () => schedulePaint();
    window.addEventListener(CLASSMATES_UPDATED_EVENT, onUpdated);

    const onClassEntryClick = (e: Event) => {
      if ((e.target as HTMLElement).closest?.(".timetablepage .entry.class")) schedulePaint();
    };
    document.addEventListener("click", onClassEntryClick, true);

    const { unregister: unregisterEnabled } = api.settings.onChange("enabled", schedulePaint);

    const { unregister } = api.seqta.onMount(".timetablepage", handleTimetablePage);
    if ((await loadSession()).syncOptIn) scheduleClassmatesSyncIfNeeded();

    return () => {
      unregister();
      browser.runtime.onMessage.removeListener(onSyncMessage);
      gridObserver?.disconnect();
      resizeObserver?.disconnect();
      if (paintTimer) clearTimeout(paintTimer);
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener(CLASSMATES_UPDATED_EVENT, onUpdated);
      document.removeEventListener("click", onClassEntryClick, true);
      unregisterEnabled();
      removeClassmateStacks();
    };
  },
};

export default timetableClassmatesPlugin;
