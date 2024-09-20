<script lang="ts">
  import { onMount } from 'svelte'
  import ColourPicker from './ColourPicker.tsx';
  import ReactAdapter from './utils/ReactAdapter.svelte';
  import { animate, spring } from 'motion';
  import { delay } from '@/seqta/utils/delay.ts'

  const { hidePicker, standalone = false } = $props<{
    hidePicker?: () => void,
    standalone?: boolean
  }>();

  let background: HTMLDivElement;
  let content: HTMLDivElement;

  const closePicker = async () => {
    if (standalone) return;

    animate(
      content,
      { scale: [1, 0.4], opacity: [1, 0] },
      { easing: spring({ stiffness: 400, damping: 30 }) }
    );

    animate(
      background,
      { opacity: [1, 0] },
      { easing: [0.4, 0, 0.2, 1] }
    );

    await delay(400);
    hidePicker();
  }

  onMount(() => {
    if (standalone) return;

    animate(
      background,
      { opacity: [0, 1] },
      { duration: 0.3, easing: [0.4, 0, 0.2, 1] }
    );

    animate(
      content,
      { scale: [0.4, 1], opacity: [0, 1] },
      { easing: spring({ stiffness: 400, damping: 30 }) }
    );

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePicker();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  });

  function handleBackgroundClick(event: MouseEvent) {
    if (event.target === background) {
      closePicker();
    }
  }
</script>

{#if standalone}
  <div class="h-auto rounded-xl overflow-clip">
    <ReactAdapter el={ColourPicker} />
  </div>
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={background}
    class="absolute top-0 left-0 z-50 flex items-center justify-center w-full h-full cursor-pointer bg-black/20"
    onclick={handleBackgroundClick}
    onkeydown={(e) => { e.key === 'Enter' && handleBackgroundClick }}
  >
    <div
      bind:this={content}
      class="h-auto p-4 bg-white border shadow-lg cursor-auto rounded-xl dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700"
    >
      <ReactAdapter el={ColourPicker} />
    </div>
  </div>
{/if}
