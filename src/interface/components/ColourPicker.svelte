<script lang="ts">
  import { onMount } from 'svelte'
  import { animate } from 'motion';
  import { delay } from '@/seqta/utils/delay.ts'
  import { settingsState } from '@/seqta/utils/listeners/SettingsState.ts'

  const { hidePicker, standalone = false, savePresets = true, customOnChange = null, customState = null } = $props<{
    hidePicker?: () => void,
    standalone?: boolean,
    savePresets?: boolean,
    customOnChange?: (color: string) => void,
    customState?: string
  }>();

  let background = $state<HTMLDivElement | null>(null);
  let content = $state<HTMLDivElement | null>(null);

  let colour = $state<HTMLInputElement | null>(null);

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

  const changeColour = async () => {
    settingsState.selectedColor = colour.value;
  }
</script>

{#if standalone}
  <div class="h-auto rounded-xl overflow-clip">
    <input bind:this={colour} type="color" id="colourpicker" onchange={() => changeColour()} />
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
    <input bind:this={colour} type="color" id="colourpicker" onchange={() => changeColour()} />
    </div>
  </div>
{/if}
