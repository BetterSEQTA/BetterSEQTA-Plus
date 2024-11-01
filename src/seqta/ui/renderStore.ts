import renderSvelte from '@/interface/main';
import Store from '@/interface/pages/store.svelte'

import { unmount } from 'svelte'

let remove: () => void

export function OpenStorePage() {
  remove = renderStore()
}

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

export function closeStore() {
  document.getElementById('store')!.classList.add('hide')

    setTimeout(() => {
      remove()
      document.getElementById('store')!.remove()
    }, 500)
}
