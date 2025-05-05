export function RemoveBackground() {
  const backgrounds = document.getElementsByClassName("bg");

  // Convert HTMLCollection to Array and remove each element
  Array.from(backgrounds).forEach((element) => element.remove());
}
