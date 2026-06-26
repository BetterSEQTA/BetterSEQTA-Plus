import { unmount } from "svelte";

let remove: () => void;

export async function OpenStorePage(): Promise<void> {
  remove = await renderStore();
}

export async function renderStore() {
  const [{ default: renderSvelte }, { default: Store }] = await Promise.all([
    import("@/interface/main"),
    import("@/interface/pages/store.svelte"),
  ]);

  const container = document.querySelector("#container");
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
