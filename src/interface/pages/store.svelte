<script lang="ts">
  import { onMount } from 'svelte'; // Lifecycle hook for running code after the component mounts
  
  // Import existing components
  import CoverSwiper from '../components/store/CoverSwiper.svelte'; // Component to display featured themes in a swiper
  import ThemeGrid from '../components/store/ThemeGrid.svelte'; // Component to display grid of themes
  import SkeletonLoader from '../components/SkeletonLoader.svelte'; // Placeholder loader shown while content is loading
  import { settingsState } from '@/seqta/utils/listeners/SettingsState'; // Global settings state
  import type { Theme } from '../types/Theme'; // Type definition for a Theme object
  import browser from 'webextension-polyfill'; // WebExtension API for accessing browser storage
  import ThemeModal from '../components/store/ThemeModal.svelte'; // Modal for displaying and managing a selected theme
  import Header from '../components/store/Header.svelte'; // Header component with search and tab controls
  import { themeUpdates } from '../hooks/ThemeUpdates'; // Hook to trigger theme-related updates
  import { ThemeManager } from '@/plugins/built-in/themes/theme-manager'; // Singleton theme manager for handling theme operations

  import { loadBackground } from '@/seqta/ui/ImageBackgrounds'; // Utility for loading background images
  import Backgrounds from '../components/store/Backgrounds.svelte'; // Component for displaying background options

  const themeManager = ThemeManager.getInstance(); // Get singleton instance of ThemeManager

  // State variables
  let searchTerm = $state(''); // Current search term entered by user
  let themes = $state<Theme[]>([]); // List of all available themes
  let coverThemes = $state<Theme[]>([]); // Subset of themes displayed in CoverSwiper
  let loading = $state(true); // Loading state for theme data
  let darkMode = $state(false); // Indicates whether dark mode is enabled
  let displayTheme = $state<Theme | null>(null); // Theme currently being displayed in the modal
  let currentThemes = $state<string[]>([]); // List of IDs of currently installed themes
  let activeTab = $state('themes'); // Currently active tab ("themes" or "backgrounds")
  
  let error = $state<string | null>(null); // Stores error messages
  let selectedBackground = $state<string | null>(null); // Selected background image

  // Fetches the list of currently installed theme IDs
  const fetchCurrentThemes = async () => {
    const themes = await themeManager.getAvailableThemes();
    currentThemes = themes.filter(theme => theme !== null).map(theme => theme.id);
  };

  // Sets the theme to be displayed in the modal
  const setDisplayTheme = (theme: Theme | null) => {
    displayTheme = theme;
  };
  
  // Sets the current search term
  const setSearchTerm = (term: string) => {
    searchTerm = term;
  };

  // Sets the active tab (themes or backgrounds)
  const setActiveTab = (tab: string) => {
    activeTab = tab;
  };

  // Fetches themes from remote repository and initializes display content
  const fetchThemes = async () => {
    try {
      const response = await fetch(`https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/store/themes.json?nocache=${(new Date()).getTime()}`, { cache: 'no-store' });
      const data = await response.json();
      themes = data.themes;

      // Shuffle themes for random display in CoverSwiper
      const shuffled = [...themes].sort(() => 0.5 - Math.random());
      coverThemes = shuffled.slice(0, 3);

      loading = false;
    } catch (error) {
      console.error('Failed to fetch themes', error);
      setTimeout(fetchThemes, 5000); // Retry after 5 seconds if failure occurs
    }
  };

  // Lifecycle method called when component mounts
  onMount(async () => {
    await fetchThemes(); // Fetch all themes
    await fetchCurrentThemes(); // Fetch installed themes
    
    // Retrieve dark mode setting from browser storage and settings state
    darkMode = (await browser.storage.local.get('DarkMode')).DarkMode === 'true';
    darkMode = $settingsState.DarkMode;
  });

  // Derived state for filtered themes based on search term
  let filteredThemes = $derived(themes.filter(theme =>
    theme.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    theme.description.toLowerCase().includes(searchTerm.toLowerCase())
  ));

  // Effect: Load background image when relevant state changes
  $effect(() => {
    loadBackground();
    selectedBackground;
  });

  // Effect: Log any errors to console
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
          <SkeletonLoader width="100%" height="200px" /> <!-- Placeholder skeleton shown while loading -->
        </div>
      {:else}
        <!-- Themes Tab Content -->
        {#if activeTab === 'themes'}
          {#if searchTerm === ''}
            <CoverSwiper {coverThemes} {setDisplayTheme} /> <!-- Show cover swiper if no search term -->
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
                  await themeManager.downloadTheme(displayTheme); // Download selected theme
                  await themeManager.setTheme(displayTheme.id); // Set theme as active
                  themeUpdates.triggerUpdate(); // Trigger UI update
                  await fetchCurrentThemes(); // Refresh installed themes list
                }
              }}
              onRemove={async () => {
                if (displayTheme?.id) {
                  console.debug('deleting theme', displayTheme.id); // Log theme deletion
                  await themeManager.deleteTheme(displayTheme.id); // Delete selected theme
                  themeUpdates.triggerUpdate(); // Trigger UI update
                  await fetchCurrentThemes(); // Refresh installed themes list
                }
              }}
            />
          {/if}
        {:else if activeTab === 'backgrounds'}
          <Backgrounds {searchTerm} /> <!-- Show background image options -->
        {/if}
      {/if}
    </div>
  </div>
</div>
