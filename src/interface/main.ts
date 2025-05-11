import { mount } from "svelte"; // Import mount function from Svelte to render components
import type { SvelteComponent } from "svelte"; // Import type for Svelte components
import style from "./index.css?inline"; // Import CSS styles as inline (for scoped styles)

// Function to render a Svelte component to a target mount point
export default function renderSvelte(
  Component: SvelteComponent | any,
  mountPoint: ShadowRoot | HTMLElement,
  props: Record<string, any> = {},
) {
  const app = mount(Component, {
    target: mountPoint, // Target mount point for the component
    props: {
      standalone: false, // Default prop to indicate if the component is standalone
      ...props, // Spread additional props passed into the function
    },
  });

  const styleElement = document.createElement("style"); // Create a <style> element to hold scoped styles
  styleElement.textContent = style; // Assign the inline CSS content to the style element
  mountPoint.appendChild(styleElement); // Append the style element to the mount point

  return app; // Return the mounted app instance
}
