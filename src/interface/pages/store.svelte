<script lang="ts">
  import { onMount } from 'svelte';
  
  // Import existing components
  import CoverSwiper from '../components/store/CoverSwiper.svelte';
  import ThemeGrid from '../components/store/ThemeGrid.svelte';
  import SkeletonLoader from '../components/SkeletonLoader.svelte';
  import { settingsState } from '@/seqta/utils/listeners/SettingsState'
  import type { Theme } from '../types/Theme'
  import browser from 'webextension-polyfill'
  import ThemeModal from '../components/store/ThemeModal.svelte'
  import Header from '../components/store/Header.svelte'
  import { themeUpdates } from '../hooks/ThemeUpdates'
  import { ThemeManager } from '@/plugins/built-in/themes/theme-manager'

  import { loadBackground } from '@/seqta/ui/ImageBackgrounds'
  import Backgrounds from '../components/store/Backgrounds.svelte'

  const themeManager = ThemeManager.getInstance();

  // State variables
  let searchTerm = $state('');
  let themes = $state<Theme[]>([]);
  let coverThemes = $state<Theme[]>([]);
  let loading = $state(true);
  let darkMode = $state(false);
  let displayTheme = $state<Theme | null>(null);
  let currentThemes = $state<string[]>([]);
  let activeTab = $state('themes');
  
  let error = $state<string | null>(null);
  let selectedBackground = $state<string | null>(null);

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

  // Fetch themes and initialize app
  const fetchThemes = async () => {
    try {
      const response = await fetch(`https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/store/themes.json?nocache=${(new Date()).getTime()}`, { cache: 'no-store' });
      const data = await response.json();
      themes = data.themes;

      // Shuffle for cover themes
      const shuffled = [...themes].sort(() => 0.5 - Math.random());
      coverThemes = shuffled.slice(0, 3);

      loading = false;
    } catch (error) {
      console.error('Failed to fetch themes', error);
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

  // Filter themes based on search term
  let filteredThemes = $derived(themes.filter(theme =>
    theme.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    theme.description.toLowerCase().includes(searchTerm.toLowerCase())
  ));

  $effect(() => {
    loadBackground();
    selectedBackground
  });

  $effect(() => {
    if (error) {
      console.error(error);
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
            <CoverSwiper {coverThemes} {setDisplayTheme} />
          {/if}
    
          <!-- ThemeGrid to display filtered themes -->
          <ThemeGrid themes={filteredThemes} {searchTerm} {setDisplayTheme} />
    
          {#if displayTheme}
            <ThemeModal
              currentThemes={currentThemes}
              allThemes={themes}
              theme={displayTheme}
              {displayTheme}
              {setDisplayTheme}
              onInstall={async () => {
                if (displayTheme) {
                  await themeManager.downloadTheme(displayTheme);
                  await themeManager.setTheme(displayTheme.id);
                  themeUpdates.triggerUpdate();
                  await fetchCurrentThemes();
                }
              }}
              onRemove={async () => {
                if (displayTheme?.id) {
                  console.debug('deleting theme', displayTheme.id);
                  await themeManager.deleteTheme(displayTheme.id);
                  themeUpdates.triggerUpdate();
                  await fetchCurrentThemes();
                }
              }}
            />
          {/if}
        {:else if activeTab === 'backgrounds'}
          <Backgrounds {searchTerm} />
        {/if}
      {/if}
    </div>
  </div>
</div>