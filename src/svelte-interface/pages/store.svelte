<script lang="ts">
  import { onMount } from 'svelte';
  
  // Import child components
  import CoverSwiper from '../components/store/CoverSwiper.svelte';
  import ThemeGrid from '../components/store/ThemeGrid.svelte';
  import SkeletonLoader from '../components/SkeletonLoader.svelte';
  import { settingsState } from '@/seqta/utils/listeners/SettingsState'
  import type { Theme } from '../types/Theme'
  import browser from 'webextension-polyfill'
  import ThemeModal from '../components/store/ThemeModal.svelte'
  import { StoreDownloadTheme } from '@/seqta/ui/themes/downloadTheme'
  import { setTheme } from '@/seqta/ui/themes/setTheme'
  import Header from '../components/store/Header.svelte'
  import { deleteTheme } from '@/seqta/ui/themes/deleteTheme'
  import { getAvailableThemes } from '@/seqta/ui/themes/getAvailableThemes'

  // State variables
  let searchTerm = $state<string>('');
  let themes = $state<Theme[]>([]);
  let coverThemes = $state<Theme[]>([]);
  let loading = $state<boolean>(true);
  let darkMode = $state<boolean>(false);
  let displayTheme = $state<Theme | null>(null);
  let currentThemes = $state<string[]>([]);

  const fetchCurrentThemes = async () => {
    const themes = await getAvailableThemes();
    currentThemes = themes.themes.filter(theme => theme !== null).map(theme => theme.id);
  };

  const setDisplayTheme = (theme: Theme | null) => {
    displayTheme = theme;
  };
  
  const setSearchTerm = (term: string) => {
    searchTerm = term;
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
</script>

<div class="w-screen h-screen bg-white pt-[4.25rem] {darkMode ? 'dark' : ''}">
  <div class="h-full overflow-y-scroll bg-zinc-200/50 dark:bg-zinc-900 dark:text-white">
    <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} darkMode={darkMode} />
    
    <div class="px-12 pt-12">
      <!-- Loading State -->
      {#if loading}
        <div class="grid grid-cols-1 gap-4 py-12 mx-auto sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonLoader width="100%" height="200px" />
        </div>
      {:else}
  
        {#if searchTerm === ''}
          <CoverSwiper coverThemes={coverThemes} setDisplayTheme={setDisplayTheme} />
        {/if}
  
        <!-- ThemeGrid to display filtered themes -->
        <ThemeGrid themes={filteredThemes} searchTerm={searchTerm} setDisplayTheme={setDisplayTheme} />
  
        {#if displayTheme}
          <ThemeModal currentThemes={currentThemes} allThemes={themes} theme={displayTheme} displayTheme={displayTheme} setDisplayTheme={setDisplayTheme} onInstall={async () => {
            if (displayTheme) {
              await StoreDownloadTheme({themeContent: displayTheme})
              // @ts-ignore
              setTheme(displayTheme.id);
              await fetchCurrentThemes();
            }
          }} onRemove={async () => {
            if (displayTheme?.id) {
              console.log('deleting theme', displayTheme.id);
              deleteTheme(displayTheme.id)
              await fetchCurrentThemes();
            }
          }} />
        {/if}
      {/if}
    </div>
  </div>
</div>