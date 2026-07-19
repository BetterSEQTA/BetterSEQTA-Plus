import type { Plugin } from "@/plugins/core/types";
import { verboseDebug, verboseLog } from "@/utils/verboseLog";
import styles from "./styles.css?inline";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { runIndexing, ensureSchemaCurrent } from "../indexing/indexer";
import { installResetIndexMessageListener } from "../indexing/resetIndexes";
import { isIndexingPaused } from "../indexing/indexingPause";
import { initVectorSearch } from "../search/vector/vectorSearch";
import { cleanupSearchBar, mountSearchBar } from "./mountSearchBar";
import { IndexedDbManager } from "embeddia";
import { VectorWorkerManager } from "../indexing/worker/vectorWorkerManager";
import { checkAndHandleUpdate } from "../utils/versionCheck";
import {
  getStoredPassiveItems,
  installPassiveObserver,
} from "../indexing/passiveObserver";

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

    initVectorSearch();

    setTimeout(async () => {
      try {
        const { isVectorSearchSupported } = await import("../utils/browserDetection");
        if (isVectorSearchSupported()) VectorWorkerManager.getInstance();
      } catch (error) {
        console.warn("[Global Search] Vector worker warm-up failed:", error);
      }
    }, 1000);

    // @ts-ignore
    window.globalSearchDebug = {
      resetWorker: () => VectorWorkerManager.getInstance().resetWorker(),
      passiveItems: getStoredPassiveItems,
      runSelfTests: async () =>
        (await import("../indexing/selfTests")).runGlobalSearchSelfTests(),
    };

    if (api.settings.passiveIndexing) {
      try {
        installPassiveObserver();
      } catch (error) {
        console.warn("[Global Search] Passive observer install failed:", error);
      }
    }

    if (api.settings.runIndexingOnLoad && !isIndexingPaused()) {
      setTimeout(async () => {
        if (!isIndexingPaused()) await runIndexing();
      }, 2000);
    }

    const title = document.querySelector("#title");
    if (title) {
      void mountSearchBar(title, api, appRef);
    } else {
      void mountSearchBar(await waitForElm("#title", true, 100, 60), api, appRef);
    }

    return () => cleanupSearchBar(appRef);
  },
};

export default globalSearchPlugin;
