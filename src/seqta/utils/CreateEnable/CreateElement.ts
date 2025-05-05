export function CreateElement(
  type: string,
  class_?: any,
  id?: any,
  innerText?: string,
  innerHTML?: string,
  style?: string,
) {
  let element = document.createElement(type);
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
