import { mount, unmount } from "svelte";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import { waitForElm } from "@/seqta/utils/waitForElm";
import TitleBar from "./TitleBar.svelte";
import { titleBarState } from "./titleBarState.svelte";

const ROOT_ID = "bsplus-title-root";
const TITLE_CLASS = "bsplus-custom-title";
const PENDING_CLASS = "bsplus-custom-title-pending";

let app: ReturnType<typeof mount> | null = null;
let titleEl: HTMLElement | null = null;
let hostObserver: MutationObserver | null = null;
let earlyPrepareStarted = false;
let remountTimer: ReturnType<typeof setTimeout> | null = null;

function nativePageTitleEl(host: HTMLElement) {
  return [...host.children].find(
    (el) =>
      el instanceof HTMLElement &&
      el.id !== ROOT_ID &&
      el.matches('span[data-testid="page-title"]'),
  ) as HTMLElement | undefined;
}

function syncPageTitle() {
  if (!titleEl) return;
  titleBarState.pageTitle = (nativePageTitleEl(titleEl)?.textContent ?? "").trim();
}

function needsSearchChip() {
  const all = settingsState.getAll() as unknown as Record<string, unknown>;
  const plugin = all["plugin.global-search.settings"] as
    | { enabled?: boolean }
    | undefined;
  return plugin?.enabled === true || titleBarState.showSearch;
}

function isReady() {
  const root = document.getElementById(ROOT_ID);
  if (!root || !titleEl?.classList.contains(TITLE_CLASS)) return false;
  if (!needsSearchChip()) return true;
  return Boolean(root.querySelector(".search-trigger-wrapper"));
}

/** finishLoad waits here so the overlay stays until the title bar is ready. */
export async function waitForCustomTitleBarReady(timeoutMs = 10000) {
  if (isSeqtaEngageExperience() || !settingsState.onoff) {
    document.documentElement.classList.remove(PENDING_CLASS);
    return;
  }

  await mountCustomTitleBar();

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isReady()) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  document.documentElement.classList.remove(PENDING_CLASS);
}

function observeHost(host: HTMLElement) {
  hostObserver?.disconnect();
  syncPageTitle();
  hostObserver = new MutationObserver(() => {
    if (!document.getElementById(ROOT_ID)) {
      if (remountTimer) clearTimeout(remountTimer);
      remountTimer = setTimeout(() => {
        remountTimer = null;
        if (!settingsState.onoff || isSeqtaEngageExperience()) return;
        app = null;
        void mountCustomTitleBar();
      }, 50);
      return;
    }
    syncPageTitle();
  });
  hostObserver.observe(host, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

export function prepareCustomTitleBarEarly() {
  if (isSeqtaEngageExperience() || !settingsState.onoff || earlyPrepareStarted) {
    return;
  }
  earlyPrepareStarted = true;
  document.documentElement.classList.add(PENDING_CLASS);
  void mountCustomTitleBar();
}

export async function mountCustomTitleBar(): Promise<boolean> {
  if (isSeqtaEngageExperience() || !settingsState.onoff) return false;

  if (app && titleEl && document.getElementById(ROOT_ID)) {
    observeHost(titleEl);
    return true;
  }

  document.documentElement.classList.add(PENDING_CLASS);

  let title: HTMLElement;
  try {
    title = (await waitForElm("#title", true, 50, 200)) as HTMLElement;
  } catch {
    return false;
  }

  titleEl = title;
  title.classList.add(TITLE_CLASS);
  syncPageTitle();

  if (!document.getElementById(ROOT_ID)) {
    if (app) {
      try {
        unmount(app);
      } catch {
        /* ignore */
      }
      app = null;
    }
    app = mount(TitleBar, { target: title });
  }

  observeHost(title);
  return true;
}

export function unmountCustomTitleBar() {
  hostObserver?.disconnect();
  hostObserver = null;
  if (remountTimer) clearTimeout(remountTimer);
  remountTimer = null;

  if (app) {
    try {
      unmount(app);
    } catch {
      /* ignore */
    }
    app = null;
  }

  document.getElementById(ROOT_ID)?.remove();
  titleEl?.classList.remove(TITLE_CLASS);
  titleEl = null;
  titleBarState.pageTitle = "";
  titleBarState.showSearch = false;
  earlyPrepareStarted = false;
  document.documentElement.classList.remove(PENDING_CLASS);
}

export function setCustomTitleBarText(text: string) {
  titleBarState.pageTitle = text;
  const native = titleEl && nativePageTitleEl(titleEl);
  if (native) native.textContent = text;
}
