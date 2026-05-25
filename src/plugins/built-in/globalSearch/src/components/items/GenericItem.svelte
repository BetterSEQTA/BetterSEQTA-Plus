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

  const categoryLabel = (category: string): string => {
    if (!category) return '';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const gradientForCategory = (category: string): string => {
    switch (category) {
      case 'courses':
        return 'from-[#7c5fe0] to-[#4d2bb8]';
      case 'notices':
        return 'from-[#f6c453] to-[#d39007]';
      case 'documents':
        return 'from-[#4FBBFE] to-[#2090F3]';
      case 'folio':
        return 'from-[#22c55e] to-[#0f9b3a]';
      case 'portals':
        return 'from-[#22d3ee] to-[#0e7490]';
      case 'reports':
        return 'from-[#f97316] to-[#c2410c]';
      case 'goals':
        return 'from-[#10b981] to-[#047857]';
      case 'passive':
        return 'from-[#6b7280] to-[#374151]';
      default:
        return 'from-[#4FBBFE] to-[#2090F3]';
    }
  };

  const fallbackIcon = (category: string): string => {
    switch (category) {
      case 'courses':
        return '\ueb4d';
      case 'notices':
        return '\ueb24';
      case 'documents':
        return '\ueb6f';
      case 'folio':
        return '\ueb16';
      case 'portals':
        return '\ueb01';
      case 'reports':
        return '\ueb70';
      case 'goals':
        return '\uea15';
      case 'passive':
        return '\ueb71';
      default:
        return '\ue924';
    }
  };
</script>

<button
  class="w-full flex flex-col px-2 py-1.5 rounded-lg select-none cursor-pointer group transition-colors duration-100 ring-0 dark:ring-zinc-600/50
  {isSelected ? 'bg-zinc-900/5 dark:bg-white/10 text-zinc-900 dark:text-white dark:ring-[1px] dark:shadow' : 'hover:bg-zinc-500/5 dark:hover:bg-white/5 text-zinc-800 dark:text-zinc-200'}"
  onclick={onclick}
>
  <div class="flex items-center w-full">
    <div
      class="flex-none scale-90 w-8 h-8 text-xl font-IconFamily flex items-center justify-center text-white rounded-md bg-gradient-to-br {gradientForCategory(item.category)}"
    >
      {item.metadata?.icon || fallbackIcon(item.category)}
    </div>
    <span class="ml-4 text-lg truncate">
      <HighlightedText text={item.text} term={searchTerm} matches={matches} />
    </span>
    <span class="flex-none ml-auto text-xs text-zinc-500 dark:text-zinc-400">
      {item.metadata?.subjectCode || categoryLabel(item.category)}
    </span>
  </div>
  {#if item.content}
    <div class="mt-1 ml-12 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 text-start">
      <HighlightedText text={item.content} term={searchTerm} matches={matches} />
    </div>
  {/if}
</button>
