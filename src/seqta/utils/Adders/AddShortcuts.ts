import ShortcutLinks from "@/seqta/content/links.json";  // Import the JSON file containing shortcut link details
import stringToHTML from "../stringToHTML";  // Import the function to convert a string to HTML

// Function to add shortcuts based on the provided list of shortcuts
export function addShortcuts(shortcuts: any) {
  // Iterate through the list of shortcuts
  for (let i = 0; i < shortcuts.length; i++) {
    const currentShortcut = shortcuts[i];  // Get the current shortcut object

    if (currentShortcut?.enabled) {  // Check if the current shortcut is enabled
      const Itemname = (currentShortcut?.name ?? "").replace(/\s/g, "");  // Remove spaces from the shortcut name

      // Retrieve the link details from ShortcutLinks JSON based on the shortcut name
      const linkDetails =
        ShortcutLinks?.[Itemname as keyof typeof ShortcutLinks];
      if (linkDetails) {
        // If link details are found, create a new shortcut
        createNewShortcut(
          linkDetails.link,
          linkDetails.icon,
          linkDetails.viewBox,
          linkDetails.DisplayName || currentShortcut?.name,  // Use display name or the shortcut name
        );
      } else {
        console.warn(`No link details found for '${Itemname}'`);  // Warn if no link details are found for the shortcut
      }
    }
  }
}

// Function to create and add a new shortcut element to the page
function createNewShortcut(link: any, icon: any, viewBox: any, title: any) {
  // Create an anchor element for the shortcut
  let shortcut = document.createElement("a");
  shortcut.setAttribute("href", link);  // Set the link for the shortcut
  shortcut.setAttribute("target", "_blank");  // Open the link in a new tab

  // Create a container div for the shortcut
  let shortcutdiv = document.createElement("div");
  shortcutdiv.classList.add("shortcut");  // Add the 'shortcut' class for styling

  // Create an SVG element for the icon and set its viewBox and path
  let image = stringToHTML(
    `<svg style="width:39px;height:39px" viewBox="${viewBox}"><path fill="currentColor" d="${icon}" /></svg>`,
  ).firstChild;
  (image! as HTMLElement).classList.add("shortcuticondiv");  // Add a class for styling the icon

  // Create a paragraph element for the shortcut title
  let text = document.createElement("p");
  text.textContent = title;  // Set the title text for the shortcut

  // Append the icon and text to the shortcut container div
  shortcutdiv.append(image as HTMLElement);
  shortcutdiv.append(text);

  // Append the shortcut container div to the anchor element
  shortcut.append(shortcutdiv);

  // Append the final shortcut element to the 'shortcuts' container in the document
  document.getElementById("shortcuts")!.appendChild(shortcut);
}
