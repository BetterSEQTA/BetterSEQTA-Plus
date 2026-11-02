<script lang="ts">
  import { onMount } from 'svelte'
  import { animate } from 'motion';
  import { delay } from '@/seqta/utils/delay'
  import { settingsState } from '@/seqta/utils/listeners/SettingsState'
  import GradientPicker from './colourPicker/GradientPicker.svelte'

  const PRESETS_KEY = 'colorPickerPresets';
  const MAX_PRESETS = 18;
  const DEFAULT_PRESETS = [
    "linear-gradient(30deg, rgba(229,209,218,1) 0%, RGBA(235,169,202,1) 46%, rgba(214,155,162,1) 100%)",
    "linear-gradient(40deg, rgba(201,61,0,1) 0%, RGBA(170, 5, 58, 1) 100%)",
    "linear-gradient(40deg, rgba(0, 141, 201, 0.76) 0%, rgba(8, 5, 170, 0.66) 100%)",
    "linear-gradient(40deg, rgba(0, 201, 20, 0.76) 0%, rgba(4, 160, 105, 0.66) 100%)",
    "linear-gradient(40deg, rgba(199, 20, 55, 0.76) 0%, rgba(95, 11, 160, 0.66) 100%)",
    "linear-gradient(40deg, rgba(24, 20, 199, 0.76) 0%, rgba(23, 173, 65, 0.66) 100%)",
    "radial-gradient(circle, rgba(20, 199, 178, 0.76) 32%, rgba(3, 120, 57, 0.66) 100%)",
    "radial-gradient(circle, rgba(13, 15, 145, 0.76) 12%, rgba(103, 3, 120, 0.66) 100%)",
    "linear-gradient(20deg, rgb(230, 21, 21) 0%, rgb(230, 109, 21) 12%, rgb(230, 34, 21) 26%, rgb(230, 21, 21) 39%, rgb(230, 84, 21) 48%, rgb(230, 34, 21) 58%, rgb(230, 96, 21) 69%, rgb(230, 34, 21) 80%, rgb(230, 71, 21) 89%, rgb(230, 21, 21) 100%)",
    "rgba(114, 1, 170, 0.89)",
    "rgba(93, 135, 63, 0.89)",
    "rgba(4, 4, 138, 0.77)",
    "rgba(21, 20, 20, 0.89)",
    "linear-gradient(340deg, rgb(205, 74, 82) 18%, rgba(132, 8, 8, 0.89) 46%, rgb(204, 78, 85) 72%)",
    "radial-gradient(circle, rgb(74, 205, 158) 0%, rgba(8, 72, 132, 0.89) 99%)",
    "rgba(17, 94, 89, 1)",
    "rgba(30, 64, 175, 0.89)",
    "rgba(134, 25, 143, 1)",
    "rgba(14, 165, 233, 0.9)",
  ];

  const {
    hidePicker,
    standalone = false,
    savePresets = true,
    customOnChange = null,
    customState = null,
  }: {
    hidePicker?: () => void;
    standalone?: boolean;
    savePresets?: boolean;
    customOnChange?: ((color: string) => void) | null;
    customState?: string | null;
  } = $props();

  let background = $state<HTMLDivElement | null>(null);
  let content = $state<HTMLDivElement | null>(null);
  let presets = $state<string[]>(loadPresets());
  let current = $state(initialColour());

  function initialColour(): string {
    return customState ?? settingsState.selectedColor ?? '';
  }

  function loadPresets(): string[] {
    try {
      const saved = JSON.parse(localStorage.getItem(PRESETS_KEY) ?? 'null');
      return Array.isArray(saved) ? saved : DEFAULT_PRESETS;
    } catch {
      return DEFAULT_PRESETS;
    }
  }

  function rememberPreset(colour: string) {
    if (!colour || presets[0] === colour) return;
    const updated = [colour, ...presets.filter((preset) => preset !== colour)].slice(0, MAX_PRESETS);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
  }

  function handleChange(colour: string) {
    current = colour;
    if (customOnChange) customOnChange(colour);
    else settingsState.selectedColor = colour;
  }

  const closePicker = async () => {
    if (standalone || !background || !content) return;

    animate(content, { scale: [1, 0.4], opacity: [1, 0] }, { type: 'spring', stiffness: 400, damping: 30 });
    animate(background, { opacity: [1, 0] }, { ease: [0.4, 0, 0.2, 1] });

    await delay(400);
    hidePicker?.();
  }

  onMount(() => {
    if (!standalone && background && content) {
      animate(background, { opacity: [0, 1] }, { duration: 0.3, ease: [0.4, 0, 0.2, 1] });
      animate(content, { scale: [0.4, 1], opacity: [0, 1] }, { type: 'spring', stiffness: 400, damping: 30 });
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePicker();
    };
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      if (savePresets && !customOnChange) rememberPreset(current);
    };
  });

  function handleBackgroundClick(event: MouseEvent) {
    if (event.target === background) closePicker();
  }
</script>

{#if standalone}
  <div class="h-auto {$settingsState.DarkMode ? 'dark' : ''}">
    <GradientPicker value={customState ?? current} onchange={handleChange} {presets} />
  </div>
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={background}
    class="flex absolute top-0 left-0 z-50 justify-center items-center w-full h-full shadow-2xl cursor-pointer bg-black/20 border border-[#DDDDDD]/30 dark:border-[#38373D]/30 {$settingsState.DarkMode ? 'dark' : ''}"
    onclick={handleBackgroundClick}
    onkeydown={(event) => { if (event.key === 'Enter') handleBackgroundClick(event as unknown as MouseEvent) }}
  >
    <div
      bind:this={content}
      class="p-4 h-auto bg-white rounded-xl border shadow-lg cursor-auto dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700"
    >
      <GradientPicker value={current} onchange={handleChange} {presets} />
    </div>
  </div>
{/if}
