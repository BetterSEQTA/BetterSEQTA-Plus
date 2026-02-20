<script lang="ts">
  import type { Theme } from '@/interface/types/Theme'
  import { fade } from 'svelte/transition';
  import { animate } from 'motion';

  let { theme, currentThemes, setDisplayTheme, onInstall, onRemove, allThemes, displayTheme, toggleFavorite, isLoggedIn } = $props<{
    theme: Theme | null;
    currentThemes: string[];
    setDisplayTheme: (theme: Theme | null) => void;
    onInstall: (themeId: string) => void;
    onRemove: (themeId: string) => void;
    allThemes: Theme[];
    displayTheme: Theme | null;
    toggleFavorite?: (theme: Theme) => void;
    isLoggedIn?: boolean;
  }>();
  let installing = $state(false);
  let modalElement: HTMLElement;

  // Function to get related themes
  function getRelatedThemes() {
    return allThemes
      .filter((t: Theme) => t.id !== theme.id)
      .sort((a: Theme, b: Theme) => a.name.localeCompare(theme.name) - b.name.localeCompare(theme.name))
      .slice(0, 4);
  }

  $effect(() => {
    if (displayTheme) {
      animate(
        modalElement,
        { y: [500, 0], opacity: [0, 1] },
        {
          type: 'spring',
          stiffness: 150,
          damping: 20
        }
      );
    }
  });

  const hideModal = (relatedTheme?: Theme | null) => {
    animate(
      modalElement,
      { y: [10, 500], opacity: [1, 0] },
      {
        type: 'spring',
        stiffness: 150,
        damping: 20
      }
    );
    setTimeout(() => {
      setDisplayTheme(relatedTheme ?? null);
    }, 100);
  }
</script>

<div 
  class="flex fixed inset-0 z-50 justify-center items-end bg-black/70" 
  onclick={(e) => {
    if (e.target === e.currentTarget) hideModal();
  }} 
  onkeydown={(e) => {
    if (e.target === e.currentTarget) hideModal();
  }} 
  role="button" 
  tabindex="-1" 
  transition:fade
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={modalElement}
    class="w-full max-w-[600px] h-[95%] p-4 bg-white rounded-t-2xl dark:bg-zinc-800 overflow-scroll no-scrollbar cursor-auto" 
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <div class="relative h-auto">
      <div class="absolute top-0 right-0 flex gap-1 items-center">
        {#if isLoggedIn && toggleFavorite && theme}
          <button
            type="button"
            class="p-2 rounded-lg transition-all hover:bg-zinc-100 dark:hover:bg-zinc-700 {theme.is_favorited ? 'text-red-500' : 'text-gray-600 dark:text-gray-200'}"
            onclick={() => toggleFavorite(theme)}
            title={theme.is_favorited ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={theme.is_favorited ? 'Unfavorite' : 'Favorite'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={theme.is_favorited ? 'currentColor' : 'none'}
              stroke="currentColor"
              stroke-width="2"
              class="w-6 h-6"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        {/if}
        <button class="p-2 text-xl font-bold text-gray-600 font-IconFamily dark:text-gray-200" onclick={() => hideModal()}>
          {'\ued8a'}
        </button>
      </div>
      <h2 class="mb-4 text-2xl font-bold">
        {theme.name}
      </h2>
      <img src={theme.marqueeImage || theme.coverImage} alt="Theme Cover" class="object-cover mb-4 w-full rounded-md" />
      <p class="mb-4 text-gray-700 dark:text-gray-300">
        {theme.description}
      </p>
      {#if currentThemes.includes(theme.id)}
        <button onclick={async () => {installing = true; await onRemove(theme.id); installing = false}} class="flex relative justify-center items-center px-4 py-2 mt-4 ml-auto w-32 text-black rounded-full dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200">
          {#if installing}
            <svg class="absolute w-4 h-4 { installing ? 'opacity-100' : 'opacity-0' }" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke="currentColor" fill="currentColor" class="origin-center animate-spin-fast" d="M2,12A11.2,11.2,0,0,1,13,1.05C12.67,1,12.34,1,12,1a11,11,0,0,0,0,22c.34,0,.67,0,1-.05C6,23,2,17.74,2,12Z"/>
            </svg>
          {/if}
          <span class="{ installing ? 'opacity-0' : 'opacity-100' }">Remove</span>
        </button>
      {:else}
        <button onclick={async () => {installing = true; await onInstall(theme.id); installing = false}} class="flex relative justify-center items-center px-4 py-2 mt-4 ml-auto w-32 text-black rounded-full dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200">
          {#if installing}
            <svg class="absolute w-4 h-4 { installing ? 'opacity-100' : 'opacity-0' }" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke="currentColor" fill="currentColor" class="origin-center animate-spin-fast" d="M2,12A11.2,11.2,0,0,1,13,1.05C12.67,1,12.34,1,12,1a11,11,0,0,0,0,22c.34,0,.67,0,1-.05C6,23,2,17.74,2,12Z"/>
            </svg>
          {/if}
          <span class="{ installing ? 'opacity-0' : 'opacity-100' }">Install</span>
        </button>
      {/if}

      <div class="my-8 border-b border-zinc-200 dark:border-zinc-700"></div>

      <h3 class="mb-4 text-lg font-bold">
        Similar Themes
      </h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {#each getRelatedThemes() as relatedTheme (relatedTheme.id)}
          <button onclick={() => { hideModal(relatedTheme) }} class="w-full cursor-pointer">
            <div class="bg-gray-50 w-full transition-all hover:scale-105 duration-500 relative group group/card flex flex-col hover:shadow-2xl dark:hover:shadow-white/[0.1] hover:shadow-white/[0.8] dark:bg-zinc-800 dark:border-white/[0.1] h-auto rounded-xl overflow-clip border">
              <div class="absolute bottom-1 left-3 z-10 mb-1 text-xl font-bold text-white transition-all duration-500 group-hover:-translate-y-0.5">
                {relatedTheme.name}
              </div>
              <div class="absolute bottom-0 z-0 w-full h-3/4 to-transparent from-black/80 bg-linear-to-t"></div>
              <img src={relatedTheme.marqueeImage || relatedTheme.coverImage} alt="Theme Preview" class="object-cover w-full h-48" />
            </div>
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>
