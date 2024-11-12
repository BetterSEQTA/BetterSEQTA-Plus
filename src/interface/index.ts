import "./index.css"
import { mount } from "svelte"
import type { ComponentType } from "svelte"
import Settings from "./pages/settings.svelte"
import IconFamily from '@/resources/fonts/IconFamily.woff'
import browser from "webextension-polyfill"

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

function InjectCustomIcons() {
  console.info('[BetterSEQTA+] Injecting Icons')

  const style = document.createElement('style')
  style.setAttribute('type', 'text/css')
  style.innerHTML = `
    @font-face {
      font-family: 'IconFamily';
      src: url('${browser.runtime.getURL(IconFamily)}') format('woff');
      font-weight: normal;
      font-style: normal;
    }`
  document.head.appendChild(style)
}

const mountPoint = document.getElementById('app')
if (!mountPoint) {
  console.error('Mount point #app not found')
  throw new Error('Mount point #app not found')
}

InjectCustomIcons()
renderSvelte(Settings, mountPoint)