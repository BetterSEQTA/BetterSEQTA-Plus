<script lang="ts">
  import { onMount } from 'svelte';
  
  // Import existing components
  import CoverSwiper from '../components/store/CoverSwiper.svelte';
  import ThemeGrid from '../components/store/ThemeGrid.svelte';
  import SkeletonLoader from '../components/SkeletonLoader.svelte';
  import type { Theme } from '../types/Theme'
  import { visibleStoreThemes, buildCoverSlidesForThemes, normalizeStoreTheme } from '@/interface/utils/themeStoreFlavours'
  import browser from 'webextension-polyfill'
  import ThemeModal from '../components/store/ThemeModal.svelte'
  import { themeUpdates } from '../hooks/ThemeUpdates'
  import { ThemeManager } from '@/plugins/built-in/themes/theme-manager'

  import { loadBackground } from '@/seqta/ui/ImageBackgrounds'
  import Backgrounds from '../components/store/Backgrounds.svelte'
  import { cloudAuth } from '@/seqta/utils/CloudAuth'
  import SignInToFavoriteModal from '../components/SignInToFavoriteModal.svelte'
  import { consumePendingHighlightThemeId } from '@/seqta/utils/openThemeStoreWithHighlight'

  const themeManager = ThemeManager.getInstance();
  type StoreTab = 'themes' | 'backgrounds';
  let {
    activeTab,
    searchTerm,
    selectedBackgroundCategory,
    setActiveTab,
    setSearchTerm,
    setBackgroundCategories,
  } = $props<{
    activeTab: StoreTab;
    searchTerm: string;
    selectedBackgroundCategory: string;
    setActiveTab: (tab: StoreTab) => void;
    setSearchTerm: (term: string) => void;
    setBackgroundCategories: (categories: string[]) => void;
  }>();
  let cloudLoggedIn = $state(cloudAuth.state.isLoggedIn);

  $effect(() => {
    const unsub = cloudAuth.subscribe((s) => { cloudLoggedIn = s.isLoggedIn; });
    return unsub;
  });

  // State variables
  let themes = $state<Theme[]>([]);

  /** Grid/search/cover: hides flat-listed slaves when API sends them */
  let listThemes = $derived(visibleStoreThemes(themes));

  /** Cover marquee slides (master + flavour imagery for top masters) */
  let coverSlides = $derived(buildCoverSlidesForThemes(listThemes.slice(0, 3)));
  let loading = $state(true);
  let displayTheme = $state<Theme | null>(null);
  let currentThemes = $state<string[]>([]);
  let selectedThemeId = $state('');
  let installedThemeColors = $state<Record<string, string>>({});
  
  let error = $state<string | null>(null);
  let fetchAttempt = $state(0);
  let selectedBackground = $state<string | null>(null);
  let showSignInOverlay = $state(false);

  const MAX_FETCH_ATTEMPTS = 3;
  const FETCH_MESSAGE_TIMEOUT_MS = 25_000;

  function sendMessageWithTimeout<T>(message: object): Promise<T> {
    return Promise.race([
      browser.runtime.sendMessage(message) as Promise<T>,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Theme store request timed out — reload the SEQTA page after updating the extension.')), FETCH_MESSAGE_TIMEOUT_MS);
      }),
    ]);
  }

  const fetchCurrentThemes = async () => {
    const themes = await themeManager.getAvailableThemes();
    currentThemes = themes.filter(theme => theme !== null).map(theme => theme.id);
    selectedThemeId = themeManager.getSelectedThemeId() || '';
    installedThemeColors = Object.fromEntries(
      themes.filter((theme) => theme != null).map((theme) => [theme.id, theme.defaultColour]),
    );
  };

  const setDisplayTheme = (theme: Theme | null) => {
    displayTheme = theme;
  };
  
  /** Featured themes first; within each group, newest by `created_at` (API: Unix seconds). */
  function compareStoreThemes(a: Theme, b: Theme): number {
    const fa = a.featured === true ? 1 : 0;
    const fb = b.featured === true ? 1 : 0;
    if (fa !== fb) return fb - fa;
    const ca = a.created_at ?? 0;
    const cb = b.created_at ?? 0;
    if (ca !== cb) return cb - ca;
    return a.name.localeCompare(b.name);
  }

  const toggleFavorite = async (theme: Theme) => {
    if (!cloudLoggedIn) return;
    const isFavorite = !theme.is_favorited;
    const result = (await browser.runtime.sendMessage({
      type: 'cloudFavorite',
      themeId: theme.id,
      action: isFavorite ? 'favorite' : 'unfavorite',
    })) as { success?: boolean };
    if (result?.success) {
      const delta = isFavorite ? 1 : -1;
      themes = themes.map((t) =>
        t.id === theme.id
          ? { ...t, is_favorited: isFavorite, favorite_count: Math.max(0, (t.favorite_count ?? 0) + delta) }
          : t
      );
      if (displayTheme?.id === theme.id) {
        displayTheme = {
          ...displayTheme,
          is_favorited: isFavorite,
          favorite_count: Math.max(0, (displayTheme.favorite_count ?? 0) + delta),
        };
      }
    }
  };

  // Fetch themes via background script (avoids CORS when store runs inside SEQTA page)
  const fetchThemes = async (isRetry = false) => {
    if (!isRetry) {
      fetchAttempt = 0;
      error = null;
    }
    try {
      const data = await sendMessageWithTimeout<{
        success?: boolean;
        data?: { themes: unknown[] };
        error?: string;
      }>({
        type: 'fetchThemes',
      });
      if (!data?.success || !Array.isArray(data?.data?.themes)) {
        throw new Error(data?.error || 'Failed to fetch themes');
      }
      themes = data.data.themes
        .map((row) => normalizeStoreTheme(row as Record<string, unknown>))
        .filter((t) => t.id.length > 0)
        .sort(compareStoreThemes);
      error = null;
      loading = false;
    } catch (err) {
      console.error('Failed to fetch themes', err);
      fetchAttempt += 1;
      if (fetchAttempt >= MAX_FETCH_ATTEMPTS) {
        error =
          err instanceof Error
            ? err.message
            : 'Could not load themes. Reload the SEQTA page, then open the store again.';
        loading = false;
        return;
      }
      setTimeout(() => fetchThemes(true), 5000);
    }
  };

  function focusThemeById(themeId: string) {
    const match = themes.find((t) => t.id === themeId)
      ?? themes.find((t) => t.flavours?.some((f) => f.id === themeId));
    if (match) {
      setActiveTab('themes');
      setSearchTerm('');
      displayTheme = match;
    }
  }

  function onHighlightThemeEvent(e: Event) {
    const detail = (e as CustomEvent).detail;
    if (detail?.themeId && typeof detail.themeId === 'string') {
      focusThemeById(detail.themeId);
    }
  }

  // On mount
  onMount(async () => {
    window.addEventListener('bsplus:highlight-theme', onHighlightThemeEvent);
    themeUpdates.addListener(fetchCurrentThemes);

    await fetchThemes();
    await fetchCurrentThemes();
    
    const pending = consumePendingHighlightThemeId();
    if (pending) focusThemeById(pending);

    return () => {
      window.removeEventListener('bsplus:highlight-theme', onHighlightThemeEvent);
      themeUpdates.removeListener(fetchCurrentThemes);
    };
  });

  // Filter themes (list is already featured-first, then newest; filter preserves order)
  let filteredThemes = $derived(
    listThemes.filter((theme) => {
      const q = searchTerm.toLowerCase();
      const name = (theme.name ?? '').toLowerCase();
      const description = (theme.description ?? '').toLowerCase();
      return name.includes(q) || description.includes(q);
    }),
  );

  async function installThemeFromStore(themeId: string, meta: Theme) {
    const fullRow = themes.find((x) => x.id === themeId);
    if (fullRow) {
      await themeManager.downloadTheme(fullRow);
    } else {
      const flavour = meta.flavours?.find((f) => f.id === themeId);
      await themeManager.downloadTheme({
        id: themeId,
        name: flavour?.name ?? meta.name,
      } as Theme);
    }
    await themeManager.setTheme(themeId);
    themeUpdates.triggerUpdate();
    await fetchCurrentThemes();
    void browser.runtime.sendMessage({ type: 'cloudSettingsRequestDebouncedUpload' }).catch(() => {});
  }

  async function removeThemeFromStore(themeId: string) {
    await themeManager.deleteTheme(themeId);
    themeUpdates.triggerUpdate();
    await fetchCurrentThemes();
  }

  async function applyThemeFromStore(themeId: string) {
    await themeManager.setTheme(themeId);
    selectedThemeId = themeId;
    themeUpdates.triggerUpdate();
    void browser.runtime.sendMessage({ type: 'cloudSettingsRequestDebouncedUpload' }).catch(() => {});
  }

  $effect(() => {
    loadBackground();
    selectedBackground
  });

  $effect(() => {
    if (error) {
      console.error(error);
    }
  });

  // Refetch themes when user logs in (from another tab) to get is_favorited
  let lastLoggedIn = $state(false);
  $effect(() => {
    if (cloudLoggedIn && !lastLoggedIn) {
      lastLoggedIn = true;
      fetchThemes();
    } else if (!cloudLoggedIn) {
      lastLoggedIn = false;
    }
  });
