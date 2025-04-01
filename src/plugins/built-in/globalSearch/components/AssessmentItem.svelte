<script lang="ts">
  import { highlightMatch, highlightSnippet } from '../highlightUtils';
  import type { DynamicContentItem } from '../dynamicSearch';

  const { item, isSelected, searchTerm, result } = $props<{
    item: DynamicContentItem;
    isSelected: boolean;
    searchTerm: string;
    result: { matches: string[] };
  }>();
    
  /* const dueDate = $derived(item.metadata?.dueDate 
    ? new Date(item.metadata.dueDate)
    : null); */
    
  /* const formattedDueDate = $derived(dueDate
    ? dueDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'No due date'); */
    
  //const isPastDue = $derived(dueDate ? dueDate.getTime() < Date.now() : false);
</script>

<button
  class="w-full flex flex-col px-2 py-1.5 rounded-lg select-none cursor-pointer group 
  {isSelected ? 'bg-zinc-900/5 dark:bg-white/10 text-zinc-900 dark:text-white' : 'hover:bg-zinc-500/5 dark:hover:bg-white/5 text-zinc-800 dark:text-zinc-200'}"
  onclick={() => { item.action(); }}
  >
  <div class="flex items-center w-full">
      <div class="flex-none w-8 h-8 text-xl font-IconFamily flex items-center justify-center {isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}">{item.icon}</div>
      <span class="ml-4 text-lg truncate">
      {@html highlightMatch(item.text, searchTerm, result.matches)}
      </span>
      <span class="flex-none ml-auto text-xs text-zinc-500 dark:text-zinc-400">
      {item.category} 
      </span>
  </div>
  {#if item.content}
      <div class="mt-1 ml-12 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 text-start">
      {@html highlightSnippet(item.content, searchTerm, result.matches)}
      </div>
  {/if}
</button>

<style>
  .highlight {
    background-color: rgba(255, 213, 0, 0.3);
    font-weight: 500;
    border-radius: 2px;
  }
  
  .due-badge {
    font-size: 0.65rem;
  }
</style> 