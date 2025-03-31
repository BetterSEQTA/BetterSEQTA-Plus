import type { Plugin } from '@/plugins/core/types';
import { BasePlugin } from '@/plugins/core/settings';
import { booleanSetting, defineSettings, Setting, stringSetting } from '@/plugins/core/settingsHelpers';
//import FlexSearch from 'flexsearch';
import renderSvelte from '@/interface/main';
import SearchBar from './SearchBar.svelte';
import styles from './styles.css?inline';
import { unmount } from 'svelte';

// Plugin settings
const settings = defineSettings({
  searchHotkey: stringSetting({
    default: 'ctrl+k',
    title: 'Search Hotkey',
    description: 'Keyboard shortcut to open the search (cmd on Mac)',
  }),
  showRecentFirst: booleanSetting({
    default: true,
    title: 'Show Recent First',
    description: 'Sort dynamic content by most recent first',
  })
});

class GlobalSearchPlugin extends BasePlugin<typeof settings> {
  @Setting(settings.searchHotkey)
  searchHotkey!: string;

  @Setting(settings.showRecentFirst)
  showRecentFirst!: boolean;
}

const settingsInstance = new GlobalSearchPlugin();

const globalSearchPlugin: Plugin<typeof settings> = {
  id: 'global-search',
  name: 'Global Search',
  description: 'Quick search for everything in SEQTA',
  version: '1.0.0',
  settings: settingsInstance.settings,
  disableToggle: true,

  // Add some basic styles for our search UI
  styles: styles,

  run: async (api) => {
    let app: any;

    // Create search button
    api.seqta.onMount('#title', (titleElement) => {
      // Create search button
      const searchButton = document.createElement('div');
      searchButton.className = 'search-trigger';
      searchButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>

        <p>Quick search...</p>
        <span style="margin-left: auto; display: flex; align-items: center; color: #777; font-size: 12px;">⌘K</span>
      `;
      
      // Add button before the title
      titleElement.appendChild(searchButton);
      
      // Create shadow DOM for Svelte component
      const searchRoot = document.createElement('div');
      document.body.appendChild(searchRoot);
      const searchRootShadow = searchRoot.attachShadow({ mode: 'open' });
      
      // Mount Svelte component in shadow DOM
      app = renderSvelte(SearchBar, searchRootShadow);
      
      // Handle click on search button
      searchButton.addEventListener('click', () => {
        // @ts-ignore
        window.setCommandPalleteOpen(true);
      });
    });

    // Clean up
    return () => {
      const searchButton = document.querySelector('.search-trigger');
      const searchRoot = document.querySelector('.global-search-root');
      if (searchButton) searchButton.remove();
      if (searchRoot) searchRoot.remove();

      unmount(app);
    };
  }
};

export default globalSearchPlugin; 