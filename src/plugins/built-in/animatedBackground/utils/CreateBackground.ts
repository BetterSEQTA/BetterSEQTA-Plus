export function CreateBackground() {
  const bkCheck = document.getElementsByClassName("bg"); // Checks if any elements with the class 'bg' already exist.
  if (bkCheck.length !== 0) { // If elements with class 'bg' are found, the function exits early.
    return;
  }

  // Creating and inserting 3 divs containing the background applied to the pages
  const container = document.getElementById("container"); // Gets the container element.
  const menu = document.getElementById("menu"); // Gets the menu element.

  if (!container || !menu) return; // If either container or menu is not found, the function exits early.

  const backgrounds = [
    { classes: ["bg"] }, // Background configuration 1: only 'bg' class.
    { classes: ["bg", "bg2"] }, // Background configuration 2: 'bg' and 'bg2' classes.
    { classes: ["bg", "bg3"] }, // Background configuration 3: 'bg' and 'bg3' classes.
  ];

  backgrounds.forEach(({ classes }) => { // Iterates over each background configuration.
    const bk = document.createElement("div"); // Creates a new div element for each background.
    classes.forEach((cls) => bk.classList.add(cls)); // Adds each class from the configuration to the div.
    container.insertBefore(bk, menu); // Inserts the new background div before the menu element in the container.
  });
}
