<script lang="ts">
  import { onMount } from 'svelte';
  
  // Import existing components
  import CoverSwiper from '../components/store/CoverSwiper.svelte';
  import ThemeGrid from '../components/store/ThemeGrid.svelte';
  import SkeletonLoader from '../components/SkeletonLoader.svelte';
  import { settingsState } from '@/seqta/utils/listeners/SettingsState'
  import type { Theme } from '../types/Theme'
  import { visibleStoreThemes, buildCoverSlidesForThemes } from '@/interface/utils/themeStoreFlavours'
  import browser from 'webextension-polyfill'
  import ThemeModal from '../components/store/ThemeModal.svelte'
  import Header from '../components/store/Header.svelte'
  import { themeUpdates } from '../hooks/ThemeUpdates'
  import { ThemeManager } from '@/plugins/built-in/themes/theme-manager'

  import { loadBackground } from '@/seqta/ui/ImageBackgrounds'
  import Backgrounds from '../components/store/Backgrounds.svelte'
  import { cloudAuth } from '@/seqta/utils/CloudAuth'
  import SignInToFavoriteModal from '../components/SignInToFavoriteModal.svelte'

  const themeManager = ThemeManager.getInstance();
  let cloudLoggedIn = $state(cloudAuth.state.isLoggedIn);

  cloudAuth.subscribe((s) => { cloudLoggedIn = s.isLoggedIn; });

  // State variables
  let searchTerm = $state('');
  let themes = $state<Theme[]>([]);

  /** Grid/search/cover: hides flat-listed slaves when API sends them */
  let listThemes = $derived(visibleStoreThemes(themes));

  /** Cover marquee slides (master + flavour imagery for top masters) */
  let coverSlides = $derived(buildCoverSlidesForThemes(listThemes.slice(0, 3)));
  let loading = $state(true);
  let darkMode = $state(false);
  let displayTheme = $state<Theme | null>(null);
  let currentThemes = $state<string[]>([]);
  let activeTab = $state('themes');
  
  let error = $state<string | null>(null);
  let selectedBackground = $state<string | null>(null);
  let showSignInOverlay = $state(false);

  const fetchCurrentThemes = async () => {
    const themes = await themeManager.getAvailableThemes();
    currentThemes = themes.filter(theme => theme !== null).map(theme => theme.id);
  };

  const setDisplayTheme = (theme: Theme | null) => {
    displayTheme = theme;
  };
  
  const setSearchTerm = (term: string) => {
    searchTerm = term;
  };

  const setActiveTab = (tab: string) => {
    activeTab = tab;
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
    const token = await cloudAuth.getStoredToken();
    if (!token) return;
    const isFavorite = !theme.is_favorited;
    const result = (await browser.runtime.sendMessage({
      type: 'cloudFavorite',
      themeId: theme.id,
      token,
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
  const fetchThemes = async () => {
    try {
      const token = await cloudAuth.getStoredToken();
      const data = (await browser.runtime.sendMessage({
        type: 'fetchThemes',
        token: token ?? undefined,
      })) as {
        success?: boolean;
        data?: { themes: Theme[] };
        error?: string;
      };
      if (!data?.success || !data?.data?.themes) {
        throw new Error(data?.error || 'Failed to fetch themes');
      }
      themes = [...data.data.themes].sort(compareStoreThemes);

      loading = false;
    } catch (err) {
      console.error('Failed to fetch themes', err);
      setTimeout(fetchThemes, 5000); // Retry after 5 seconds if failure occurs
    }
  };

  // On mount
  onMount(async () => {
    await fetchThemes();
    await fetchCurrentThemes();
    
    darkMode = (await browser.storage.local.get('DarkMode')).DarkMode === 'true';
    darkMode = $settingsState.DarkMode;
  });

  // Filter themes (list is already featured-first, then newest; filter preserves order)
  let filteredThemes = $derived(
    listThemes.filter(
      (theme) =>
        theme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        theme.description.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
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

<div class="w-screen h-screen bg-white {darkMode ? 'dark' : ''}">
  <div class="h-full overflow-y-scroll bg-zinc-200/50 dark:bg-zinc-900 dark:text-white pt-[4.25rem]">
    <Header {searchTerm} {setSearchTerm} {darkMode} {activeTab} {setActiveTab} />
    
    <div class={`px-12 h-full ${activeTab === 'backgrounds' ? 'pt-0' : 'pt-6 md:px-24 lg:px-48'}`}>
      <!-- Loading State -->
      {#if loading}
        <div class="grid grid-cols-1 gap-4 py-12 mx-auto sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonLoader width="100%" height="200px" />
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
              onInstall={async (themeId: string) => {
                if (displayTheme) await installThemeFromStore(themeId, displayTheme);
              }}
              onRemove={async (themeId: string) => {
                console.debug('deleting theme', themeId);
                await removeThemeFromStore(themeId);
              }}
            />
          {/if}
        {:else if activeTab === 'backgrounds'}
          <Backgrounds {searchTerm} />
        {/if}
      {/if}
    </div>
  </div>

  {#if showSignInOverlay}
    <SignInToFavoriteModal onClose={() => (showSignInOverlay = false)} />
  {/if}
</div>