</script>

<div class="relative flex h-full min-h-0 flex-col overflow-hidden text-zinc-900 dark:text-white">
    <main class="min-h-0 flex-1 overflow-y-auto bg-zinc-50/80 dark:bg-zinc-900/40">
      <div class={activeTab === 'backgrounds' ? 'h-full' : 'px-6 py-6 md:px-8 lg:px-10'}>
        <!-- Loading State -->
        {#if loading}
        <div class="grid grid-cols-1 gap-4 py-12 mx-auto sm:grid-cols-2 lg:grid-cols-3">
          {#each Array(6) as _, i (i)}
            <SkeletonLoader width="100%" height="200px" />
          {/each}
        </div>
      {:else if error}
        <div class="flex flex-col items-center justify-center py-24 text-center max-w-lg mx-auto">
          <h2 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Couldn&apos;t load themes</h2>
          <p class="mt-3 text-zinc-600 dark:text-zinc-300">{error}</p>
          <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            After an extension update, reload your SEQTA tab so the new version can talk to the browser.
          </p>
          <button
            type="button"
            class="mt-6 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            onclick={() => {
              loading = true;
              error = null;
              void fetchThemes();
            }}
          >
            Try again
          </button>
        </div>
      {:else}
        <!-- Themes Tab Content -->
        {#if activeTab === 'themes'}
          {#if searchTerm === ''}
            <CoverSwiper slides={coverSlides} {setDisplayTheme} />
          {/if}
    
          <!-- ThemeGrid to display filtered themes -->
          <ThemeGrid
            themes={filteredThemes}
            allStoreThemeRows={themes}
            {searchTerm}
            {setDisplayTheme}
            {toggleFavorite}
            isLoggedIn={cloudLoggedIn}
            onRequestSignIn={() => (showSignInOverlay = true)}
            installedThemeIds={currentThemes}
          />
    
          {#if displayTheme}
            <ThemeModal
              currentThemes={currentThemes}
              allThemes={listThemes}
              allStoreThemeRows={themes}
              theme={displayTheme}
              {displayTheme}
              {setDisplayTheme}
              {toggleFavorite}
              isLoggedIn={cloudLoggedIn}
              onRequestSignIn={() => (showSignInOverlay = true)}
              {selectedThemeId}
              {installedThemeColors}
              onInstall={async (themeId: string) => {
                if (displayTheme) await installThemeFromStore(themeId, displayTheme);
              }}
              onRemove={async (themeId: string) => {
                console.debug('deleting theme', themeId);
                await removeThemeFromStore(themeId);
              }}
              onApply={async (themeId: string) => {
                await applyThemeFromStore(themeId);
              }}
            />
          {/if}
        {:else if activeTab === 'backgrounds'}
          <Backgrounds
            {searchTerm}
            selectedCategory={selectedBackgroundCategory}
            onCategoriesChange={setBackgroundCategories}
          />
        {/if}
        {/if}
      </div>
    </main>

  {#if showSignInOverlay}
    <SignInToFavoriteModal onClose={() => (showSignInOverlay = false)} />
  {/if}
</div>
