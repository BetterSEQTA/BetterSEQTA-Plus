<script lang="ts">
  import { hasEnoughStorageSpace, isIndexedDBSupported, writeData, openDatabase, readAllData, deleteData } from '@/interface/hooks/BackgroundDataLoader';
  import Spinner from '../Spinner.svelte';
  import { settingsState } from '@/seqta/utils/listeners/SettingsState'
  import { Index } from 'flexsearch';
  import { backgroundUpdates } from '@/interface/hooks/BackgroundUpdates'
  import { ThemeManager } from '@/plugins/built-in/themes/theme-manager'

  const themeManager = ThemeManager.getInstance();

  type Background = { id: string; category: string; type: string; lowResUrl: string; highResUrl: string; name: string; description: string; featured?: boolean };
  let { searchTerm } = $props<{ searchTerm: string }>();

  // Existing states
  let backgrounds = $state<Background[]>([]);
  let selectedCategory = $state<string>('All');
  let error = $state<string | null>(null);
  let selectedBackground = $state<string | null>(null);
  let isLoading = $state<boolean>(true);
  let savedBackgrounds = $state<string[]>([]);
  let installingBackgrounds = $state<Set<string>>(new Set());
  let debugInfo = $state<string>('');
  let searchIndex = $state<Index | null>(null);

  // New state variables
  let activeTab = $state<'all' | 'installed' | 'photos' | 'videos'>('all');
  let sortBy = $state<'newest' | 'popular' | 'name'>('newest');

  // Existing functions
  const loadStore = async () => {
    try {
      debugInfo = 'Fetching backgrounds...';
      const response = await fetch('https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/store/backgrounds.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      backgrounds = data.backgrounds;
      
      // Initialize FlexSearch index
      const index = new Index({
        tokenize: "forward",
        preset: "score"
      });
      
      // Add backgrounds to the index
      backgrounds.forEach((bg, i) => {
        index.add(i, bg.name + " " + bg.description);
      });
      
      searchIndex = index;
      debugInfo = `Loaded ${backgrounds.length} backgrounds`;
      await loadSavedBackgrounds();
    } catch (e) {
      error = 'Failed to load background store';
      debugInfo = `Error: ${e instanceof Error ? e.message : 'Unknown error'}`;
    } finally {
      isLoading = false;
    }
  };

  async function loadSavedBackgrounds(): Promise<void> {
    try {
      if (!isIndexedDBSupported()) {
        throw new Error("Your browser doesn't support IndexedDB.");
      }
      await openDatabase();
      const data = await readAllData();
      savedBackgrounds = data.map(item => item.id);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error occurred';
    }
  }

  // Load data on mount
  loadStore();

  // Derived states
  let filteredBackgrounds = $derived((() => {
    let filtered = backgrounds;
    
    // Use FlexSearch if there's a search term
    if (searchTerm.trim() && searchIndex) {
      const results = searchIndex.search(searchTerm) as number[];
      filtered = results.map(i => backgrounds[i]);
    }

    // Apply category filtering
    filtered = filtered.filter((bg: Background) => {
      return selectedCategory === 'All' 
        ? true 
        : selectedCategory === 'Featured' 
          ? bg.featured 
          : bg.category === selectedCategory;
    });

    // Apply sorting
    filtered.sort((a: Background, b: Background) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
          return -1;
        case 'popular':
          return -1;
        default:
          return 0;
      }
    });

    return filtered;
  })());

  let categories = $derived([...new Set(backgrounds.map(bg => bg.category))]);

  // Background management functions
  async function saveBackgroundFromUrl(url: string, id: string, fileType: string): Promise<void> {
    try {
      if (!isIndexedDBSupported()) {
        throw new Error("Your browser doesn't support IndexedDB.");
      }

      const response = await fetch(url);
      const blob = await response.blob();
      const hasSpace = await hasEnoughStorageSpace(blob.size);

      if (!hasSpace) {
        throw new Error("Not enough storage space.");
      }

      await writeData(id, fileType, blob);
      savedBackgrounds = [...savedBackgrounds, id];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error occurred';
    }
  }

  async function deleteBackground(fileId: string): Promise<void> {
    installingBackgrounds = new Set(installingBackgrounds).add(fileId);
    try {
      await deleteData(fileId);
      savedBackgrounds = savedBackgrounds.filter(id => id !== fileId);

      if (selectedBackground === fileId) {
        selectNoBackground();
      }
    } catch (e) {
      error = e instanceof Error ? `Failed to delete background: ${e.message}` : 'Unknown error occurred';
    } finally {
      installingBackgrounds = new Set(installingBackgrounds);
      installingBackgrounds.delete(fileId);
    }
  }

  async function installBackground(background: Background) {
    installingBackgrounds = new Set(installingBackgrounds).add(background.id);
    try {
      await saveBackgroundFromUrl(background.highResUrl, background.id, background.type);
      backgroundUpdates.triggerUpdate();
    } finally {
      installingBackgrounds = new Set(installingBackgrounds);
      installingBackgrounds.delete(background.id);
    }
  }

  async function toggleBackgroundInstallation(background: Background) {
    if (savedBackgrounds.includes(background.id)) {
      await deleteBackground(background.id);
    } else {
      await installBackground(background);
    }
  }
  
  function selectNoBackground() {
    selectedBackground = null;
    themeManager.setTheme('');
  }
