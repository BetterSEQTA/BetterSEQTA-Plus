import styles from "./index.css?inline"
import { mount } from "svelte"
import type { ComponentType } from "svelte"

export default function renderSvelte(
  Component: ComponentType | any,
  mountPoint: ShadowRoot | HTMLElement,
  props: Record<string, any> = {},
) {
  const app = mount(Component, {
    target: mountPoint,
    props: {
      standalone: false,
      ...props,
    },
  })

  const style = document.createElement("style")
  style.setAttribute("type", "text/css")
  style.innerHTML = styles
  mountPoint.appendChild(style)

  return app
}
