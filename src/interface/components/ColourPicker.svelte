<script lang="ts">
  import { onMount } from 'svelte'
  import ColourPicker from './ColourPicker.tsx';
  import ReactAdapter from './utils/ReactAdapter.svelte';
  import { animate } from 'motion';
  import { delay } from '@/seqta/utils/delay.ts'

  const { hidePicker, standalone = false, savePresets = true, customOnChange = null, customState = null } = $props<{
    hidePicker?: () => void,
    standalone?: boolean,
    savePresets?: boolean,
    customOnChange?: (color: string) => void,
    customState?: string
  }>();

  let background = $state<HTMLDivElement | null>(null);
  let content = $state<HTMLDivElement | null>(null);

  const closePicker = async () => {
    if (standalone) return;
    if (!background || !content) return;

    animate(
      content,
      { scale: [1, 0.4], opacity: [1, 0] },
      {
        type: 'spring',
        stiffness: 400,
        damping: 30
      }
    );

    animate(
      background,
      { opacity: [1, 0] },
      { ease: [0.4, 0, 0.2, 1] }
    );

    await delay(400);
    hidePicker();
  }

  onMount(() => {
    if (standalone) return;
    if (!background || !content) return;

    animate(
      background,
      { opacity: [0, 1] },
      { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    );

    animate(
      content,
      { scale: [0.4, 1], opacity: [0, 1] },
      {
        type: 'spring',
        stiffness: 400,
        damping: 30
      }
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
  <div class="h-auto overflow-clip rounded-xl">
    <ReactAdapter customOnChange={customOnChange} customState={customState} savePresets={savePresets} el={ColourPicker} />
  </div>
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={background}
    class="flex absolute top-0 left-0 z-50 justify-center items-center w-full h-full shadow-2xl cursor-pointer bg-black/20 border border-[#DDDDDD]/30 dark:border-[#38373D]/30"
    onclick={handleBackgroundClick}
    onkeydown={(e) => { e.key === 'Enter' && handleBackgroundClick }}
  >
    <div
      bind:this={content}
      class="p-4 h-auto bg-white rounded-xl border shadow-lg cursor-auto dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700"
    >
      <ReactAdapter customOnChange={customOnChange} customState={customState} savePresets={savePresets} el={ColourPicker} />
    </div>
  </div>
{/if}
