// @ts-expect-error - Svelte Hash Router is not typed (yet)
import { routes } from 'svelte-hash-router'
import App from './+layout.svelte';
import Settings from './pages/settings.svelte';
import styles from './index.css?inline';

export default function initSvelteInterface(shadow: ShadowRoot) {
  console.log(shadow)

  routes.set({
    'settings': Settings,
    '*': Settings
  })
  
  const app = new App({
    target: shadow,
  });

  const style2 = document.createElement("style");
  style2.setAttribute("type", "text/css");
  style2.innerHTML = styles;
  shadow.appendChild(style2);
  
  return app;
}