import "./index.css"
import { mount } from "svelte"
import type { ComponentType } from "svelte"
import Settings from "./pages/settings.svelte"

export default function renderSvelte(
  Component: ComponentType | any,
  mountPoint: ShadowRoot | HTMLElement,
  props: Record<string, any> = {},
) {
  const app = mount(Component, {
    target: mountPoint,
    props: {
      standalone: true,
      ...props,
    },
  })

  return app
}

const mountPoint = document.getElementById('app')
if (!mountPoint) {
  console.error('Mount point #app not found')
  throw new Error('Mount point #app not found')
}

renderSvelte(Settings, mountPoint)