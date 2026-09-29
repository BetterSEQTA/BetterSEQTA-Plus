<script lang="ts">
  import type { Theme } from '@/interface/types/Theme'
  import ThemeCard from './ThemeCard.svelte';

  let {
    themes,
    searchTerm,
    setDisplayTheme,
    toggleFavorite,
    isLoggedIn,
    onRequestSignIn,
    allStoreThemeRows,
    installedThemeIds = [],
    variant = 'official',
  } = $props<{
    themes: Theme[];
    searchTerm: string;
    setDisplayTheme: (theme: Theme) => void;
    toggleFavorite: (theme: Theme) => void;
    isLoggedIn: boolean;
    onRequestSignIn?: () => void;
    /** Raw API list (includes `slave` rows) for master download aggregation */
    allStoreThemeRows?: Theme[];
    installedThemeIds?: string[];
    variant?: 'official' | 'community';
  }>();
  
  let filteredThemes = $derived(themes.filter((theme: Theme) => {
    const q = searchTerm.toLowerCase();
    const name = (theme.name ?? '').toLowerCase();
    const description = (theme.description ?? '').toLowerCase();
    return name.includes(q) || description.includes(q);
  }));

  const isCommunity = $derived(variant === 'community');
  const hasSearchQuery = $derived(searchTerm.trim().length > 0);

  function openCommunityThemeBuilder() {
    void import('@/seqta/utils/launchPageThemeBuilder').then(({ launchPageThemeBuilder }) =>
      launchPageThemeBuilder(),
    );
  }
</script>

<div class="relative">
  {#if filteredThemes.length > 0}
    <div class="mx-auto grid grid-cols-1 gap-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each filteredThemes as theme (theme.id)}
        <ThemeCard
          {theme}
          onClick={() => setDisplayTheme(theme)}
          {toggleFavorite}
          {isLoggedIn}
          {onRequestSignIn}
          {allStoreThemeRows}
          {installedThemeIds}
          {variant}
        />
      {/each}
    </div>
  {:else if isCommunity}
    <div class="mx-auto flex max-w-lg flex-col items-center justify-center py-24 text-center">
      {#if hasSearchQuery}
        <h2 class="text-xl font-semibold text-zinc-900 dark:text-white" style="text-wrap: balance">
          No themes match your search
        </h2>
        <p class="mt-2 text-base text-zinc-500 dark:text-zinc-400" style="text-wrap: pretty">
          Try another name or keyword, or clear the search box to browse all approved community themes.
        </p>
      {:else}
        <h2 class="text-xl font-semibold text-zinc-900 dark:text-white" style="text-wrap: balance">
          No community themes yet
        </h2>
        <p class="mt-2 text-base text-zinc-500 dark:text-zinc-400" style="text-wrap: pretty">
          Approved themes from other users will appear here. Create your own and submit it for review to
          share it with the community.
        </p>
        <button
          type="button"
          class="mt-6 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          onclick={openCommunityThemeBuilder}
        >
          Create &amp; submit a theme
        </button>
      {/if}
    </div>
  {:else}
    <div class="absolute top-0 flex h-96 w-full flex-col items-center justify-center text-center">
      <h1 class="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
        That doesn't exist! 😭😭😭
      </h1>
      <p class="mt-6 text-lg leading-7 text-zinc-600 dark:text-zinc-300">
        Sorry, we couldn't find the theme you're looking for. Maybe... you could create it?
      </p>
      <a
        href="https://docs.betterseqta.org/theme-creation/"
        class="mt-4 cursor-pointer rounded-md bg-zinc-500/10 p-2 px-3 transition hover:scale-105 dark:text-white"
      >
        Show me how!
      </a>
    </div>
  {/if}
</div>
