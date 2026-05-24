import { waitForElm } from "@/seqta/utils/waitForElm";

/** Engage mounts the sidebar inside batched React trees; polling `waitForElm` matches the real DOM reliably. */
export async function waitForEngageMenuList(): Promise<HTMLElement | null> {
  const poll = true as const;
  const interval = 100;
  const trySelectors: { selector: string; maxIterations: number }[] = [
    { selector: "#menu > ul > li", maxIterations: 500 },
    { selector: "#menu ul", maxIterations: 350 },
    { selector: "#menu", maxIterations: 350 },
  ];

  for (const { selector, maxIterations } of trySelectors) {
    try {
      await waitForElm(selector, poll, interval, maxIterations);
    } catch {
      continue;
    }

    if (selector === "#menu > ul > li") {
      const ul = document.querySelector("#menu > ul") as HTMLElement | null;
      if (ul) return ul;
    } else if (selector === "#menu ul") {
      const ul = document.querySelector("#menu ul") as HTMLElement | null;
      if (ul) return ul;
    } else {
      const menu = document.getElementById("menu");
      const ul =
        (menu?.querySelector("ul") as HTMLElement | null) ??
        (menu?.firstElementChild as HTMLElement | null);
      if (ul) return ul;
    }
  }

  console.warn(
    "[BetterSEQTA+] Engage: could not find a menu list to inject the home button",
  );
  return null;
}
