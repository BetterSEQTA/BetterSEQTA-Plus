import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { waitForElm } from "@/seqta/utils/waitForElm";

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

  document.querySelectorAll("#menu .item").forEach((item) => {
    item.classList.remove("active");
  });
  document.querySelector('[data-key="analytics"]')?.classList.add("active");

  const main = (await waitForElm("#main", true, 100, 60)) as HTMLElement;

  main.innerHTML = "";
  main.style.overflow = "auto";
  main.style.width = "100%";
  main.style.maxWidth = "none";
  const viewShell = document.createElement("div");
  viewShell.id = "analytics-view-container";
  main.appendChild(viewShell);
  const container = viewShell;

  const titlediv = document.getElementById("title")?.firstChild;
  if (titlediv) (titlediv as HTMLElement).innerText = "Analytics";

  const { renderAnalyticsPage } = await import("./ui");
  renderAnalyticsPage(container);
}
