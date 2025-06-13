<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { settingsState } from '@/seqta/utils/listeners/SettingsState'
  import { fade, scale } from 'svelte/transition';
  import { circOut, quintOut } from 'svelte/easing';
  import { type StaticCommandItem } from '../core/commands';
  import type { CombinedResult } from '../core/types';
  import { createSearchIndexes, performSearch as doSearch } from '../search/searchUtils';
  import Fuse from 'fuse.js';
  import Calculator from './Calculator.svelte';
  import { actionMap } from '../indexing/actions';
  import type { IndexItem } from '../indexing/types';
  import debounce from 'lodash/debounce';
  import { renderComponentMap } from '../indexing/renderComponents';
  import HighlightedText from '../utils/HighlightedText.svelte';
  import { matchesHotkey } from '../utils/hotkeyUtils';
  import browser from 'webextension-polyfill';

  const { 
    transparencyEffects, 
    searchHotkey: initialSearchHotkey
  } = $props<{ 
    transparencyEffects: boolean, 
    searchHotkey: string
  }>();

  let currentSearchHotkey = $state(initialSearchHotkey);

  let commandsFuse = $state<Fuse<StaticCommandItem>>();
  let dynamicContentFuse = $state<Fuse<IndexItem>>();
  
  const dynamicIdToItemMap = $state(new Map<string, IndexItem>());
  const commandIdToItemMap = $state(new Map<string, StaticCommandItem>());

  let isIndexing = $state(false);
  let completedJobs = $state(0);
  let totalJobs = $state(0);

  let commandPalleteOpen = $state(false);
  let searchTerm = $state('');
  let selectedIndex = $state(0);
  let combinedResults = $state<CombinedResult[]>([]);
  let searchbar = $state<HTMLInputElement>();

  let isLoading = $state(false);
  let calculatorResult = $state<string | null>(null);
  let resultsList = $state<HTMLUListElement>();

  const updateCalculatorState = (hasResult: string | null) => {
    calculatorResult = hasResult;
  };

  let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  // Listen for setting changes
  $effect(() => {
    const loadSettings = async () => {
      const settings = await browser.storage.local.get('plugin.global-search.settings');
      const pluginSettings = settings['plugin.global-search.settings'] as { searchHotkey?: string } | undefined;
      if (pluginSettings?.searchHotkey) {
        currentSearchHotkey = pluginSettings.searchHotkey;
      }
    };

    loadSettings();

    // Listen for storage changes
    const handleStorageChange = (changes: any, area: string) => {
      if (area === 'local' && changes['plugin.global-search.settings']) {
        const newSettings = changes['plugin.global-search.settings'].newValue as { searchHotkey?: string } | undefined;
        if (newSettings?.searchHotkey) {
          currentSearchHotkey = newSettings.searchHotkey;
        }
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  });

  // Update keydown handler when hotkey changes
  $effect(() => {
    if (keydownHandler) {
      window.removeEventListener('keydown', keydownHandler);
    }
    
    keydownHandler = (e: KeyboardEvent) => {
      if (matchesHotkey(e, currentSearchHotkey)) {
        e.preventDefault();
        commandPalleteOpen = true;
        tick().then(() => searchbar?.focus());
      }
      if (e.key === 'Escape') {
        commandPalleteOpen = false;
      }
    };
    
    window.addEventListener('keydown', keydownHandler);
    
    return () => {
      if (keydownHandler) {
        window.removeEventListener('keydown', keydownHandler);
        keydownHandler = null;
      }
    };
  });

  onMount(() => {
    const progressHandler = (event: CustomEvent) => {
      const { completed, total, indexing } = event.detail;
      completedJobs = completed;
      totalJobs = total;
      isIndexing = indexing;
    };

    window.addEventListener('indexing-progress', progressHandler as EventListener);
    
    const itemsUpdatedHandler = () => {
      setupSearchIndexes();
      performSearch();
    };
    window.addEventListener('dynamic-items-updated', itemsUpdatedHandler);

    setupSearchIndexes();
    
    // @ts-ignore - Intentionally adding to window
    window.setCommandPalleteOpen = (open: boolean) => {
      commandPalleteOpen = open;
    };

    return () => {
      window.removeEventListener('indexing-progress', progressHandler as EventListener);
      window.removeEventListener('dynamic-items-updated', itemsUpdatedHandler);
    };
  });

  function setupSearchIndexes() {
    const { commandsFuse: cfuse, dynamicContentFuse: dfuse, commands, dynamicItems } = createSearchIndexes();
    
    commandsFuse = cfuse;
    dynamicContentFuse = dfuse;
    
    dynamicIdToItemMap.clear();
    commandIdToItemMap.clear();
    
    dynamicItems.forEach(item => dynamicIdToItemMap.set(item.id, item));
    commands.forEach(item => commandIdToItemMap.set(item.id, item));
    
    console.debug(`[Global Search] Indexed ${commands.length} command items and ${dynamicItems.length} dynamic items.`);
  }

  const performSearch = async () => {
    isLoading = true;
    selectedIndex = 0;

    tick().then(() => {
      const selectedElement = resultsList?.querySelector(`li:nth-child(1)`);
      selectedElement?.scrollIntoView({ block: 'nearest' });
    });

    const term = searchTerm.trim().toLowerCase();
    
    if (commandsFuse && dynamicContentFuse) {
      combinedResults = await doSearch(
        term, 
        commandsFuse, 
        commandIdToItemMap, 
      );
    } else {
      combinedResults = [];
    }
    
    isLoading = false;
  };

  const debouncedPerformSearch = debounce(performSearch, 20);

  $effect(() => {
    if (commandPalleteOpen) {
      if (searchTerm === '') {
        performSearch();
      } else {
        debouncedPerformSearch();
      }
      tick().then(() => searchbar?.focus()); 
    } else {
      searchTerm = '';
      selectedIndex = 0;
      combinedResults = [];
    }
  });

  $effect(() => {
    if (combinedResults.length === 0 && calculatorResult && commandPalleteOpen) {
      selectedIndex = 0;
    }
  });

  const selectNext = () => {
    const maxIndex = (calculatorResult ? 1 : 0) + combinedResults.length - 1;
    if (selectedIndex < maxIndex) {
      selectedIndex++;
      tick().then(() => {
        const selectedElement = resultsList?.querySelector(`li:nth-child(${selectedIndex + 1})`);
        selectedElement?.scrollIntoView({ block: 'nearest' });
      });
    }
  };

  const selectPrev = () => {
    if (selectedIndex > 0) {
      selectedIndex--;
      tick().then(() => {
        const selectedElement = resultsList?.querySelector(`li:nth-child(${selectedIndex + 1})`);
        selectedElement?.scrollIntoView({ block: 'nearest' });
      });
    }
  };

  function executeItemAction(item: StaticCommandItem | IndexItem) {
    if ('action' in item && typeof item.action === 'function') {
      (item as StaticCommandItem).action();
    } else if ('actionId' in item && item.actionId && actionMap[item.actionId]) {
      actionMap[item.actionId](item as IndexItem);
    }
    commandPalleteOpen = false;
  }

  const executeSelected = () => {
    if (calculatorResult && selectedIndex === 0) {
      navigator.clipboard.writeText(calculatorResult);
      commandPalleteOpen = false;
    } else {
      const resultIndex = calculatorResult ? selectedIndex - 1 : selectedIndex;
      const result = combinedResults[resultIndex];
      if (result?.item) {
        executeItemAction(result.item);
      }
    }
  };

  const handleKeyNav = (e: KeyboardEvent) => {
    // Handle regular navigation
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectNext();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectPrev();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeSelected();
    } else if (e.key === 'Escape') {
      commandPalleteOpen = false;
    }
  };
</script>

{#if commandPalleteOpen}
  <div role="dialog" aria-modal="true" class={settingsState.DarkMode ? 'dark' : ''}>
    <div 
      class="fixed inset-0 z-[50000] bg-zinc-900/40 dark:bg-black/60" 
      transition:fade={{ duration: 150, easing: quintOut }}
    ></div>

    <div class="fixed inset-0 z-[50000] flex justify-center place-items-start p-8 sm:p-6 md:p-8 select-none scale-120 origin-top" 
         onclick={() => commandPalleteOpen = false}
         onkeydown={(e: KeyboardEvent) => e.key === 'Escape' && (commandPalleteOpen = false)}
         role="button"
         tabindex="0">
      <div
        class="w-full max-w-2xl overflow-clip rounded-xl ring-1 shadow-2xl ring-black/5 dark:ring-white/10 { transparencyEffects ? 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl' : 'bg-white dark:bg-zinc-900' }"
        transition:scale={{ duration: 100, start: 0.95, opacity: 0, easing: circOut }}
        onclick={(e: MouseEvent) => {
          e.stopPropagation();
        }}
        onkeydown={(e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            commandPalleteOpen = false;
          }
        }}
        role="button"
        tabindex="0">

        <div class="relative p-2 border-b border-zinc-900/5 dark:border-zinc-100/5">
          <div class="absolute top-1/2 translate-y-[calc(-50%-3px)] scale-105 left-5 w-6 h-6 text-[1.3rem] text-zinc-900 dark:text-zinc-400 text-opacity-40 pointer-events-none font-IconFamily">
            {'\ueca5'}
          </div>
          <input
            bind:this={searchbar}
            bind:value={searchTerm}
            onkeydown={handleKeyNav}
            class="pr-4 pl-12 w-full h-10 text-lg bg-transparent border-0 outline-none placeholder-zinc-400 text-zinc-700 dark:placeholder-zinc-500 dark:text-white focus:ring-0 sm:text-xl"
            placeholder="Search..."
          />
        </div>

        <ul 
          bind:this={resultsList}
          class="overflow-y-auto max-h-[24rem] text-base scroll-py-2 p-2 gap-0.5 flex flex-col"
        >
          <Calculator 
            searchTerm={searchTerm} 
            isSelected={selectedIndex === 0} 
            on:hasResult={(e) => updateCalculatorState(e.detail)}
          />
          
          {#if combinedResults.length > 0}
            {#each combinedResults as result, i (result.id)} 
              {@const isSelected = selectedIndex === (calculatorResult ? i + 1 : i)}
              {@const item = result.item} 
              <li>
                {#if result.type === 'command'}
                  {@const staticItem = item as StaticCommandItem}
                  <button
                    class="w-full flex items-center px-2 py-1.5 rounded-lg select-none cursor-pointer group transition-colors duration-100 ring-0 dark:ring-zinc-600/50
                    {isSelected ? 'bg-zinc-900/5 dark:bg-white/10 text-zinc-900 dark:text-white dark:ring-[1px] dark:shadow' : 'hover:bg-zinc-500/5 dark:hover:bg-white/5 text-zinc-800 dark:text-zinc-200'}"
                    onclick={() => executeItemAction(staticItem)}
                  >
                    <div class="flex-none scale-90 w-8 h-8 text-xl font-IconFamily flex items-center justify-center bg-gradient-to-br {staticItem.category === 'navigation' ? 'from-[#FA5D5D] to-[#DC2F30]' : 'from-[#4FBBFE] to-[#2090F3]'} rounded-md text-white">{staticItem.icon}</div>
                    <span class="ml-4 text-lg truncate">
                      <HighlightedText text={staticItem.text} term={searchTerm} matches={result.matches} />
                    </span>
                  </button>
                {:else if result.type === 'dynamic'}
                  {@const dynamicItem = item as IndexItem}
                  {@const RenderComponent = renderComponentMap[dynamicItem.renderComponentId]}
                  {#if RenderComponent}
                    <RenderComponent 
                      item={dynamicItem} 
                      isSelected={isSelected}
                      searchTerm={searchTerm} 
                      matches={result.matches} 
                      onclick={() => executeItemAction(dynamicItem)}
                      onkeydown={() => executeItemAction(dynamicItem)}
                      role="button"
                      tabindex="0"
                    />
                  {:else}
                    <button
                      class="w-full flex flex-col px-2 py-1.5 rounded-lg select-none cursor-pointer group 
                      {isSelected ? 'bg-zinc-900/5 dark:bg-white/10 text-zinc-900 dark:text-white dark:ring-[1px]' : 'hover:bg-zinc-500/5 dark:hover:bg-white/5 text-zinc-800 dark:text-zinc-200'}"
                      onclick={() => executeItemAction(dynamicItem)}
                    >
                      <div class="flex items-center w-full">
                        <div class="flex-none w-8 h-8 text-xl font-IconFamily flex items-center justify-center {isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}">{dynamicItem.metadata?.icon || '\ue924'}</div>
                        <span class="ml-4 text-lg truncate">
                          <HighlightedText text={dynamicItem.text} term={searchTerm} matches={result.matches} />
                        </span>
                        <span class="flex-none ml-auto text-xs text-zinc-500 dark:text-zinc-400">
                          {dynamicItem.category} 
                        </span>
                      </div>
                      {#if dynamicItem.content}
                        <div class="mt-1 ml-12 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 text-start">
                          <HighlightedText text={dynamicItem.content} term={searchTerm} matches={result.matches} />
                        </div>
                      {/if}
                    </button>
                  {/if}
                {/if}
              </li>
            {/each}
          {:else if !calculatorResult}
            <div class="px-8 py-16 text-center text-zinc-900 dark:text-zinc-200 sm:px-16">
              {#if isLoading}
                <div class="mx-auto w-8 h-8 rounded-full border-2 animate-spin border-zinc-300 dark:border-zinc-700 border-t-zinc-600 dark:border-t-zinc-300"></div>
                <p class="mt-4 text-lg dark:text-zinc-300">Searching...</p>
              {:else}
                <svg class="mx-auto w-8 h-8 text-opacity-40 dark:text-opacity-60" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                <p class="mt-6 text-lg dark:text-zinc-300">No matches found. Try something else.</p>
              {/if}
            </div>
          {/if}
        </ul>
        <div class="px-3 py-2 w-full border-t border-zinc-900/5 dark:border-zinc-100/5 bg-white/5">
          {#if combinedResults.length > 0 || calculatorResult}
            <div class="flex justify-between items-center h-7 text-sm text-zinc-500 dark:text-zinc-400">
              <div class="flex gap-4 items-center">
                {@render Shortcut({ text: 'Navigate', keybind: ['↑', '↓']})}
                {#if calculatorResult && selectedIndex === 0}
                {@render Shortcut({ text: 'Copy result', keybind: ['↵']})}
                {:else}
                {@render Shortcut({ text: 'Select', keybind: ['↵']})}
                {/if}
              </div>
              {#if isIndexing}
                <div class="inset-x-0 top-0">
                  <div class="absolute right-2 -bottom-4 text-[10px] text-zinc-500 dark:text-zinc-400">
                    Indexing
                  </div>
                  <div class="overflow-hidden h-0.5 bg-zinc-200 dark:bg-zinc-700">
                    <div 
                      class="h-full bg-blue-500 transition-all duration-300 ease-out"
                      style="width: {(completedJobs / totalJobs) * 100}%"
                    ></div>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

{#snippet Shortcut({ text, keybind }: { text: string, keybind: string[] }) }
  <div class="flex gap-2 items-center">
    <div class="flex gap-1 items-center">
      {#each keybind as key}
        <kbd class="size-6 text-[0.9rem] flex justify-center items-center rounded bg-zinc-100 dark:bg-zinc-100/10">{key}</kbd>
      {/each}
    </div>
    <span>{text}</span>
  </div>
{/snippet}