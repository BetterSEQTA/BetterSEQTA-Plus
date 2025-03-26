//import styles from "./index.css?inline"
import { mount } from "svelte"
import type { ComponentType } from "svelte"
import './index.css'

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

  return app
}
