export function RemoveShortcutDiv(elements: any) {
  if (elements.length === 0) return

  elements.forEach((element: any) => {
    const shortcuts = document.querySelectorAll(".shortcut")
    shortcuts.forEach((shortcut) => {
      const anchorElement = shortcut.parentElement // the <a> element is the parent
      const textElement = shortcut.querySelector("p") // <p> is a direct child of .shortcut
      const title = textElement ? textElement.textContent : ""

      let shouldRemove = title === element.name

      // Check href only if element.url exists
      if (element.url) {
        shouldRemove =
          shouldRemove && anchorElement!.getAttribute("href") === element.url
      }

      if (shouldRemove) {
        anchorElement!.remove()
      }
    })
  })
}