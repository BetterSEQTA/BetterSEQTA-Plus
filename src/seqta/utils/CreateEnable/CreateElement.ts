// Function to create a DOM element with optional attributes such as class, id, innerText, innerHTML, and style
export function CreateElement(
  type: string,  // The type of element to create (e.g., 'div', 'span')
  class_?: any,  // Optional class to add to the element
  id?: any,  // Optional id to assign to the element
  innerText?: string,  // Optional text content to set inside the element
  innerHTML?: string,  // Optional HTML content to set inside the element
  style?: string,  // Optional CSS style to apply to the element
) {
  let element = document.createElement(type);  // Create the element of the specified type

  // Conditionally add the class if provided
  if (class_ !== undefined) {
    element.classList.add(class_);
  }

  // Conditionally set the id if provided
  if (id !== undefined) {
    element.id = id;
  }

  // Conditionally set the inner text if provided
  if (innerText !== undefined) {
    element.innerText = innerText;
  }

  // Conditionally set the inner HTML if provided
  if (innerHTML !== undefined) {
    element.innerHTML = innerHTML;
  }

  // Conditionally set the CSS style if provided
  if (style !== undefined) {
    element.style.cssText = style;
  }

  return element;  // Return the created element
}
