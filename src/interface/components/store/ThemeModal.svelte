<script lang="ts">
  import type { Theme } from '@/interface/types/Theme'
  import { fade } from 'svelte/transition';
  import { animate } from 'motion';
  let { theme, currentThemes, setDisplayTheme, onInstall, onRemove, allThemes, displayTheme, toggleFavorite, isLoggedIn, onRequestSignIn } = $props<{
    theme: Theme | null;
    currentThemes: string[];
    setDisplayTheme: (theme: Theme | null) => void;
    onInstall: (themeId: string) => void;
    onRemove: (themeId: string) => void;
    allThemes: Theme[];
    displayTheme: Theme | null;
    toggleFavorite?: (theme: Theme) => void;
    isLoggedIn?: boolean;
    onRequestSignIn?: () => void;
  }>();
  let installing = $state(false);
  let modalElement: HTMLElement;

  function handleFavoriteClick() {
    if (isLoggedIn && toggleFavorite && theme) {
      toggleFavorite(theme);
    } else {
      onRequestSignIn?.();
    }
  }

  function tagsOverlap(a: string[] | undefined, b: string[] | undefined): boolean {
    const lowerB = new Set((b ?? []).map((t) => t.toLowerCase()));
    return (a ?? []).some((t) => lowerB.has(t.toLowerCase()));
  }

  const relatedThemes = $derived.by(() => {
    const t = theme;
    if (!t) return [] as Theme[];
    if ((t.tags ?? []).length === 0) return [];
    return allThemes
      .filter((x: Theme) => !!x && x.id !== t.id && tagsOverlap(t.tags, x.tags))
      .sort((a: Theme, b: Theme) => {
        const diff = (b.download_count ?? 0) - (a.download_count ?? 0);
        if (diff !== 0) return diff;
        const byName = a.name.localeCompare(b.name);
        if (byName !== 0) return byName;
        return a.id.localeCompare(b.id);
      })
      .slice(0, 4);
  });

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
    {#if theme}
    <div class="relative h-auto">
      <div class="absolute top-0 right-0 flex gap-1 items-center">
        <button class="p-2 text-xl font-bold text-gray-600 font-IconFamily dark:text-gray-200" onclick={() => hideModal()}>
          {'\ued8a'}
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-2 pr-12 mb-2">
        <h2 class="text-2xl font-bold">
          {theme.name}
        </h2>
        {#if theme.featured === true}
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
            aria-label="Featured theme"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5">
              <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" />
            </svg>
            Featured
          </span>
        {/if}
      </div>
      {#if theme.author}
        <p class="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
          By {theme.author}
        </p>
      {/if}
      <div class="flex gap-4 mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span class="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {(theme.download_count ?? 0).toLocaleString()} downloads
        </span>
        <span class="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={theme.is_favorited ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {(theme.favorite_count ?? 0).toLocaleString()} favorites
        </span>
      </div>
      <img src={theme.marqueeImage || theme.coverImage} alt="Theme Cover" class="object-cover mb-4 w-full rounded-md" />
      <p class="mb-4 text-gray-700 dark:text-gray-300">
        {theme.description}
      </p>
      <div class="flex flex-wrap gap-2 mt-4 justify-end items-center">
        {#if toggleFavorite && theme}
          <button
            type="button"
            class="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 {theme.is_favorited ? 'text-red-500 bg-red-500/10 dark:bg-red-500/20' : 'bg-zinc-200 dark:bg-zinc-700 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-600'}"
            onclick={handleFavoriteClick}
            title={isLoggedIn ? (theme.is_favorited ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to favorite themes'}
            aria-label={theme.is_favorited ? 'Unfavorite' : 'Favorite'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={theme.is_favorited ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {theme.is_favorited ? 'Favorited' : 'Favorite'}
          </button>
        {/if}
        {#if currentThemes.includes(theme.id)}
          <button onclick={async () => {installing = true; await onRemove(theme.id); installing = false}} class="flex relative justify-center items-center px-4 py-2 w-32 text-black rounded-full dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200 transition-all duration-200 hover:scale-105 active:scale-95">
            {#if installing}
              <svg class="absolute w-4 h-4 { installing ? 'opacity-100' : 'opacity-0' }" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke="currentColor" fill="currentColor" class="origin-center animate-spin-fast" d="M2,12A11.2,11.2,0,0,1,13,1.05C12.67,1,12.34,1,12,1a11,11,0,0,0,0,22c.34,0,.67,0,1-.05C6,23,2,17.74,2,12Z"/>
              </svg>
            {/if}
            <span class="{ installing ? 'opacity-0' : 'opacity-100' }">Remove</span>
          </button>
        {:else}
          <button onclick={async () => {installing = true; await onInstall(theme.id); installing = false}} class="flex relative justify-center items-center px-4 py-2 w-32 text-black rounded-full dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200 transition-all duration-200 hover:scale-105 active:scale-95">
            {#if installing}
              <svg class="absolute w-4 h-4 { installing ? 'opacity-100' : 'opacity-0' }" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke="currentColor" fill="currentColor" class="origin-center animate-spin-fast" d="M2,12A11.2,11.2,0,0,1,13,1.05C12.67,1,12.34,1,12,1a11,11,0,0,0,0,22c.34,0,.67,0,1-.05C6,23,2,17.74,2,12Z"/>
              </svg>
            {/if}
            <span class="{ installing ? 'opacity-0' : 'opacity-100' }">Install</span>
          </button>
        {/if}
      </div>

      {#if relatedThemes.length > 0}
        <div class="my-8 border-b border-zinc-200 dark:border-zinc-700"></div>

        <h3 class="mb-4 text-lg font-bold">
          Related themes
        </h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {#each relatedThemes as relatedTheme (relatedTheme.id)}
            <button onclick={() => { hideModal(relatedTheme) }} class="relative z-0 hover:z-20 w-full cursor-pointer">
              <div class="bg-gray-50 w-full transition-all duration-500 ease-out relative group group/card flex flex-col hover:scale-105 hover:shadow-2xl dark:hover:shadow-white/[0.1] hover:shadow-white/[0.8] dark:bg-zinc-800 dark:border-white/[0.1] h-auto rounded-xl overflow-clip border">
                <div class="absolute bottom-1 left-3 z-10 mb-1 text-xl font-bold text-white transition-all duration-500 group-hover:-translate-y-0.5">
                  {relatedTheme.name}
                </div>
                <div class="absolute bottom-0 z-0 w-full h-3/4 to-transparent from-black/80 bg-linear-to-t"></div>
                <img src={relatedTheme.marqueeImage || relatedTheme.coverImage} alt="Theme Preview" class="object-cover w-full h-48" />
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
    {:else}
      <div class="flex justify-center items-center h-full text-zinc-600 dark:text-zinc-300">
        <button class="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 transition-all duration-200 hover:scale-105 active:scale-95" onclick={() => hideModal()}>
          Close
        </button>
      </div>
    {/if}
  </div>
</div>
