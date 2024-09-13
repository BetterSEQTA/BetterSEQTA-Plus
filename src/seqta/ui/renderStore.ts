import renderSvelte from '@/svelte-interface/main';
import Store from '@/svelte-interface/pages/store.svelte'

import { unmount } from 'svelte'

export function renderStore() {
  const container = document.querySelector('#container');
  if (!container) {
    throw new Error('Container not found');
  }
  
  const child = document.createElement('div');
  child.id = 'store';
  container!.appendChild(child);

  const shadow = child.attachShadow({ mode: 'open' });
  const app = renderSvelte(Store, shadow);

  return () => unmount(app)
}
