import ShortcutLinks from "@/seqta/content/links.json";
import stringToHTML from "../stringToHTML";
import type { Shortcut } from "@/types/storage";

export function addShortcuts(shortcuts: Shortcut[]) {
  for (let i = 0; i < shortcuts.length; i++) {
    const currentShortcut = shortcuts[i];

    if (currentShortcut?.enabled) {
      const Itemname = (currentShortcut?.name ?? "").replace(/\s/g, "");

      const linkDetails = ShortcutLinks?.[Itemname as keyof typeof ShortcutLinks];
      if (linkDetails) {
        createNewShortcut(
          linkDetails.link,
          linkDetails.icon,
          linkDetails.viewBox,
          linkDetails.DisplayName || currentShortcut?.name,
        );
      }
    }
  }
}

function createNewShortcut(link: string, icon: string, viewBox: string, title: string) {
  // Creates the stucture and element information for each seperate shortcut
  const container = document.getElementById("shortcuts");
  if (!container) return;

  const shortcut = document.createElement("a");
  shortcut.setAttribute("href", link);
  shortcut.setAttribute("target", "_blank");
  const shortcutdiv = document.createElement("div");
  shortcutdiv.classList.add("shortcut");

  const image = stringToHTML(
    `<svg viewBox="${viewBox}" aria-hidden="true"><path fill="currentColor" d="${icon}" /></svg>`,
  ).firstChild;
  (image! as HTMLElement).classList.add("shortcuticondiv");
  const text = document.createElement("p");
  text.textContent = title;
  shortcutdiv.append(image as HTMLElement);
  shortcutdiv.append(text);
  shortcut.append(shortcutdiv);

  container.appendChild(shortcut);
}
