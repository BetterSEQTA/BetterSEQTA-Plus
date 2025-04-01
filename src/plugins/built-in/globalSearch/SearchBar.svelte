<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { settingsState } from '@/seqta/utils/listeners/SettingsState'
  import { fade, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { getStaticCommands, type StaticCommandItem } from './commands';
  import { getAllDynamicItems, type DynamicContentItem } from './dynamicSearch';
  import type { CombinedResult } from './types';
  import { createSearchIndexes, performSearch as doSearch } from './searchUtils';
  import { highlightMatch, highlightSnippet } from './highlightUtils';
  import Fuse from 'fuse.js';
  import Calculator from './Calculator.svelte';

  const { transparencyEffects } = $props<{ transparencyEffects: boolean }>();

  let commandsFuse = $state<Fuse<StaticCommandItem>>();
  let dynamicContentFuse = $state<Fuse<DynamicContentItem>>();
  
  const dynamicIdToItemMap = $state(new Map<string, DynamicContentItem>());
  const commandIdToItemMap = $state(new Map<string, StaticCommandItem>());

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

  let commandPalleteOpen = $state(false);
  let searchTerm = $state('');
  let selectedIndex = $state(0);
  let searchbar = $state<HTMLInputElement>();
  let combinedResults = $state<CombinedResult[]>([]); 
  let isLoading = $state(false);
  let prevSearchTerm = $state('');
  let calculatorResult = $state<string | null>(null);

  // Function to check if calculator has a result
  const updateCalculatorState = (hasResult: string | null) => {
    calculatorResult = hasResult;
  };

  onMount(() => {
    setupSearchIndexes();
    
    // @ts-ignore
    window.setCommandPalleteOpen = (open: boolean) => {
      commandPalleteOpen = open;
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        commandPalleteOpen = true;
        tick().then(() => searchbar?.focus());
      }
      if (e.key === 'Escape') {
        commandPalleteOpen = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  const performSearch = () => {
    isLoading = true;
    selectedIndex = 0;

    const term = searchTerm.trim().toLowerCase();
    
    if (commandsFuse && dynamicContentFuse) {
      combinedResults = doSearch(
        term, 
        commandsFuse, 
        dynamicContentFuse, 
        commandIdToItemMap, 
        dynamicIdToItemMap
      );
    } else {
      combinedResults = [];
    }
    
    isLoading = false;
  };

  $effect(() => {
    if (commandPalleteOpen) {
      performSearch();
      tick().then(() => searchbar?.focus()); 
    } else {
      searchTerm = '';
      selectedIndex = 0;
      prevSearchTerm = '';
      combinedResults = [];
    }
  });

  $effect(() => {
    if (commandPalleteOpen && searchTerm !== prevSearchTerm) {
      prevSearchTerm = searchTerm;
      performSearch();
    }
  });

  const selectNext = () => {
    if (calculatorResult && selectedIndex === -1) {
      selectedIndex = 0; // Move from calculator to first search result
    } else if (selectedIndex < combinedResults.length - 1) {
      selectedIndex++;
    }
  };

  const selectPrev = () => {
    if (selectedIndex > 0) {
      selectedIndex--;
    } else if (selectedIndex === 0 && calculatorResult) {
      selectedIndex = -1; // Move from first search result to calculator
    }
  };

  const executeSelected = () => {
    if (selectedIndex === -1 && calculatorResult) {
      if (calculatorResult) {
        navigator.clipboard.writeText(calculatorResult);
      }
    } else {
      combinedResults[selectedIndex]?.item.action();
    }
    commandPalleteOpen = false;
  };

  const handleKeyNav = (e: KeyboardEvent) => {
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
      transition:fade={{ duration: 150 }}
    ></div>

    <div class="fixed inset-0 z-[50000] flex justify-center place-items-start p-8 sm:p-6 md:p-8 select-none" 
         onclick={() => commandPalleteOpen = false}
         onkeydown={(e) => e.key === 'Escape' && (commandPalleteOpen = false)}
         role="button"
         tabindex="0">
      <div
        class="w-full max-w-2xl rounded-xl ring-1 shadow-2xl ring-black/5 dark:ring-white/10 { transparencyEffects ? 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur' : 'bg-white dark:bg-zinc-900' }"
        transition:scale={{ duration: 200, start: 0.95, opacity: 0, easing: quintOut }}
        onclick={(e) => {
          e.stopPropagation();
        }}
        onkeydown={(e) => {
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

        <Calculator 
          searchTerm={searchTerm} 
          isSelected={selectedIndex === -1} 
          on:hasResult={(e) => updateCalculatorState(e.detail)}
        />

        {#if combinedResults.length > 0}
          <ul class="overflow-y-auto max-h-[32rem] text-base scroll-py-2 p-1 gap-0.5 flex flex-col">
            {#each combinedResults as result, i (result.id)} 
              {@const isSelected = selectedIndex === i}
              {@const item = result.item} 
              <li>
                {#if result.type === 'command'}
                  <!-- Render Static Command -->
                  {@const staticItem = item as StaticCommandItem}
                  <button
                    class="w-full flex items-center px-2 py-1.5 rounded-lg transition duration-150 select-none cursor-pointer group 
                    {isSelected ? 'bg-zinc-900/5 dark:bg-white/10 text-zinc-900 dark:text-white' : 'hover:bg-zinc-500/5 dark:hover:bg-white/5 text-zinc-800 dark:text-zinc-200'}"
                    onclick={() => { staticItem.action(); commandPalleteOpen = false; }}
                  >
                    <div class="flex-none w-8 h-8 text-xl font-IconFamily flex items-center justify-center {isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}">{staticItem.icon}</div>
                    <span class="ml-4 text-lg truncate">
                      {@html highlightMatch(staticItem.text, searchTerm, result.matches)}
                    </span>
                    {#if staticItem.keybindLabel}
                      <span class="flex-none ml-auto text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                        <kbd class="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800">{staticItem.keybindLabel}</kbd>
                      </span>
                    {/if}
                  </button>
                {:else if result.type === 'dynamic'}
                  <!-- Render Dynamic Content Item -->
                  {@const dynamicItem = item as DynamicContentItem}
                  <button
                    class="w-full flex flex-col px-2 py-1.5 rounded-lg transition duration-150 select-none cursor-pointer group 
                    {isSelected ? 'bg-zinc-900/5 dark:bg-white/10 text-zinc-900 dark:text-white' : 'hover:bg-zinc-500/5 dark:hover:bg-white/5 text-zinc-800 dark:text-zinc-200'}"
                    onclick={() => { dynamicItem.action(); commandPalleteOpen = false; }}
                  >
                    <div class="flex items-center w-full">
                      <div class="flex-none w-8 h-8 text-xl font-IconFamily flex items-center justify-center {isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}">{dynamicItem.icon}</div>
                      <span class="ml-4 text-lg truncate">
                        {@html highlightMatch(dynamicItem.text, searchTerm, result.matches)}
                      </span>
                      <span class="flex-none ml-auto text-xs text-zinc-500 dark:text-zinc-400">
                        {dynamicItem.category} 
                      </span>
                    </div>
                    {#if dynamicItem.content}
                      <div class="mt-1 ml-12 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 text-start">
                        {@html highlightSnippet(dynamicItem.content, searchTerm, result.matches)}
                      </div>
                    {/if}
                  </button>
                {/if}
              </li>
            {/each}
          </ul>
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
      </div>
    </div>
  </div>
{/if}

<style>
  :global(.highlight) {
    background-color: rgba(200, 200, 200, 0.3);
    font-weight: 500;
    border-radius: 2px;
    padding: 0 2px;
    margin: 0 -2px;
  }

  .dark :global(.highlight) {
    background-color: rgba(79, 79, 79, 0.2);
  }
</style>