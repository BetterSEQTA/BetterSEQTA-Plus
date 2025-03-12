import stringToHTML from "../stringToHTML"

export function CreateCustomShortcutDiv(element: any) {
  // Creates the stucture and element information for each seperate shortcut
  var shortcut = document.createElement("a")
  shortcut.setAttribute("href", element.url)
  shortcut.setAttribute("target", "_blank")
  var shortcutdiv = document.createElement("div")
  shortcutdiv.classList.add("shortcut")
  shortcutdiv.classList.add("customshortcut")

  let image = stringToHTML(
    `
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
  ).firstChild
  ;(image as HTMLElement).classList.add("shortcuticondiv")
  var text = document.createElement("p")
  text.textContent = element.name
  shortcutdiv.append(image!)
  shortcutdiv.append(text)
  shortcut.append(shortcutdiv)

  document.getElementById("shortcuts")!.append(shortcut)
}