<script lang="ts">
  import { fade } from 'svelte/transition';
  import { animate } from 'motion';

  let { onConfirm, onCancel, title, message } = $props<{
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message: string;
  }>();

  let modalElement: HTMLElement;

  $effect(() => {
    if (modalElement) {
      animate(
        modalElement,
        { scale: [0.9, 1], opacity: [0, 1] },
        {
          type: 'spring',
          stiffness: 300,
          damping: 25
        }
      );
    }
  });
</script>

<div 
  class="flex fixed inset-0 z-[10000] justify-center items-center bg-black/50" 
  style="position: fixed; top: 0; left: 0; right: 0; bottom: 0;"
  onclick={(e) => {
    if (e.target === e.currentTarget) onCancel();
  }} 
  onkeydown={(e) => {
    if (e.key === 'Escape') onCancel();
  }} 
  role="button" 
  tabindex="-1" 
  transition:fade={{ duration: 150 }}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={modalElement}
    class="p-4 mx-4 w-full max-w-md bg-white rounded-2xl shadow-2xl dark:bg-zinc-800" 
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <h2 class="mb-3 text-xl font-bold text-gray-900 dark:text-white">
      {title}
    </h2>
    
    <div class="mb-6 text-lg text-gray-700 whitespace-pre-line dark:text-gray-300">
      {message}
    </div>

    <div class="flex gap-3 justify-end">
      <button
        onclick={onCancel}
        class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg transition-colors hover:bg-gray-200 dark:bg-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-600"
      >
        Cancel
      </button>
      <button
        onclick={onConfirm}
        class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg shadow-inner transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
      >
        Enable
      </button>
    </div>
  </div>
</div>

