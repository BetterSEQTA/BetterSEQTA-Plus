<script lang="ts">
  import type { Theme } from '@/interface/types/Theme'
  import {
    masterGridDisplayDownloadCount,
    gridCardPreviewImageUrls,
  } from '@/interface/utils/themeStoreFlavours'
  import { isStoreThemeInstalled } from '@/interface/utils/themeListFilters'
  import emblaCarouselSvelte from 'embla-carousel-svelte';
  import Autoplay from 'embla-carousel-autoplay';
  let { theme, onClick, toggleFavorite, isLoggedIn, onRequestSignIn, allStoreThemeRows, installedThemeIds = [], variant = 'official' } = $props<{
    theme: Theme;
    onClick: () => void;
    toggleFavorite: (theme: Theme) => void;
    isLoggedIn: boolean;
    onRequestSignIn?: () => void;
    /** Raw API themes (includes hidden slaves) for aggregated master download totals */
    allStoreThemeRows?: Theme[];
    installedThemeIds?: string[];
    variant?: 'official' | 'community';
  }>();

  const displayDownloadCount = $derived(
    allStoreThemeRows != null
      ? masterGridDisplayDownloadCount(theme, allStoreThemeRows)
      : (theme.download_count ?? 0),
  );

  const gridRotatorUrls = $derived(gridCardPreviewImageUrls(theme, allStoreThemeRows));

  /** Mirrors CoverSwiper (featured bar): horizontal slides + autoplay */
  function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Read once synchronously where `window` exists so reduced-motion doesn’t briefly mount carousel */
  let allowSlideAutoplay = $state(!prefersReducedMotion());

  const gridEmblaKey = $derived(gridRotatorUrls.join('|'));

  const gridEmblaOptions = $derived({ loop: gridRotatorUrls.length > 1 });

  const gridEmblaPlugins = $derived.by(() => {
    if (!allowSlideAutoplay || gridRotatorUrls.length <= 1) return [];
    return [
      Autoplay({
        delay: 2000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ];
  });

  const isInstalled = $derived(isStoreThemeInstalled(theme, installedThemeIds));
  const isCommunity = $derived(variant === 'community');
  const showFavorites = $derived(!isCommunity);

  function handleCardClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-theme-favorite]')) return;
    onClick();
  }

  function handleFavoriteClick(e: MouseEvent) {
    e.stopPropagation();
    if (isLoggedIn) {
      toggleFavorite(theme);
    } else {
      onRequestSignIn?.();
    }
  }
</script>

<div
  class="relative z-0 hover:z-20 w-full cursor-pointer"
  role="button"
  tabindex="-1"
  onkeydown={onClick}
  onclick={handleCardClick}
>
  <div
    class="theme-card isolate bg-gray-50 w-full transition-[transform,box-shadow,border-color] duration-300 ease-out relative group flex flex-col rounded-xl overflow-clip border hover:scale-[1.02] hover:shadow-xl dark:hover:shadow-black/60 dark:bg-zinc-800 dark:border-white/[0.1] h-auto"
  >
    {#if isCommunity}
      <div class="absolute top-2 left-2 z-20 pointer-events-none">
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100 shadow-sm"
          aria-label="Community theme"
        >
          Community
        </span>
      </div>
    {/if}
    {#if theme.featured === true}
      <div class="absolute top-2 z-20 pointer-events-none {isCommunity ? 'left-[5.75rem]' : 'left-2'}">
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100 shadow-sm"
          aria-label="Featured theme"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5">
            <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" />
          </svg>
          Featured
        </span>
      </div>
    {/if}
    {#if isInstalled}
      <div class="absolute top-2 z-20 pointer-events-none {theme.featured === true ? (isCommunity ? 'left-[11rem]' : 'left-[5.5rem]') : isCommunity ? 'left-[5.75rem]' : 'left-2'}">
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100 shadow-sm"
          aria-label="Installed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5">
            <path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clip-rule="evenodd" />
          </svg>
          Installed
        </span>
      </div>
    {/if}
    {#if showFavorites}
    <button
      type="button"
      data-theme-favorite
      class="pointer-events-none absolute right-2 top-2 z-20 flex h-10 w-10 scAle-[0.25] items-center justify-center rounded-full bg-black/50 text-white opacity-0 blur-[4px] transition-[opacity,transform,filter,background-color] duration-200 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-black/70 active:scale-[0.96] group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-hover:blur-0 focus-visible:pointer-events-auto focus-visible:scale-100 focus-visible:opacity-100 focus-visible:blur-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      onclick={handleFavoriteClick}
      aria-label={isLoggedIn
        ? theme.is_favorited
          ? 'Remove from favourites'
          : 'Add to favourites'
        : 'Sign in to favourite themes'}
      title={isLoggedIn
        ? theme.is_favorited
          ? 'Remove from favourites'
          : 'Add to favourites'
        : 'Sign in to favourite themes'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={theme.is_favorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        stroke-width="2"
        class="h-5 w-5 {theme.is_favorited ? 'text-red-500' : ''}"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 0 1 6.364 0L12 7.636l1.318-1.318a4.5 4.5 0 0 1 6.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 0 1 0-6.364Z" />
      </svg>
    </button>
    {/if}
    <div class="absolute bottom-1 left-3 right-3 z-10 mb-1 flex flex-col gap-0.5">
      <span class="text-xl font-bold text-white drop-shadow-md">{theme.name}</span>
      {#if theme.author}
        <span class="text-xs text-white/85 drop-shadow-md line-clamp-1">By {theme.author}</span>
      {/if}
      <div class="flex gap-3 text-xs font-medium text-white/90 drop-shadow-sm">
        <span class="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {displayDownloadCount.toLocaleString()}
        </span>
        {#if showFavorites}
        <span class="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={theme.is_favorited ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {(theme.favorite_count ?? 0).toLocaleString()}
        </span>
        {/if}
      </div>
    </div>
    {#if gridRotatorUrls.length === 0}
      <div class="relative w-full h-48 overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-700" aria-hidden="true"></div>
    {:else if !allowSlideAutoplay || gridRotatorUrls.length === 1}
      <div class="relative w-full h-48 overflow-hidden rounded-md">
        <img
          src={gridRotatorUrls[0] ?? theme.marqueeImage ?? theme.coverImage}
          alt=""
          class="object-cover w-full h-full"
          draggable="false"
        />
      </div>
    {:else}
      {#key gridEmblaKey}
        <div
          class="relative w-full h-48 overflow-hidden rounded-md"
          use:emblaCarouselSvelte={{
            options: gridEmblaOptions,
            plugins: gridEmblaPlugins,
          }}
        >
          <div class="flex h-full">
            {#each gridRotatorUrls as url (url)}
              <div class="relative flex-[0_0_100%] min-w-0 h-full shrink-0">
                <img
                  src={url}
                  alt=""
                  class="object-cover w-full h-full select-none"
                  draggable="false"
                />
              </div>
            {/each}
          </div>
        </div>
      {/key}
    {/if}
  </div>
</div>

<style>
  .theme-card::after {
    position: absolute;
    z-index: 1;
    inset: 0;
    background: linear-gradient(
      to top,
      rgb(0 0 0 / 92%) 0%,
      rgb(0 0 0 / 85%) 18%,
      rgb(0 0 0 / 68%) 36%,
      rgb(0 0 0 / 42%) 54%,
      rgb(0 0 0 / 16%) 72%,
      transparent 88%
    );
    content: '';
    pointer-events: none;
  }
</style>
