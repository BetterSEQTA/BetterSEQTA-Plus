let layoutObserver: MutationObserver | null = null;
let activePanelWidthPx = 0;

export function applyThemeCreatorLayout(widthPx: number): void {
  activePanelWidthPx = widthPx;
  syncContainerWidth();
  startLayoutObserver();
}

export function clearThemeCreatorLayout(): void {
  activePanelWidthPx = 0;
  layoutObserver?.disconnect();
  layoutObserver = null;
  const main = document.querySelector("#container") as HTMLElement | null;
  if (main) main.style.width = "100%";
}

function syncContainerWidth(): void {
  if (!activePanelWidthPx) return;
  const main = document.querySelector("#container") as HTMLElement | null;
  if (main) main.style.width = `calc(100% - ${activePanelWidthPx}px)`;
}

function startLayoutObserver(): void {
  layoutObserver?.disconnect();
  layoutObserver = new MutationObserver(() => {
    if (!document.getElementById("themeCreator")) {
      clearThemeCreatorLayout();
      return;
    }
    syncContainerWidth();
  });
  layoutObserver.observe(document.body, { childList: true, subtree: true });
}
