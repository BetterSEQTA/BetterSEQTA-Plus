export function CreateBackground() {
  const bkCheck = document.getElementsByClassName("bg");
  if (bkCheck.length !== 0) {
    return;
  }

  // Creating and inserting 3 divs containing the background applied to the pages
  const container = document.getElementById("container");
  const menu = document.getElementById("menu");

  if (!container || !menu) return;

  const backgrounds = [
    { classes: ["bg"] },
    { classes: ["bg", "bg2"] },
    { classes: ["bg", "bg3"] },
  ];

  backgrounds.forEach(({ classes }) => {
    const bk = document.createElement("div");
    classes.forEach((cls) => bk.classList.add(cls));
    container.insertBefore(bk, menu);
  });
}
