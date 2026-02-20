<script lang="ts">
  import type { Theme } from '@/interface/types/Theme'
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import SignInToFavoriteModal from '@/interface/components/SignInToFavoriteModal.svelte';

  let { theme, onClick, toggleFavorite, isLoggedIn } = $props<{
    theme: Theme;
    onClick: () => void;
    toggleFavorite: (theme: Theme) => void;
    isLoggedIn: boolean;
  }>();
  let menuOpen = $state(false);
  let showSignInModal = $state(false);
  let menuRef: HTMLDivElement;

  onMount(() => {
    const closeMenu = (e: MouseEvent) => {
      if (menuOpen && menuRef && !menuRef.contains(e.target as Node)) {
        menuOpen = false;
      }
    };
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  });

  function handleCardClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-theme-menu]')) return;
    onClick();
  }

  function handleFavoriteClick(e: MouseEvent) {
    e.stopPropagation();
    if (isLoggedIn) {
      toggleFavorite(theme);
    } else {
      showSignInModal = true;
    }
    menuOpen = false;
  }
</script>

<div class="w-full cursor-pointer" role="button" tabindex="-1" onkeydown={onClick} onclick={handleCardClick}>
  <div class="bg-gray-50 w-full transition-all hover:scale-105 duration-500 relative group flex flex-col hover:shadow-2xl dark:hover:shadow-white/[0.1] dark:hover:shadow-white/[0.8] dark:bg-zinc-800 dark:border-white/[0.1] h-auto rounded-xl overflow-clip border" transition:fade>
    <!-- Menu dropdown -->
    <div class="absolute top-2 right-2 z-20" data-theme-menu bind:this={menuRef}>
      <button
        type="button"
        class="flex justify-center items-center w-8 h-8 rounded-lg bg-black/40 hover:bg-black/60 text-white transition-all"
        onclick={(e) => { e.stopPropagation(); menuOpen = !menuOpen; }}
        aria-label="Theme options"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" class="w-5 h-5">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </button>
      {#if menuOpen}
        <div
          class="absolute right-0 top-full mt-1 py-1 min-w-[140px] rounded-lg bg-white dark:bg-zinc-800 shadow-lg border border-zinc-200 dark:border-zinc-700"
          role="menu"
        >
          <button
            type="button"
            class="flex gap-2 items-center w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
            role="menuitem"
            onclick={handleFavoriteClick}
            title={isLoggedIn ? (theme.is_favorited ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to favorite themes'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={theme.is_favorited ? 'currentColor' : 'none'}
              stroke="currentColor"
              stroke-width="2"
              class="w-5 h-5 {theme.is_favorited ? 'text-red-500' : ''}"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {theme.is_favorited ? 'Favorited' : 'Favorite'}
          </button>
        </div>
      {/if}
    </div>
    <div class="absolute bottom-1 left-3 right-3 z-10 mb-1 flex flex-col gap-0.5">
      <span class="text-xl font-bold text-white drop-shadow-md">{theme.name}</span>
      <div class="flex gap-3 text-xs font-medium text-white/90 drop-shadow-sm">
        <span class="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {(theme.download_count ?? 0).toLocaleString()}
        </span>
        <span class="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={theme.is_favorited ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {(theme.favorite_count ?? 0).toLocaleString()}
        </span>
      </div>
    </div>
    <div class='absolute bottom-0 z-0 w-full h-3/4 bg-linear-to-t to-transparent from-black/80'></div>
    <div class='w-full'>
      <img src={theme.marqueeImage || theme.coverImage} alt="Theme Preview" class="object-cover w-full h-48 rounded-md" />
    </div>
  </div>
</div>

{#if showSignInModal}
  <SignInToFavoriteModal onClose={() => (showSignInModal = false)} />
{/if}
