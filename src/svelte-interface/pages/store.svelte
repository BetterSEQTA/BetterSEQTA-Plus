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
  import { StoreDownloadTheme } from '@/seqta/ui/themes/downloadTheme'
  import { setTheme } from '@/seqta/ui/themes/setTheme'
  import Header from '../components/store/Header.svelte'
  import { deleteTheme } from '@/seqta/ui/themes/deleteTheme'
  import { getAvailableThemes } from '@/seqta/ui/themes/getAvailableThemes'
  import { themeUpdates } from '../hooks/ThemeUpdates'

  // Import background-related functions and components
  import { hasEnoughStorageSpace, isIndexedDBSupported, writeData, openDatabase, readAllData, deleteData } from '@/svelte-interface/hooks/BackgroundDataLoader'
  import BackgroundUploader from '../components/themes/BackgroundUploader.svelte';
  import BackgroundItem from '../components/themes/BackgroundItem.svelte'
  import { loadBackground } from '@/seqta/ui/ImageBackgrounds'

  // State variables
  let searchTerm = $state('');
  let themes = $state<Theme[]>([]);
  let coverThemes = $state<Theme[]>([]);
  let loading = $state(true);
  let darkMode = $state(false);
  let displayTheme = $state<Theme | null>(null);
  let currentThemes = $state<string[]>([]);
  let activeTab = $state('themes');
  
  // Background-related state
  let backgrounds = $state<{ id: string; type: string; blob: Blob | null; url?: string }[]>([]);
  let error = $state<string | null>(null);
  let selectedBackground = $state<string | null>(null);

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

  const setActiveTab = (tab: string) => {
    activeTab = tab;
  };

  async function getTheme() {
    return localStorage.getItem('selectedBackground');
  }

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

  // Background-related functions
  async function handleFileChange(file: File): Promise<void> {
    if (!file) return;

    try {
      if (!isIndexedDBSupported()) {
        throw new Error("Your browser doesn't support IndexedDB. Unable to save backgrounds.");
      }

      const hasSpace = await hasEnoughStorageSpace(file.size);
      if (!hasSpace) {
        throw new Error("Not enough storage space to save this background.");
      }

      const fileId = `${Date.now()}-${file.name}`;
      const fileType = file.type.split('/')[0];
      const blob = new Blob([file], { type: file.type });

      await writeData(fileId, fileType, blob);
      backgrounds = [...backgrounds, { id: fileId, type: fileType, blob, url: URL.createObjectURL(blob) }];
    } catch (e) {
      if (e instanceof Error) {
        error = e.message;
      } else {
        error = 'An unknown error occurred';
      }
    }
  }

  async function loadBackgroundMetadata(): Promise<void> {
    try {
      error = null;

      if (!isIndexedDBSupported()) {
        throw new Error("Your browser doesn't support IndexedDB. Unable to load backgrounds.");
      }

      await openDatabase();
      const data = await readAllData();
      selectedBackground = await getTheme();
      
      // Only load metadata (id and type) for placeholders
      backgrounds = data.map(({ id, type }) => ({ id, type, blob: null }));
    } catch (e) {
      if (e instanceof Error) {
        error = e.message;
      } else {
        error = 'An unknown error occurred';
      }
    }
  }

  async function loadFullBackgrounds(): Promise<void> {
    try {
      error = null;

      if (!isIndexedDBSupported()) {
        throw new Error("Your browser doesn't support IndexedDB. Unable to load backgrounds.");
      }

      const data = await readAllData();
      backgrounds = await preloadBackgrounds(data);
    } catch (e) {
      if (e instanceof Error) {
        error = e.message;
      } else {
        error = 'An unknown error occurred';
      }
    }
  }

  async function preloadBackgrounds(data: { id: string; type: string; blob: Blob }[]): Promise<{ id: string; type: string; blob: Blob; url: string }[]> {
    return data.map(bg => ({
      ...bg,
      url: URL.createObjectURL(bg.blob)
    }));
  }

  function selectBackground(fileId: string): void {
    if (selectedBackground === fileId) {
      selectNoBackground();
      return;
    }
    
    selectedBackground = fileId;
    setTheme(fileId);
  }

  async function deleteBackground(fileId: string): Promise<void> {
    try {
      await deleteData(fileId);
      backgrounds = backgrounds.filter(bg => bg.id !== fileId);

      if (selectedBackground === fileId) {
        selectNoBackground();
      }
    } catch (e) {
      if (e instanceof Error) {
        error = `Failed to delete background: ${e.message}`;
      } else {
        error = 'An unknown error occurred';
      }
    }
  }

  function selectNoBackground() {
    selectedBackground = null;
    setTheme('');
  }

  // On mount
  onMount(async () => {
    await fetchThemes();
    await fetchCurrentThemes();
    await loadBackgroundMetadata();
    
    darkMode = (await browser.storage.local.get('DarkMode')).DarkMode === 'true';
    darkMode = $settingsState.DarkMode;
  });

  // Filter themes based on search term
  let filteredThemes = $derived(themes.filter(theme =>
    theme.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    theme.description.toLowerCase().includes(searchTerm.toLowerCase())
  ));

  let imageBackgrounds = $derived(backgrounds.filter(bg => bg.type === 'image'));
  let videoBackgrounds = $derived(backgrounds.filter(bg => bg.type === 'video'));

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
    
    <div class="px-12 pt-6">
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
                  await StoreDownloadTheme({themeContent: displayTheme})
                  setTheme(displayTheme.id);
                  themeUpdates.triggerUpdate();
                  await fetchCurrentThemes();
                }
              }}
              onRemove={async () => {
                if (displayTheme?.id) {
                  console.debug('deleting theme', displayTheme.id);
                  deleteTheme(displayTheme.id)
                  themeUpdates.triggerUpdate();
                  await fetchCurrentThemes();
                }
              }}
            />
          {/if}
        {:else if activeTab === 'backgrounds'}
          <!-- Backgrounds Tab Content -->
          <div class="space-y-6">
            <div>
              <h2 class="mb-4 text-lg font-bold">Background Images</h2>
              <div class="flex flex-wrap gap-4 mb-4">
                <BackgroundUploader on:fileChange={e => handleFileChange(e.detail)} />
                {#each imageBackgrounds as bg (bg.id)}
                  <BackgroundItem
                    {bg}
                    isSelected={selectedBackground === bg.id}
                    isEditMode={false}
                    onClick={() => selectBackground(bg.id)}
                    onDelete={() => deleteBackground(bg.id)}
                  />
                {/each}
              </div>
            </div>
            
            <div>
              <h2 class="mb-4 text-lg font-bold">Background Videos</h2>
              <div class="flex flex-wrap gap-4">
                <BackgroundUploader on:fileChange={e => handleFileChange(e.detail)} />
                {#each videoBackgrounds as bg (bg.id)}
                  <BackgroundItem
                    {bg}
                    isSelected={selectedBackground === bg.id}
                    isEditMode={false}
                    onClick={() => selectBackground(bg.id)}
                    onDelete={() => deleteBackground(bg.id)}
                  />
                {/each}
              </div>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>