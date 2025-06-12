import { mount } from "svelte";
import type { SvelteComponent } from "svelte";
import style from "./index.css?inline";

export default function renderSvelte(
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
