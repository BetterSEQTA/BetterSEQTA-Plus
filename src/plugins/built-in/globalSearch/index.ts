import type { Plugin } from '@/plugins/core/types';
import { BasePlugin } from '@/plugins/core/settings';
import { booleanSetting, defineSettings, Setting, stringSetting } from '@/plugins/core/settingsHelpers';
import renderSvelte from '@/interface/main';
import SearchBar from './SearchBar.svelte';
import styles from './styles.css?inline';
import { unmount } from 'svelte';
import { type DynamicContentItem, loadDynamicItems } from './dynamicSearch';
import { waitForElm } from '@/seqta/utils/waitForElm';

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
  }),
  transparencyEffects: booleanSetting({
    default: true,
    title: 'Transparency Effects',
    description: 'Enable transparency effects for the search bar',
  }),
});

class GlobalSearchPlugin extends BasePlugin<typeof settings> {
  @Setting(settings.searchHotkey)
  searchHotkey!: string;

  @Setting(settings.showRecentFirst)
  showRecentFirst!: boolean;

  @Setting(settings.transparencyEffects)
  transparencyEffects!: boolean;
}

const settingsInstance = new GlobalSearchPlugin();

const createSampleDynamicData = (): DynamicContentItem[] => {
  const sampleMessages = [
    {
      id: 'message_1',
      text: 'Assignment Discussion',
      category: 'messages',
      contentType: 'message' as const,
      icon: '\uea6e',
      content: 'Hey everyone, I was wondering if anyone could help me with the Physics assignment on circular motion. I\'m stuck on question 3 about centripetal force.',
      dateAdded: Date.now() - 1000 * 60 * 60 * 2,
      action: () => console.log('Open message 1'),
      keywords: ['John Smith', 'message', 'chat'],
      metadata: { author: 'John Smith'}
    },
  ];

  const sampleCourses = [
    {
      id: 'course_1',
      text: 'Physics 101',
      category: 'courses',
      contentType: 'course' as const,
      icon: '\uea67',
      content: 'An introduction to mechanics, thermodynamics, and wave phenomena.',
      dateAdded: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 days ago
      action: () => console.log('Open Physics course'),
      keywords: ['Dr. Richard Feynman', 'course', 'class'],
      metadata: { teacher: 'Dr. Richard Feynman' }
    },
  ];

  const sampleAssessments = [
     {
      id: 'assessment_1',
      text: 'Physics Lab Report',
      category: 'assessments',
      contentType: 'assessment' as const,
      icon: '\uebb3',
      content: 'Complete a lab report on the pendulum experiment.',
      dateAdded: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
      action: () => console.log('Open Physics assessment'),
      keywords: ['Physics 101', 'assessment', 'homework'],
      metadata: { dueDate: Date.now() + 1000 * 60 * 60 * 24 * 3 } 
    },
  ];

  return [...sampleMessages, ...sampleCourses, ...sampleAssessments];
};

const globalSearchPlugin: Plugin<typeof settings> = {
  id: 'global-search',
  name: 'Global Search',
  description: 'Quick search for everything in SEQTA',
  version: '1.0.0',
  settings: settingsInstance.settings,
  disableToggle: true,
  styles: styles,

  run: async (api) => {
    let app: any;

    const dynamicData = createSampleDynamicData();
    loadDynamicItems(dynamicData);

    const mountSearchBar = (titleElement: Element) => {
      if (titleElement.querySelector('.search-trigger')) {
        return;
      }
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
      
      console.log('adding event listener to search button');
      // Handle click on search button
      searchButton.addEventListener('click', () => {
        console.log('search button clicked');
        // @ts-ignore
        window.setCommandPalleteOpen(true);
      });
      
      // Mount Svelte component in shadow DOM
      try {
        app = renderSvelte(SearchBar, searchRootShadow, {
          transparencyEffects: api.settings.transparencyEffects ? true : false,
        });
      } catch (error) {
        console.error('Error rendering Svelte component:', error);
      }
    }

    const title = document.querySelector('#title');

    if (title) {
      mountSearchBar(title);
    } else {
      await waitForElm('#title', true, 100, 60);
      mountSearchBar(document.querySelector('#title') as Element);
    }

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