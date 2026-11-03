import stringToHTML from "../stringToHTML";
import type { CustomShortcut } from "@/types/storage";

function isSafeShortcutHref(url: string): boolean {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const parsed = new URL(url, window.location.href);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function CreateCustomShortcutDiv(element: CustomShortcut) {
  const container = document.getElementById("shortcuts");
  if (!container) return;

  const shortcut = document.createElement("a");
  if (isSafeShortcutHref(element.url)) {
    shortcut.setAttribute("href", element.url);
    shortcut.setAttribute("target", "_blank");
  } else {
    shortcut.setAttribute("href", "#");
    shortcut.setAttribute("aria-disabled", "true");
  }
  const shortcutdiv = document.createElement("div");
  shortcutdiv.classList.add("shortcut", "customshortcut");

  let image: ChildNode | null;

  if (typeof element.icon === "string" && element.icon.trim().startsWith("<")) {
    image = stringToHTML(element.icon).firstChild;
  } else if (typeof element.icon === "string" && element.icon.startsWith("data:image")) {
    const img = document.createElement("img");
    img.src = element.icon;
    img.alt = "";
    image = img;
  } else {
    image = stringToHTML(/* html */ `
      <svg viewBox="0 0 40 40">
        <text
          text-anchor="middle"
          x="50%"
          y="50%"
          dy=".35em"
          fill="var(--text-primary)"
          font-weight="bold"
          font-size="32"
          dominant-baseline="middle">
          ${element.icon}
        </text>
      </svg>
      `).firstChild;
  }
  (image as HTMLElement).classList.add("shortcuticondiv");
  const text = document.createElement("p");
  text.textContent = element.name;
  shortcutdiv.append(image!, text);
  shortcut.append(shortcutdiv);

  container.append(shortcut);
}
