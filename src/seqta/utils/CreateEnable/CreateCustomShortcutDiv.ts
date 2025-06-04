import stringToHTML from "../stringToHTML";

export function CreateCustomShortcutDiv(element: any) {
  // Creates the stucture and element information for each seperate shortcut
  var shortcut = document.createElement("a");
  shortcut.setAttribute("href", element.url);
  shortcut.setAttribute("target", "_blank");
  var shortcutdiv = document.createElement("div");
  shortcutdiv.classList.add("shortcut");
  shortcutdiv.classList.add("customshortcut");

  let image: ChildNode | null = null;

  if (typeof element.icon === "string" && element.icon.trim().startsWith("<")) {
    image = stringToHTML(element.icon).firstChild;
  } else if (typeof element.icon === "string" && element.icon.startsWith("data:image")) {
    const img = document.createElement("img");
    img.src = element.icon;
    img.style.width = "39px";
    img.style.height = "39px";
    image = img;
  } else {
    image = stringToHTML(
      /* html */`
      <svg style="width:39px;height:39px" viewBox="0 0 40 40" class="shortcuticondiv">
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
      `,
    ).firstChild;
  }
  (image as HTMLElement).classList.add("shortcuticondiv");
  var text = document.createElement("p");
  text.textContent = element.name;
  shortcutdiv.append(image!);
  shortcutdiv.append(text);
  shortcut.append(shortcutdiv);

  document.getElementById("shortcuts")!.append(shortcut);
}
