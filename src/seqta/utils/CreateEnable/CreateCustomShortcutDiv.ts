import stringToHTML from "../stringToHTML";  // Import the function to convert a string to HTML

// Function to create a custom shortcut div with an icon and name
export function CreateCustomShortcutDiv(element: any) {
  // Creates the structure and element information for each separate shortcut
  var shortcut = document.createElement("a");  // Create an anchor element for the shortcut
  shortcut.setAttribute("href", element.url);  // Set the URL for the shortcut link
  shortcut.setAttribute("target", "_blank");  // Open the link in a new tab

  var shortcutdiv = document.createElement("div");  // Create a container div for the shortcut
  shortcutdiv.classList.add("shortcut");  // Add the 'shortcut' class for styling
  shortcutdiv.classList.add("customshortcut");  // Add the 'customshortcut' class for custom styling

  // Create an SVG element for the icon with text inside it
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
  ).firstChild;  // Convert the string to HTML and get the first child (the SVG element)
  (image as HTMLElement).classList.add("shortcuticondiv");  // Add the 'shortcuticondiv' class for styling the icon

  var text = document.createElement("p");  // Create a paragraph element for the shortcut name
  text.textContent = element.name;  // Set the name text for the shortcut

  shortcutdiv.append(image!);  // Append the icon to the shortcut container
  shortcutdiv.append(text);  // Append the text to the shortcut container
  shortcut.append(shortcutdiv);  // Append the container to the anchor element

  document.getElementById("shortcuts")!.append(shortcut);  // Append the shortcut element to the 'shortcuts' container in the DOM
}
