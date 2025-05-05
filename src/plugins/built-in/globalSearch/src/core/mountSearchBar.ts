import renderSvelte from "@/interface/main";
import SearchBar from "../components/SearchBar.svelte";
import { unmount } from "svelte";
import { VectorWorkerManager } from "../indexing/worker/vectorWorkerManager";

export function mountSearchBar(
  titleElement: Element,
  api: any,
  appRef: { current: any },
) {
  if (titleElement.querySelector(".search-trigger")) {
    return;
  }

  const searchButton = document.createElement("div");
  searchButton.className = "search-trigger";
  searchButton.innerHTML = /* html */ `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
    <p>Quick search...</p>
    <span style="margin-left: auto; display: flex; align-items: center; color: #777; font-size: 12px;">⌘K</span>
  `;

  titleElement.appendChild(searchButton);

  const searchRoot = document.createElement("div");
  document.body.appendChild(searchRoot);
  const searchRootShadow = searchRoot.attachShadow({ mode: "open" });

  searchButton.addEventListener("click", () => {
    // @ts-ignore - Intentionally adding to window
    window.setCommandPalleteOpen(true);
  });

  try {
    appRef.current = renderSvelte(SearchBar, searchRootShadow, {
      transparencyEffects: api.settings.transparencyEffects ? true : false,
      showRecentFirst: api.settings.showRecentFirst,
    });
  } catch (error) {
    console.error("Error rendering Svelte component:", error);
  }
}

export function cleanupSearchBar(appRef: { current: any }) {
  const searchButton = document.querySelector(".search-trigger");
  const searchRoot = document.querySelector(".global-search-root");
  if (searchButton) searchButton.remove();
  if (searchRoot) searchRoot.remove();

  // Clean up workers
  VectorWorkerManager.getInstance().terminate();
  unmount(appRef.current);
}
