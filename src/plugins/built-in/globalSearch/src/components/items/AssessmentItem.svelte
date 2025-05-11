<script lang="ts">
  // Import utility functions for highlighting search matches and stripping HTML while preserving highlights
  import { highlightMatch, highlightSnippet, stripHtmlButKeepHighlights } from '../../utils/highlight';
  // Import the type definition for a dynamic content item
  import type { DynamicContentItem } from '../../utils/dynamicItems';
  // Import the type definition for matches returned by the Fuse search library
  import type { FuseResultMatch } from '../../core/types';

  // Destructure props passed into the component, including the content item, selection state, search term, match data, and click handler
  const { item, isSelected, searchTerm, matches, onclick } = $props<{
    item: DynamicContentItem;
    isSelected: boolean;
    searchTerm: string;
    matches?: readonly FuseResultMatch[];
    onclick: () => void;
  }>();
</script>

<!-- Button representing a dynamic search result item -->
<button
  class="w-full flex flex-col px-2 py-1.5 rounded-lg select-none cursor-pointer group transition-colors duration-100
  {isSelected ? 'bg-zinc-900/5 dark:bg-white/10 text-zinc-900 dark:text-white' : 'hover:bg-zinc-500/5 dark:hover:bg-white/5 text-zinc-800 dark:text-zinc-200'}"
  onclick={onclick}  <!-- Call the onclick handler when the button is clicked -->
  >
  <div class="flex items-center w-full">
    <!-- Icon area showing a custom icon or fallback character -->
    <div class="flex-none w-8 h-8 text-xl font-IconFamily flex items-center justify-center {isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}">{item.metadata?.icon || '\uebee'}</div>
    <!-- Highlighted title text, truncated if too long -->
    <span class="ml-4 text-lg truncate">
      {@html stripHtmlButKeepHighlights(highlightMatch(item.text, searchTerm, matches))}
    </span>
    <!-- Category label displayed on the right -->
    <span class="flex-none ml-auto text-xs text-zinc-500 dark:text-zinc-400">
      {item.category} 
    </span>
  </div>
  {#if item.content}
    <!-- Optional content snippet, highlighted and limited to two lines -->
    <div class="mt-1 ml-12 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 text-start">
      {@html stripHtmlButKeepHighlights(highlightSnippet(item.content, searchTerm, matches))}
    </div>
  {/if}
</button>