</script>

<div class="flex h-full">
  <!-- Sidebar -->
  <div class="p-4 w-64 h-full border-r border-zinc-200 dark:border-zinc-700">
    <div class="mb-8">
      <h2 class="mb-4 text-lg font-semibold">Categories</h2>
      <nav class="space-y-2">
        <button
          class={`w-full px-4 py-2 text-left bg-transparent rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ${selectedCategory === 'All' ? 'bg-blue-100 dark:bg-zinc-800' : ''}`}
          onclick={() => selectedCategory = 'All'}
        >
          All
        </button>
        <button
          class={`w-full px-4 py-2 text-left bg-transparent rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ${selectedCategory === 'Featured' ? 'bg-blue-100 dark:bg-zinc-800' : ''}`}
          onclick={() => selectedCategory = 'Featured'}
        >
          Featured
        </button>
        
        <div class="my-2 border-b border-zinc-200 dark:border-zinc-700"></div>
        
        {#each categories as category}
          <button
            class={`w-full px-4 py-2 text-left bg-transparent rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ${selectedCategory === category ? 'bg-blue-100 dark:bg-zinc-800' : ''}`}
            onclick={() => selectedCategory = category}
          >
            {category}
          </button>
        {/each}
      </nav>
    </div>
  </div>

  <!-- Main Content -->
  <div class="overflow-auto flex-1">
    <!-- Header -->
    <div class="sticky top-0 z-10 p-4 border-b bg-[#F1F1F3] dark:bg-zinc-900 dark:border-zinc-700">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Explore Backgrounds {searchTerm ? `- "${searchTerm}"` : ''}</h1>
        <div class="flex gap-4 items-center">
          <select 
            bind:value={sortBy} 
            class="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="newest">Newest</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2">
        {#each ['All', 'Installed', 'Photos', 'Videos'] as tab}
          <button
            class={`px-4 py-2 text-sm font-medium transition-colors rounded-full
              ${activeTab === tab.toLowerCase() ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700' : 
                'bg-zinc-100 dark:bg-transparent dark:outline dark:outline-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700/20'}`}
            onclick={() => activeTab = tab.toLowerCase() as typeof activeTab}
          >
            {tab}
          </button>
        {/each}
      </div>
    </div>

    <!-- Background Grid -->
    <div class="p-4">
      {#if isLoading}
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each Array(9) as _}
            <div class="overflow-hidden relative rounded-lg animate-pulse">
              <!-- Image placeholder -->
              <div class="w-full h-48 bg-zinc-200 dark:bg-zinc-800"></div>
              <!-- Gradient overlay -->
              <div class="absolute right-0 bottom-0 left-0 h-16 to-transparent bg-linear-to-t from-zinc-300 dark:from-zinc-700">
                <!-- Title placeholder -->
                <div class="absolute right-2 bottom-2 left-2">
                  <div class="w-2/3 h-4 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
                  <div class="mt-2 w-1/2 h-3 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else if error}
        <div class="p-4 text-red-500 bg-red-100 rounded-lg">
          Error: {error}
        </div>
      {:else}
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each filteredBackgrounds.filter((bg: Background) => {
            if (activeTab === 'installed') return savedBackgrounds.includes(bg.id);
            if (activeTab === 'photos') return bg.type === 'image';
            if (activeTab === 'videos') return bg.type !== 'image';
            return true;
          }) as background (background.id)}
            <div
              class="overflow-hidden relative rounded-lg shadow-lg cursor-pointer group"
              onclick={() => toggleBackgroundInstallation(background)}
              onkeydown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  toggleBackgroundInstallation(background);
                }
              }}
              role="button"
              tabindex="0"
            >
              {#if background.type === 'image'}
                <img src={background.lowResUrl} alt={background.name} class="object-cover w-full h-48 transition-all duration-300 group-hover:scale-105" />
              {:else}
                <video src={background.lowResUrl} class="object-cover w-full h-48" muted loop autoplay></video>
              {/if}
              <div class={`flex absolute inset-0 justify-center items-center opacity-0 transition-opacity duration-300 bg-black/50 group-hover:opacity-100 ${installingBackgrounds.has(background.id) ? 'opacity-100' : ''}`}>
                {#if installingBackgrounds.has(background.id)}
                  <Spinner />
                {:else if savedBackgrounds.includes(background.id)}
                  <span class="flex items-center text-white">
                    <span class="mr-2 text-2xl not-italic font-IconFamily" aria-hidden="true">&#xed2c;</span>
                    <span class="text-sm font-semibold">Remove</span>
                  </span>
                {:else}
                  <span class="flex items-center text-white">
                    <span class="mr-2 text-2xl not-italic font-IconFamily" aria-hidden="true">&#xea9a;</span>
                    <span class="text-sm font-semibold">Install</span>
                  </span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

{#if settingsState.devMode}
  <div class="p-4 mt-8 rounded bg-zinc-100 dark:bg-zinc-800">
    <h3 class="mb-2 font-bold">Debug Info:</h3>
    <p>{debugInfo}</p>
    <p>Total backgrounds: {backgrounds.length}</p>
    <p>Categories: {categories.join(', ') || '<empty>'}</p>
    <p>Active Tab: {activeTab}</p>
    <p>Selected Category: {selectedCategory}</p>
  </div>
{/if}

