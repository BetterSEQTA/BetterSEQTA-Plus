import { unmount } from "svelte";
import { isSeqtaTeachExperience } from "@/seqta/utils/isSeqtaTeach";

let remove: () => void;

export async function OpenStorePage(
  initialTab: "themes" | "backgrounds" = "themes",
): Promise<void> {
  sessionStorage.setItem("storeInitialTab", initialTab);
  remove = await renderStore();
}

export async function renderStore() {
  const [{ default: renderSvelte }, { default: Store }] = await Promise.all([
    import("@/interface/main"),
    import("@/interface/pages/store.svelte"),
  ]);

  let container: HTMLElement | null = null;

  if (isSeqtaTeachExperience()) {
    container = document.getElementById("root") || document.body;
  } else {
    container = document.querySelector("#container");
  }

  if (!container) {
    throw new Error("Container not found");
  }

  document.getElementById("store")?.remove();

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
