<script lang="ts">
  import type { FuseResultMatch } from '../core/types';

  const { text, term, matches } = $props<{
    text: string;
    term: string;
    matches?: readonly FuseResultMatch[];
  }>();

  const segments = $derived(buildSegments(text, term, matches));

  function buildSegments(text: string, term: string, matches = undefined) {
    if (!term.trim() || !matches?.length) return [{ text, highlight: false }];

    try {
      const fieldMatches = matches.find(
        (match) =>
          match.key === 'text' ||
          (match.key === 'allContent' && match.value?.includes(text)),
      );
      if (!fieldMatches?.indices?.length) return [{ text, highlight: false }];

      const highlightMap = new Array<boolean>(text.length).fill(false);
      for (const [start, end] of fieldMatches.indices) {
        if (fieldMatches.key === 'allContent') {
          const textPos = fieldMatches.value?.indexOf(text) ?? -1;
          if (textPos < 0) continue;
          const relStart = start - textPos;
          const relEnd = end - textPos;
          if (relEnd < 0 || relStart >= text.length) continue;
          for (let i = Math.max(0, relStart); i <= Math.min(text.length - 1, relEnd); i++) {
            highlightMap[i] = true;
          }
        } else if (start >= 0 && end < text.length) {
          for (let i = start; i <= end; i++) highlightMap[i] = true;
        }
      }

      const segments: { text: string; highlight: boolean }[] = [];
      let current = '';
      let currentHighlight = highlightMap[0] ?? false;
      for (let i = 0; i < text.length; i++) {
        const isHighlight = highlightMap[i] ?? false;
        if (isHighlight !== currentHighlight) {
          segments.push({ text: current, highlight: currentHighlight });
          current = '';
          currentHighlight = isHighlight;
        }
        current += text[i];
      }
      if (current) segments.push({ text: current, highlight: currentHighlight });
      return segments;
    } catch {
      return [{ text, highlight: false }];
    }
  }
</script>

<span>
  {#each segments as segment, i (i)}
    {#if segment.highlight}
      <span class="highlight">{segment.text}</span>
    {:else}
      {segment.text}
    {/if}
  {/each}
</span>
