<script lang="ts">
  import CheckIcon from "@lucide/svelte/icons/check";
  import DownloadIcon from "@lucide/svelte/icons/download";
  import HeartIcon from "@lucide/svelte/icons/heart";
  import StarIcon from "@lucide/svelte/icons/star";
  import type { Theme } from '@/interface/types/Theme'
  import {
    masterGridDisplayDownloadCount,
    gridCardPreviewImageUrls,
  } from '@/interface/utils/themeStoreFlavours'
  import { isStoreThemeInstalled } from '@/interface/utils/themeListFilters'
  import emblaCarouselSvelte from 'embla-carousel-svelte';
  import Autoplay from 'embla-carousel-autoplay';
  let { theme, onClick, toggleFavorite, isLoggedIn, onRequestSignIn, allStoreThemeRows, installedThemeIds = [], variant = 'official' }: {
    theme: Theme;
    onClick: () => void;
    toggleFavorite: (theme: Theme) => void;
    isLoggedIn: boolean;
    onRequestSignIn?: () => void;
    /** Raw API themes (includes hidden slaves) for aggregated master download totals */
    allStoreThemeRows?: Theme[];
    installedThemeIds?: string[];
    variant?: 'official' | 'community';
  } = $props();

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
    class="theme-card isolate bg-gray-50 w-full transition-[transform,box-shadow,border-color] duration-300 ease-out relative group flex flex-col rounded-xl overflow-clip border hover:scale-[1.02] hover:shadow-xl dark:hover:shadow-black/60 dark:bg-zinc-800 dark:border-white/10 h-auto"
  >
    {#if isCommunity}
      <div class="absolute top-2 left-2 z-20 pointer-events-none">
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100 shadow-xs"
          aria-label="Community theme"
        >
          Community
        </span>
      </div>
    {/if}
    {#if theme.featured === true}
      <div class="absolute top-2 z-20 pointer-events-none {isCommunity ? 'left-23' : 'left-2'}">
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100 shadow-xs"
          aria-label="Featured theme"
        >
          <StarIcon class="w-3.5 h-3.5" fill="currentColor" />
          Featured
        </span>
      </div>
    {/if}
    {#if isInstalled}
      <div class="absolute top-2 z-20 pointer-events-none {theme.featured === true ? (isCommunity ? 'left-44' : 'left-22') : isCommunity ? 'left-23' : 'left-2'}">
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100 shadow-xs"
          aria-label="Installed"
        >
          <CheckIcon class="w-3.5 h-3.5" />
          Installed
        </span>
      </div>
    {/if}
    {#if showFavorites}
    <button
      type="button"
      data-theme-favorite
      class="pointer-events-none absolute right-2 top-2 z-20 flex h-10 w-10 scale-[0.25] items-center justify-center rounded-full bg-black/50 text-white opacity-0 blur-xs transition-[opacity,transform,filter,background-color] duration-200 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-black/70 active:scale-[0.96] group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-hover:blur-0 focus-visible:pointer-events-auto focus-visible:scale-100 focus-visible:opacity-100 focus-visible:blur-0"
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
      <HeartIcon class="h-5 w-5 {theme.is_favorited ? 'text-red-500' : ''}" fill={theme.is_favorited ? 'currentColor' : 'none'} />
    </button>
    {/if}
    <div class="absolute bottom-1 left-3 right-3 z-10 mb-1 flex flex-col gap-0.5">
      <span class="text-xl font-bold text-white drop-shadow-md">{theme.name}</span>
      {#if theme.author}
        <span class="text-xs text-white/85 drop-shadow-md line-clamp-1">By {theme.author}</span>
      {/if}
      <div class="flex gap-3 text-xs font-medium text-white/90 drop-shadow-xs">
        <span class="flex items-center gap-1">
          <DownloadIcon class="w-3.5 h-3.5" />
          {displayDownloadCount.toLocaleString()}
        </span>
        {#if showFavorites}
        <span class="flex items-center gap-1">
          <HeartIcon class="w-3.5 h-3.5" fill={theme.is_favorited ? 'currentColor' : 'none'} />
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
