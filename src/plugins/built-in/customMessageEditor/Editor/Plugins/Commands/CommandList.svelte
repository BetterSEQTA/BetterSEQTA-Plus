<script lang="ts">
  import { slashVisible, slashItems, slashLocation, slashProps, selectedIndex } from './stores';
  import { fly } from 'svelte/transition';
  import { get } from 'svelte/store';

  let height = $state(0);
  let elements = $state<any[]>([]);

  export function handleKeydown(event: any, editor: any) {
    if (!get(slashVisible)) return;

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      upHandler();
      return true;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      downHandler();
      return true;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      selectItem(editor);
      return true;
    }

    return false;
  }

  function upHandler() {
    const currentIndex = get(selectedIndex);
    const itemsLength = get(slashItems).length;
    const newIndex = currentIndex === 0 ? itemsLength - 1 : currentIndex - 1;
    selectedIndex.set(newIndex);
  }

  function downHandler() {
    const currentIndex = get(selectedIndex);
    const itemsLength = get(slashItems).length;
    const newIndex = currentIndex === itemsLength - 1 ? 0 : currentIndex + 1;
    selectedIndex.set(newIndex);
  }

  $effect(() => {
    const element = elements[$selectedIndex];
    if (!element) return;
    
    const container = element.closest('.overflow-auto');
    if (!container) return;
    
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const elementTop = elementRect.top - containerRect.top + container.scrollTop;
    const elementBottom = elementTop + elementRect.height;
    const containerHeight = containerRect.height;
    
    // Check if element is outside visible area
    if (elementTop < container.scrollTop) {
      // Element is above visible area
      container.scrollTop = elementTop - 8;
    } else if (elementBottom > container.scrollTop + containerHeight) {
      // Element is below visible area
      container.scrollTop = elementBottom - containerHeight + 8;
    }
  });

  function selectItem(editor: any) {
    const item = get(slashItems)[get(selectedIndex)];

    if (item) {
      let range = get(slashProps).range;
      item.command({ editor, range });
      slashVisible.set(false);
    }
  }

  function closeSlashMenu() {
    slashVisible.set(false);
    selectedIndex.set(0);
  }

  function handleItemClick(item: any) {
    const editor = get(slashProps).editor;
    const range = get(slashProps).range;
    slashVisible.set(false);
    selectedIndex.set(0);
    item.command({ editor, range });
  }

  function getCommandIcon(title: string): string {
    const icons: Record<string, string> = {
      'To Dos':
        '<svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path></svg>',
      'Heading 1':
        '<svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path><text x="2" y="18" font-size="12" font-weight="bold" fill="currentColor">H1</text></svg>',
      'Heading 2':
        '<svg class="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path><text x="2" y="18" font-size="12" font-weight="bold" fill="currentColor">H2</text></svg>',
      'Heading 3':
        '<svg class="w-5 h-5 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path><text x="2" y="18" font-size="12" font-weight="bold" fill="currentColor">H3</text></svg>',
      'Bullet List':
        '<svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>',
      'Numbered List':
        '<svg class="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>',
      Text: '<svg class="w-5 h-5 text-zinc-300" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clip-rule="evenodd"></path><path d="M8 6h4M8 8h4M8 10h2"></path></svg>',
      Quote:
        '<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0-3a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0-3a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0-3a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm8-3a3 3 0 11-6 0 3 3 0 016 0z" clip-rule="evenodd"></path></svg>',
      'Code Block':
        '<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>',
      Divider:
        '<svg class="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>',
      'Bold Text':
        '<svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4v12h3.5c2.5 0 4.5-2 4.5-4.5S12 7 9.5 7H9V4H6zm3 5.5h.5c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5H9V9.5z"></path></svg>',
      'Italic Text':
        '<svg class="w-5 h-5 text-pink-400" fill="currentColor" viewBox="0 0 20 20"><path d="M8 4h4l-2 12H6l2-12z"></path></svg>',
      Link: '<svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clip-rule="evenodd"></path></svg>',
      'Inline Code':
        '<svg class="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm4.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L14.586 7l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>',
    };

    return (
      icons[title] ||
      '<svg class="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>'
    );
  }
</script>

<svelte:window bind:innerHeight={height} />

{#if $slashVisible}
  <div
    class="fixed top-0 w-full h-screen"
    onkeydown={() => {}}
    onclick={closeSlashMenu}
    role="menu"
    tabindex="-1">
  </div>
  
  <div
    transition:fly={{ y: 10, duration: 300 }}
    class="overflow-auto absolute pb-2 w-80 max-w-full max-h-80 rounded-xl border shadow-xl backdrop-blur-lg origin-top-left scale-125 dark:bg-zinc-900/70 bg-zinc-100/70 dark:border-zinc-700/20 border-zinc-200"
    style="left: {$slashLocation.x}px; top: {$slashLocation.y + $slashLocation.height + 320 > height
      ? $slashLocation.y - $slashLocation.height - 320
      : $slashLocation.y + $slashLocation.height}px;">
    <div class="p-2 text-sm text-zinc-500">Basic Blocks</div>
    {#each $slashItems as { title, subtitle, command }, i}
      <div
        class="p-2 flex gap-3 cursor-pointer {i == $selectedIndex &&
          'dark:bg-zinc-950/50 bg-zinc-300/50'} dark:hover:bg-zinc-950/30 hover:bg-zinc-300/20 rounded-lg mx-2"
        onclick={() => handleItemClick({ command })}
        onkeydown={() => {}}
        role="menuitem"
        tabindex="-1"
        bind:this={elements[i]}>
        <div class="flex justify-center items-center w-8 h-8 rounded-lg bg-zinc-800">
          {@html getCommandIcon(title)}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate dark:text-white">
            {title}
          </div>
          <p class="text-xs truncate text-zinc-400">
            {subtitle ? subtitle : ''}
          </p>
        </div>
      </div>
    {/each}
  </div>
{/if}
