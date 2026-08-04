import { mount } from "svelte";
import type { SvelteComponent } from "svelte";
import settingsStyle from "./index.css?inline";
import contentShadowStyle from "./contentShadow.css?inline";

const shadowStyles = {
  settings: settingsStyle,
  content: contentShadowStyle,
} as const;

export type ShadowStyleVariant = keyof typeof shadowStyles;

export default function renderSvelte(
  Component: SvelteComponent | any,
  mountPoint: ShadowRoot | HTMLElement,
  props: Record<string, any> = {},
  shadowStyle: ShadowStyleVariant = "settings",
) {
  if (mountPoint instanceof ShadowRoot || props.standalone === true) {
    const styleElement = document.createElement("style");
    styleElement.textContent = shadowStyles[shadowStyle];
    (mountPoint instanceof ShadowRoot ? mountPoint : document.head).appendChild(
      styleElement,
    );
  }

  const app = mount(Component, {
    target: mountPoint,
    props: {
      standalone: false,
      ...props,
    },
  });

  return app;
}
