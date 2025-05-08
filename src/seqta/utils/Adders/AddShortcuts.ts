import ShortcutLinks from "@/seqta/content/links.json";
import stringToHTML from "../stringToHTML";

export function addShortcuts(shortcuts: any) {
  for (let i = 0; i < shortcuts.length; i++) {
    const currentShortcut = shortcuts[i];

    if (currentShortcut?.enabled) {
      const Itemname = (currentShortcut?.name ?? "").replace(/\s/g, "");

      const linkDetails =
        ShortcutLinks?.[Itemname as keyof typeof ShortcutLinks];
      if (linkDetails) {
        createNewShortcut(
          linkDetails.link,
          linkDetails.icon,
          linkDetails.viewBox,
          linkDetails.DisplayName || currentShortcut?.name,
        );
      } else {
        console.warn(`No link details found for '${Itemname}'`);
      }
    }
  }
}

function createNewShortcut(link: any, icon: any, viewBox: any, title: any) {
  // Creates the stucture and element information for each seperate shortcut
  let shortcut = document.createElement("a");
  shortcut.setAttribute("href", link);
  shortcut.setAttribute("target", "_blank");
  let shortcutdiv = document.createElement("div");
  shortcutdiv.classList.add("shortcut");

  let image = stringToHTML(
    `<svg style="width:39px;height:39px" viewBox="${viewBox}"><path fill="currentColor" d="${icon}" /></svg>`,
  ).firstChild;
  (image! as HTMLElement).classList.add("shortcuticondiv");
  let text = document.createElement("p");
  text.textContent = title;
  shortcutdiv.append(image as HTMLElement);
  shortcutdiv.append(text);
  shortcut.append(shortcutdiv);

  document.getElementById("shortcuts")!.appendChild(shortcut);
}
