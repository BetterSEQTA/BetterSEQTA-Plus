import { getNativeMenuList } from "@/seqta/ui/sidebar/parseNativeMenu";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { renderAnalyticsPage } from "./ui";

let loadInFlight: Promise<void> | null = null;

export async function loadAnalyticsPage(): Promise<void> {
  if (!settingsState.onoff) return;

  if (loadInFlight) {
    await loadInFlight;
    return;
  }

  loadInFlight = loadAnalyticsPageInner();
  try {
    await loadInFlight;
  } finally {
    loadInFlight = null;
  }
}

async function loadAnalyticsPageInner(): Promise<void> {
  document.title = "Analytics ― SEQTA Learn";

  const menu = getNativeMenuList();
  menu?.querySelectorAll(".item").forEach((item) => {
    item.classList.remove("active");
  });
  menu?.querySelector('[data-key="analytics"]')?.classList.add("active");

  let main: HTMLElement;
  try {
    main = (await waitForElm("#main", true, 100, 60)) as HTMLElement;
  } catch {
    console.warn(
      "[BetterSEQTA+] Analytics: timed out waiting for #main (shell not ready).",
    );
    return;
  }

  main.innerHTML = "";
  main.style.overflow = "auto";
  main.style.width = "100%";
  main.style.maxWidth = "none";
  const viewShell = document.createElement("div");
  viewShell.id = "analytics-view-container";
  main.appendChild(viewShell);
  const container = viewShell;

  void import("@/seqta/ui/titlebar/mountCustomTitleBar").then((mod) => {
    mod.setCustomTitleBarText("Analytics");
  });
  if (!document.getElementById("bsplus-title-root")) {
    const titlediv = document.getElementById("title")?.firstChild;
    if (titlediv instanceof HTMLElement) titlediv.innerText = "Analytics";
  }

  renderAnalyticsPage(container);
}
