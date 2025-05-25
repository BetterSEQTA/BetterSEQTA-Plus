<script lang="ts">
  import type { FuseResultMatch } from '../core/types';

  const { text, term, matches } = $props<{
    text: string;
    term: string;
    matches?: readonly FuseResultMatch[];
  }>();

  const segments = $derived(getSegments(text, term, matches));

  // Build highlight map (copied and adapted from highlightMatch)
  function getSegments(text: string, term: string, matches?: readonly FuseResultMatch[]) {
    if (!term.trim() || !matches || matches.length === 0) return [{ text, highlight: false }];

    try {
      const fieldMatches = matches.find(
        (match) =>
          match.key === 'text' ||
          (match.key === 'allContent' && match.value?.includes(text)),
      );
      if (!fieldMatches || !fieldMatches.indices || fieldMatches.indices.length === 0) {
        return [{ text, highlight: false }];
      }
      const highlightMap = new Array(text.length).fill(false);
      fieldMatches.indices.forEach((indices) => {
        const start = indices[0];
        const end = indices[1];
        if (fieldMatches.key === 'allContent') {
          const allContent = fieldMatches.value;
          const textPos = allContent?.indexOf(text) ?? -1;
          if (textPos >= 0) {
            const relStart = start - textPos;
            const relEnd = end - textPos;
            if (relEnd >= 0 && relStart < text.length) {
              for (let i = Math.max(0, relStart); i <= Math.min(text.length - 1, relEnd); i++) {
                highlightMap[i] = true;
              }
            }
          }
        } else {
          if (start >= 0 && end < text.length) {
            for (let i = start; i <= end; i++) {
              highlightMap[i] = true;
            }
          }
        }
      });
      // Build segments
      const segments: { text: string; highlight: boolean }[] = [];
      let current = '';
      let currentHighlight = highlightMap[0] || false;
      for (let i = 0; i < text.length; i++) {
        const isHighlight = highlightMap[i] || false;
        if (isHighlight !== currentHighlight) {
          segments.push({ text: current, highlight: currentHighlight });
          current = '';
          currentHighlight = isHighlight;
        }
        current += text[i];
      }
      if (current) {
        segments.push({ text: current, highlight: currentHighlight });
      }
      return segments;
    } catch (e) {
      return [{ text, highlight: false }];
    }
  }
</script>

<span>
  {#each segments as segment}
    {#if segment.highlight}
      <span class="highlight">{segment.text}</span>
    {:else}
      {segment.text}
    {/if}
  {/each}
</span> 