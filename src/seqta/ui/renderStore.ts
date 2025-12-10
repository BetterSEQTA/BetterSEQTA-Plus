import renderSvelte from "@/interface/main";
import Store from "@/interface/pages/store.svelte";
import { isSEQTATeach } from "@/seqta/utils/platformDetection";

import { unmount } from "svelte";

let remove: () => void;

export function OpenStorePage(initialTab: 'themes' | 'backgrounds' = 'themes') {
  // Store initial tab in sessionStorage so the component can read it
  sessionStorage.setItem('storeInitialTab', initialTab);
  remove = renderStore();
}

export function renderStore() {
  // For Learn, use #container; for Teach, use #root or body
  let container: HTMLElement | null = null;
  
  if (isSEQTATeach()) {
    container = document.getElementById("root") || document.body;
  } else {
    container = document.querySelector("#container");
  }
  
  if (!container) {
    throw new Error("Container not found");
  }

  const child = document.createElement("div");
  child.id = "store";
  container.appendChild(child);

  const shadow = child.attachShadow({ mode: "open" });
  const app = renderSvelte(Store, shadow);

  return () => unmount(app);
}

export function closeStore() {
  document.getElementById("store")!.classList.add("hide");

  setTimeout(() => {
    remove();
    document.getElementById("store")!.remove();
  }, 500);
}
