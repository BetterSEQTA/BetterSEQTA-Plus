<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Fuse from 'fuse.js';
  import { settingsState } from '@/seqta/utils/listeners/SettingsState'
  import { fade, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  let commandPalleteOpen = $state(false);
  let searchTerm = $state('');
  let index = $state(0);
  let searchbar = $state<HTMLInputElement>();
  let filteredItems = $state<CommandItem[]>([]);

  $effect(() => {
    if (!commandPalleteOpen) {
      searchTerm = '';
      index = 0;
    }
  })

  interface CommandItem {
    icon: string;
    category: string;
    text: string;
    keybind: string[];
    keybindLabel: string;
    action: () => void;
  }

  const commandItems: CommandItem[] = [
    {
      icon: '\uec95',
      category: 'quick-action',
      text: 'Save File',
      keybind: ['ctrl+s'],
      keybindLabel: '⌘S',
      action: () => console.log('Save File')
    },
    {
      icon: '\ueadf',
      category: 'quick-action',
      text: 'Add New File',
      keybind: ['ctrl+n'],
      keybindLabel: '⌘N',
      action: () => console.log('Add New File')
    },
    {
      icon: '\ueb10',
      category: 'result',
      text: 'Favourite Folder',
      keybind: ['ctrl+o'],
      keybindLabel: 'Open Folder',
      action: () => console.log('Favourite Folder')
    },
    {
      icon: '\ueac4',
      category: 'result',
      text: 'Schoolwork',
      keybind: ['ctrl+o'],
      keybindLabel: 'Jump to...',
      action: () => console.log('Open file')
    }
  ];

  const fuse = new Fuse(commandItems, {
    includeScore: true,
    keys: ['text', 'keybind']
  });

  // Replace reactive block with $effect
  $effect(() => {
    if (searchTerm.trim()) {
      filteredItems = fuse.search(searchTerm).map(r => r.item);
    } else {
      filteredItems = commandItems;
    }
    index = 0;
  });

  onMount(() => {
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const selectNext = () => {
    if (index < filteredItems.length - 1) index++;
  };

  const selectPrev = () => {
    if (index > 0) index--;
  };

  const executeSelected = () => {
    filteredItems[index]?.action();
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

    <div class="fixed inset-0 z-[50000] flex justify-center place-items-start p-8 sm:p-6 md:p-8" 
         onclick={() => commandPalleteOpen = false}
         onkeydown={(e) => e.key === 'Escape' && (commandPalleteOpen = false)}
         role="button"
         tabindex="0">
      <div
        class="w-full max-w-2xl rounded-xl ring-1 shadow-2xl ring-black/5 dark:ring-white/10 { settingsState.transparencyEffects ? 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur' : 'bg-white dark:bg-zinc-900' }"
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
          <div class="absolute top-1/2 translate-y-[calc(-50%-4px)] scale-125 left-5 w-6 h-6 text-[1.3rem] text-zinc-900 dark:text-zinc-400 text-opacity-40 pointer-events-none font-IconFamily">
            {'\ueca5'}
          </div>
          <input
            bind:this={searchbar}
            bind:value={searchTerm}
            onkeydown={handleKeyNav}
            class="pr-4 pl-12 w-full h-12 text-lg bg-transparent border-0 outline-none placeholder-zinc-400 text-zinc-900 dark:placeholder-zinc-500 dark:text-white focus:ring-0 sm:text-xl"
            placeholder="Search..."
          />
        </div>

        {#if filteredItems.length > 0}
          <ul class="overflow-y-auto max-h-[32rem] text-base scroll-py-2 p-2 gap-2">
            {#each filteredItems as item, i (item.text)}
              <li>
                <button
                  class="w-full flex items-center px-2 py-1.5 rounded-md transition duration-100 select-none cursor-default group 
                  {i === index 
                    ? 'bg-zinc-900/5 dark:bg-white/10 text-zinc-900 dark:text-white' 
                    : 'hover:bg-zinc-500/5 dark:hover:bg-white/5 text-zinc-800 dark:text-zinc-200'}"
                  onclick={() => { item.action(); commandPalleteOpen = false; }}
                >
                  <div class="flex-none w-8 h-8 text-xl font-IconFamily flex items-center justify-center 
                  {i === index 
                    ? 'text-zinc-900 dark:text-white' 
                    : 'text-zinc-600 dark:text-zinc-400'}">{item.icon}</div>
                  <span class="ml-4 text-lg truncate">{item.text}</span>
                  <span class="flex-none ml-auto text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    <kbd class="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800">{item.keybindLabel}</kbd>
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        {:else}
          <div class="px-8 py-16 text-center text-zinc-900 dark:text-zinc-200 sm:px-16">
            <svg class="mx-auto w-8 h-8 text-opacity-40 dark:text-opacity-60" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            <p class="mt-6 text-lg dark:text-zinc-300">No matches found. Try something else.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}