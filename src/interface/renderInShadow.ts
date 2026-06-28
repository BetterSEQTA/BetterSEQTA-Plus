import { mount } from "svelte";
import type { SvelteComponent } from "svelte";
import style from "./contentShadow.css?inline";

/** Mount Svelte UI inside a shadow root from content scripts (decoupled from settings popup CSS). */
export default function renderInShadow(
  Component: SvelteComponent | any,
  mountPoint: ShadowRoot | HTMLElement,
  props: Record<string, any> = {},
) {
  const app = mount(Component, {
    target: mountPoint,
    props: {
      standalone: false,
      ...props,
    },
  });

  if (mountPoint instanceof ShadowRoot) {
    const styleElement = document.createElement("style");
    styleElement.textContent = style;
    mountPoint.appendChild(styleElement);
  }

  return app;
}
