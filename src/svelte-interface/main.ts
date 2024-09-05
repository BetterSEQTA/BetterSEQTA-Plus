// @ts-expect-error - Svelte Hash Router is not typed (yet)
import { routes } from 'svelte-hash-router'
//import App from './+layout.svelte';
import Settings from './pages/settings.svelte';
import styles from './index.css?inline';
import { mount } from 'svelte';

export default function initSvelteInterface(mountPoint: ShadowRoot | HTMLElement) {
  /* routes.set({
    'settings': Settings,
    '*': Settings
  }) */
  
  const app = mount(Settings, {
    target: mountPoint,
    props: {
      standalone: false
    }
  });

  const style2 = document.createElement("style");
  style2.setAttribute("type", "text/css");
  style2.innerHTML = styles;
  mountPoint.appendChild(style2);
  
  return app;
}