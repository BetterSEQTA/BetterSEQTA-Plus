import { mount, type Component } from "svelte";
import settingsStyle from "./index.css?inline";
import contentShadowStyle from "./contentShadow.css?inline";

const shadowStyles = {
  // Registered properties are document-wide, including inside shadow roots.
  settings: settingsStyle.replaceAll("--tw-gradient", "--bs-gradient"),
  content: contentShadowStyle.replaceAll("--tw-gradient", "--bs-gradient"),
} as const;

export type ShadowStyleVariant = keyof typeof shadowStyles;

export default function renderSvelte(
  Component: Component<any>,
  mountPoint: ShadowRoot | HTMLElement,
  props: Record<string, any> = {},
  shadowStyle: ShadowStyleVariant = "settings",
) {
  if (mountPoint instanceof ShadowRoot || props.standalone === true) {
    const styleElement = document.createElement("style");
    styleElement.textContent = shadowStyles[shadowStyle];
    (mountPoint instanceof ShadowRoot ? mountPoint : document.head).appendChild(styleElement);
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
