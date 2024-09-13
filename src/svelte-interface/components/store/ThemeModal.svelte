<script lang="ts">
  export let theme;
  export let currentThemes = [];
  export let onClose;
  export let onInstall;
  export let onRemove;
  let installing = false;

  // Transitions
  import { fade, slide } from 'svelte/transition';
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-70" on:click={onClose} transition:fade>
  <div class="w-full max-w-xl h-[95%] p-4 bg-white rounded-t-2xl dark:bg-zinc-800 overflow-scroll" on:click|stopPropagation transition:slide={{ axis: 'y' }}>
    <div class="relative h-auto">
      <button class="absolute top-0 right-0 p-2 text-xl font-bold text-gray-600 font-IconFamily dark:text-gray-200" on:click={onClose}>
        {'\ued8a'}
      </button>
      <h2 class="mb-4 text-2xl font-bold">
        {theme.name}
      </h2>
      <img src={theme.marqueeImage} alt="Theme Cover" class="object-cover w-full mb-4 rounded-md" />
      <p class="mb-4 text-gray-700 dark:text-gray-300">
        {theme.description}
      </p>
      {#if currentThemes.includes(theme.id)}
        <button on:click={() => {installing = true; onRemove(theme.id); installing = false;}} class="flex px-4 py-2 mt-4 ml-auto rounded-full dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200">
          {#if installing}
            Removing...
          {:else}
            Remove
          {/if}
        </button>
      {:else}
        <button on:click={() => {installing = true; onInstall(theme.id); installing = false;}} class="flex px-4 py-2 mt-4 ml-auto rounded-full dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200">
          {#if installing}
            Installing...
          {:else}
            Install
          {/if}
        </button>
      {/if}
    </div>
  </div>
</div>
