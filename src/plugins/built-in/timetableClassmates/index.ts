import type { Plugin } from "@/plugins/core/types";
import browser from "webextension-polyfill";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { isPluginBlockedByPerformanceMode } from "@/seqta/utils/performanceMode";
import { timetableClassmatesSettings } from "./settings";
import styles from "./styles.css?inline";
import {
  classKeyForHomeDay,
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
import {
  bindClassmatesOptInActivated,
  scheduleClassmatesSyncIfNeeded,
} from "./syncOrchestrator";
import {
  mountClassmatesToolbarChip,
  unmountClassmatesToolbarChip,
} from "./classmatesToolbarUi";
import { maybeResumeTimetableClassmatesOptInPopup } from "./openTimetableClassmatesPopup";

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
    void maybeResumeTimetableClassmatesOptInPopup();

    const onSyncMessage = (request: { type?: string }) => {
      if (request?.type === "timetableClassmatesSync") scheduleClassmatesSyncIfNeeded();
      return false;
    };
    browser.runtime.onMessage.addListener(onSyncMessage);

    let domObserver: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let paintTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let painting = false;

    const schedulePaint = () => {
      if (paintTimer) clearTimeout(paintTimer);
      paintTimer = setTimeout(() => void paintStacks(), 120);
    };

    const startTimetablePoll = () => {
      if (pollTimer) return;
      scheduleClassmatesSyncIfNeeded(true);
      pollTimer = setInterval(() => scheduleClassmatesSyncIfNeeded(), CLASSMATES_TIMETABLE_POLL_MS);
    };

    const armSyncIfOptedIn = async () => {
      if (!(await loadSession()).syncOptIn) return;
      void ensureCiToClassKey(() => fetchSchoolYearEnrollmentSnapshot()).catch(() => {});
      startTimetablePoll();
    };

    bindClassmatesOptInActivated(() => {
      if (document.querySelector(".timetablepage")) void armSyncIfOptedIn();
      schedulePaint();
    });

    const watchRepaint = (root: Element) => {
      domObserver ??= new MutationObserver((mutations) => {
        if (mutations.every(isClassmatesPluginMutation)) return;
        schedulePaint();
      });
      domObserver.observe(root, { childList: true, subtree: true });
    };

    const paintStacks = async () => {
      if (painting) return;
      painting = true;
      try {
        const session = await loadSession();
        if (!api.settings.enabled || !session.showAvatars) {
          removeClassmateStacks();
          return;
        }

        const selfId = await resolveStudentId();
        if (selfId == null) return;

        const [roster, peopleCache, archived, ciMap, cloudIds] = await Promise.all([
          loadRosterIndex(),
          refreshPeopleCacheIfStale(),
          loadArchivedMembers(),
          loadCiToClassKey(),
          peerCloudIdsForPaint(),
        ]);

        const paintHost = (host: HTMLElement, classKey: string | null) =>
          renderClassmateStackForEntry(
            host,
            classKey,
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

        const paints: Promise<void>[] = [];
        const page = document.querySelector(".timetablepage");
        if (page) {
          paints.push(
            ...[...page.querySelectorAll(".entry.class")].map((entry) =>
              paintHost(entry as HTMLElement, classKeyFromCi(ciOf(entry), ciMap)),
            ),
          );
          const quickbar = page.querySelector(".quickbar.visible[data-type='class']");
          if (quickbar) {
            const title = quickbar.querySelector(".title")?.textContent?.trim() ?? "";
            const host =
              (quickbar.querySelector(".meta") as HTMLElement | null) ?? (quickbar as HTMLElement);
            paints.push(paintHost(host, ciOf(findClassEntryByTitle(page, title))));
          }
        }

        const homeDays = document.querySelectorAll<HTMLElement>("#day-container .day[data-bsplus-meta-id]");
        for (const day of homeDays) {
          paints.push(paintHost(day, classKeyForHomeDay(day)));
        }

        await Promise.all(paints);
      } finally {
        painting = false;
      }
    };

    const handleTimetablePage = async () => {
      try {
        await waitForElm(".timetablepage .entry.class", true, 50, 300);
      } catch {
        /* entries may appear later */
      }

      const page = document.querySelector(".timetablepage");
      await armSyncIfOptedIn();
      schedulePaint();
      void mountClassmatesToolbarChip();

      if (page) {
        watchRepaint(page);
        resizeObserver ??= new ResizeObserver(() => schedulePaint());
        resizeObserver.observe(page);
      }
    };

    const handleHomePage = async () => {
      const container = document.getElementById("day-container");
      if (!container) return;
      try {
        await waitForElm("#day-container .day", true, 50, 200);
      } catch {
        /* empty day */
      }
      watchRepaint(container);
      schedulePaint();
    };

    const onUpdated = () => schedulePaint();
    window.addEventListener(CLASSMATES_UPDATED_EVENT, onUpdated);

    const onRepaintClick = (e: Event) => {
      if (
        (e.target as HTMLElement).closest?.(
          ".timetablepage .entry.class, #day-container .day",
        )
      ) {
        schedulePaint();
      }
    };
    document.addEventListener("click", onRepaintClick, true);

    const { unregister: unregisterEnabled } = api.settings.onChange("enabled", schedulePaint);
    const { unregister: unregisterTimetable } = api.seqta.onMount(".timetablepage", handleTimetablePage);
    const { unregister: unregisterHome } = api.seqta.onMount("#home-container", handleHomePage);

    if ((await loadSession()).syncOptIn) {
      scheduleClassmatesSyncIfNeeded();
      if (document.querySelector(".timetablepage")) startTimetablePoll();
    }

    return () => {
      unregisterTimetable();
      unregisterHome();
      bindClassmatesOptInActivated(null);
      browser.runtime.onMessage.removeListener(onSyncMessage);
      domObserver?.disconnect();
      resizeObserver?.disconnect();
      if (paintTimer) clearTimeout(paintTimer);
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener(CLASSMATES_UPDATED_EVENT, onUpdated);
      document.removeEventListener("click", onRepaintClick, true);
      unregisterEnabled();
      removeClassmateStacks();
      unmountClassmatesToolbarChip();
    };
  },
};

export default timetableClassmatesPlugin;
