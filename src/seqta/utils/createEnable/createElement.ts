export function createElement(
  type: string,
  class_?: string,
  id?: string,
  innerText?: string,
  innerHTML?: string,
  style?: string,
) {
  const element = document.createElement(type);
  if (class_ !== undefined) {
    element.classList.add(class_);
  }
  if (id !== undefined) {
    element.id = id;
  }
  if (innerText !== undefined) {
    element.innerText = innerText;
  }
  if (innerHTML !== undefined) {
    element.innerHTML = innerHTML;
  }
  if (style !== undefined) {
    element.style.cssText = style;
  }
  return element;
}
