
<script lang="ts">
  // Import necessary modules and components
  import { onMount } from 'svelte'
  import ColourPicker from './ColourPicker.tsx';  // Colour picker component
  import ReactAdapter from './utils/ReactAdapter.svelte';  // React adapter for embedding React component in Svelte
  import { animate } from 'motion';  // For animations
  import { delay } from '@/seqta/utils/delay.ts'  // Delay utility function

  // Destructure props to get configuration values, with defaults
  const { hidePicker, standalone = false, savePresets = true, customOnChange = null, customState = null } = $props<{
    hidePicker?: () => void,
    standalone?: boolean,
    savePresets?: boolean,
    customOnChange?: (color: string) => void,
    customState?: string
  }>();

  // Declare state variables for background and content elements
  let background = $state<HTMLDivElement | null>(null);
  let content = $state<HTMLDivElement | null>(null);

  // Function to close the color picker with animations
  const closePicker = async () => {
    if (standalone) return;  // If standalone, do not close
    if (!background || !content) return;  // Ensure elements are available

    // Animate content to shrink and fade out
    animate(
      content,
      { scale: [1, 0.4], opacity: [1, 0] },
      {
        type: 'spring',
        stiffness: 400,
        damping: 30
      }
    );

    // Animate background fade out
    animate(
      background,
      { opacity: [1, 0] },
      { ease: [0.4, 0, 0.2, 1] }
    );

    // Wait for animation to finish before calling hidePicker
    await delay(400);
    hidePicker();
  }

  // onMount lifecycle function to handle opening animations and escape key handling
  onMount(() => {
    if (standalone) return;  // Skip animations if standalone
    if (!background || !content) return;  // Ensure elements are available

    // Animate background fade in
    animate(
      background,
      { opacity: [0, 1] },
      { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    );

    // Animate content to grow and fade in
    animate(
      content,
      { scale: [0.4, 1], opacity: [0, 1] },
      {
        type: 'spring',
        stiffness: 400,
        damping: 30
      }
    );

    // Function to handle Escape key press and close the picker
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePicker();
      }
    };

    // Add event listener for Escape key
    document.addEventListener('keydown', handleEscapeKey);

    // Cleanup listener when component is destroyed
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  });

  // Function to handle background click to close the picker
  function handleBackgroundClick(event: MouseEvent) {
    if (event.target === background) {
      closePicker();
    }
  }
</script>

{#if standalone}
  <!-- Render the ReactAdapter for standalone mode -->
  <div class="h-auto rounded-xl overflow-clip">
    <ReactAdapter customOnChange={customOnChange} customState={customState} savePresets={savePresets} el={ColourPicker} />
  </div>
{:else}
  <!-- Background and content divs for non-standalone mode with click and keyboard event listeners -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={background}
    class="absolute top-0 left-0 z-50 flex items-center justify-center w-full h-full cursor-pointer bg-black/20"
    onclick={handleBackgroundClick}  <!-- Close on background click -->
    onkeydown={(e) => { e.key === 'Enter' && handleBackgroundClick }}  <!-- Close on Enter key press -->
  >
    <!-- Color picker content div -->
    <div
      bind:this={content}
      class="h-auto p-4 bg-white border shadow-lg cursor-auto rounded-xl dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700"
    >
      <ReactAdapter customOnChange={customOnChange} customState={customState} savePresets={savePresets} el={ColourPicker} />
    </div>
  </div>
{/if}
