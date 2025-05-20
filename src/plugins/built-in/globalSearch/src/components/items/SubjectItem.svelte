<script lang="ts">
  import HighlightedText from '../../utils/HighlightedText.svelte';
import type { IndexItem } from '../../indexing/types';
  import type { FuseResultMatch } from '../../core/types';

  export let item: IndexItem;
  export let isSelected: boolean;
  export let searchTerm: string;
  export let matches: readonly FuseResultMatch[] | undefined;
  export let onclick: (() => void) | undefined;


</script>

<button
  class="w-full flex flex-col px-2 py-1.5 rounded-lg select-none cursor-pointer group transition-colors duration-100
  {isSelected ? 'bg-zinc-900/5 dark:bg-white/10 text-zinc-900 dark:text-white' : 'hover:bg-zinc-500/5 dark:hover:bg-white/5 text-zinc-800 dark:text-zinc-200'}"
  onclick={onclick}
>
  <div class="flex items-center w-full {item.metadata.isActive ? 'opacity-100' : 'opacity-70'}">
    <div class="flex-none w-8 h-8 text-xl font-IconFamily flex items-center justify-center {isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}">
      {item.metadata?.type === 'assessments' ? '\ueac3' : '\ueb4d'}
    </div>
    <span class="ml-4 text-lg truncate">
      <HighlightedText text={item.text} term={searchTerm} matches={matches} />
    </span>
    <span class="flex-none ml-auto text-xs text-zinc-500 dark:text-zinc-400">
      {item.metadata?.subjectCode}
    </span>
  </div>
  {#if item.content}
    <div class="mt-1 ml-12 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 text-start">
      <HighlightedText text={item.content} term={searchTerm} matches={matches} />
    </div>
  {/if}
</button> 