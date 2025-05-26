<script lang="ts">
  import HighlightedText from '../../utils/HighlightedText.svelte';
  import type { DynamicContentItem } from '../../utils/dynamicItems';
  import type { FuseResultMatch } from '../../core/types';

  const { item, isSelected, searchTerm, matches, onclick } = $props<{
    item: DynamicContentItem;
    isSelected: boolean;
    searchTerm: string;
    matches?: readonly FuseResultMatch[];
    onclick: () => void;
  }>();
</script>

<button
  class="w-full flex flex-col px-2 py-1.5 rounded-lg select-none cursor-pointer group transition-colors duration-100 ring-0 dark:ring-zinc-600/50
  {isSelected ? 'bg-zinc-900/5 dark:bg-white/10 text-zinc-900 dark:text-white dark:ring-[1px] dark:shadow' : 'hover:bg-zinc-500/5 dark:hover:bg-white/5 text-zinc-800 dark:text-zinc-200'}"
  onclick={onclick}
  >
  <div class="flex items-center w-full">
    <div class="flex-none scale-90 w-8 h-8 text-xl font-IconFamily flex items-center justify-center text-white bg-gradient-to-br from-[#59aaf6] to-[#1b62c6] rounded-md">{item.metadata?.icon || '\uebe7'}</div>
    <span class="ml-4 text-lg truncate {item.metadata?.closed ? 'line-through opacity-80' : ''}">
      <HighlightedText text={item.text} term={searchTerm} matches={matches} />
    </span>
    <span class="flex-none ml-auto text-xs text-zinc-500 dark:text-zinc-400">
      {item.category} 
    </span>
  </div>
</button>