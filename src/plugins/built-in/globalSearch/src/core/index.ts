import type { Plugin } from "@/plugins/core/types";
import { verboseDebug, verboseLog } from "@/utils/verboseLog";
import styles from "./styles.css?inline";
import { waitForSeqtaTitle } from "@/seqta/utils/waitForSeqtaShell";
import { runIndexing, ensureSchemaCurrent } from "../indexing/indexer";
import { installResetIndexMessageListener } from "../indexing/resetIndexes";
import { isIndexingPaused } from "../indexing/indexingPause";
import { cleanupSearchBar, mountSearchBar } from "./mountSearchBar";
import { IndexedDbManager } from "embeddia";
import { checkAndHandleUpdate } from "../utils/versionCheck";
import {
  getStoredPassiveItems,
  installPassiveObserver,
} from "../indexing/passiveObserver";
import { globalSearchIndexingEnabled } from "@/seqta/utils/performanceMode";

function scheduleIdleIndexing(run: () => void): void {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => run(), { timeout: 5000 });
    return;
  }
  setTimeout(run, 2000);
}

const globalSearchPlugin: Plugin<{}> = {
  id: "global-search",
  name: "Global Search",
  description: "Quick search for everything in SEQTA",
  version: "1.0.0",
  settings: {},
  disableToggle: true,
  defaultEnabled: false,
  styles,

  run: async (api) => {
    const appRef = { current: null };

    installResetIndexMessageListener();

    try {
      const wasUpdated = await checkAndHandleUpdate();
      if (wasUpdated) {
        verboseLog(
          "[Global Search] Extension updated — search index reset; the next indexing pass will repopulate.",
        );
      }
    } catch (error: any) {
      const msg = error?.message ?? "";
      if (
        msg.includes("preload CSS") ||
        msg.includes("MIME type") ||
        msg.includes("NS_ERROR_CORRUPTED_CONTENT")
      ) {
        verboseDebug(
          "[Global Search] Version check skipped due to asset loading restrictions:",
          msg,
        );
      } else {
        console.warn("[Global Search] Failed to check for updates:", error);
      }
    }

    try {
      await ensureSchemaCurrent();
    } catch (error) {
      console.warn("[Global Search] Schema check failed:", error);
    }

    try {
      await IndexedDbManager.create("embeddiaDB", "embeddiaObjectStore", {
        primaryKey: "id",
        autoIncrement: false,
      });
    } catch (error) {
      console.error("Failed to create IndexedDB:", error);
    }

    // @ts-ignore
    window.globalSearchDebug = {
      resetWorker: async () =>
        (await import("../indexing/worker/vectorWorkerManager")).VectorWorkerManager.getInstance().resetWorker(),
      passiveItems: getStoredPassiveItems,
      runSelfTests: async () =>
        (await import("../indexing/selfTests")).runGlobalSearchSelfTests(),
    };

    if (globalSearchIndexingEnabled(!!api.settings.passiveIndexing)) {
      try {
        installPassiveObserver();
      } catch (error) {
        console.warn("[Global Search] Passive observer install failed:", error);
      }
    }

    if (
      globalSearchIndexingEnabled(!!api.settings.runIndexingOnLoad) &&
      !isIndexingPaused()
    ) {
      scheduleIdleIndexing(() => {
        if (!isIndexingPaused()) void runIndexing();
      });
    }

    void mountSearchBar(await waitForSeqtaTitle(100, 60), api, appRef);

    return () => cleanupSearchBar(appRef);
  },
};

export default globalSearchPlugin;
