<script lang="ts">
  import { highlightMatch, stripHtmlButKeepHighlights } from '../../utils/highlight';
  import type { IndexItem } from '../../indexing/types';
  import type { FuseResultMatch } from '../../core/types';

  export let item: IndexItem;
  export let isSelected: boolean;
  export let searchTerm: string;
  export let matches: readonly FuseResultMatch[] | undefined;
  export let onclick: (() => void) | undefined;

  function handleClick() {
    console.log('Subject item clicked', item.metadata);
    const { type, subjectId, programme } = item.metadata;
    let url = '';
    if (type === 'assessments') {
      if (programme && subjectId) {
        url = `/#?page=/assessments/${programme}:${subjectId}`;
      }
    } else {
      if (programme && subjectId) {
        url = `/#?page=/courses/${programme}:${subjectId}`;
      }
    }
    console.log('Navigating to:', url, { type, subjectId, programme });
    if (url) {
      try {
        window.location.assign(url);
        // Fallback in case assign is blocked
        setTimeout(() => {
          if (window.location.hash !== url.replace(/^.*#/, '')) {
            window.location.href = url;
          }
        }, 200);
      } catch (e) {
        window.location.href = url;
      }
    }
  }
</script>

<button
  class="w-full flex flex-col px-2 py-1.5 rounded-lg select-none cursor-pointer group transition-colors duration-100
  {isSelected ? 'bg-zinc-900/5 dark:bg-white/10 text-zinc-900 dark:text-white' : 'hover:bg-zinc-500/5 dark:hover:bg-white/5 text-zinc-800 dark:text-zinc-200'}"
  on:click={() => { handleClick(); if (typeof onclick === 'function') onclick(); }}
>
  <div class="flex items-center w-full">
    <div class="flex-none w-8 h-8 text-xl font-IconFamily flex items-center justify-center {isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}">
      {item.metadata?.type === 'assessments' ? '\uebee' : '\uec0a'}
    </div>
    <span class="ml-4 text-lg truncate">
      {@html stripHtmlButKeepHighlights(highlightMatch(item.text, searchTerm, matches))}
    </span>
    <span class="flex-none ml-auto text-xs text-zinc-500 dark:text-zinc-400">
      {item.metadata?.subjectCode}
    </span>
  </div>
  {#if item.content}
    <div class="mt-1 ml-12 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 text-start">
      {@html stripHtmlButKeepHighlights(highlightMatch(item.content, searchTerm, matches))}
    </div>
  {/if}
</button> 