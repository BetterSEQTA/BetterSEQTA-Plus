<script lang="ts">
  // Import types for CustomTheme and ThemeList, and other necessary functions
  import type { CustomTheme, ThemeList } from '@/types/CustomThemes'
  import { onDestroy, onMount } from 'svelte'
  import { OpenThemeCreator } from '@/plugins/built-in/themes/ThemeCreator'
  import { OpenStorePage } from '@/seqta/ui/renderStore'
  import { themeUpdates } from '@/interface/hooks/ThemeUpdates'
  import { closeExtensionPopup } from '@/seqta/utils/Closers/closeExtensionPopup'
  import { ThemeManager } from '@/plugins/built-in/themes/theme-manager'

  // Get the singleton instance of ThemeManager
  const themeManager = ThemeManager.getInstance();

  // Initialize reactive variables for themes, edit mode, drag state, and temporary theme data
  let themes = $state<ThemeList | null>(null);
  let { isEditMode } = $props<{ isEditMode: boolean }>();
  let isDragging = $state(false);
  let tempTheme = $state(null);

  // Handle theme click to set or disable theme based on selected state
  const handleThemeClick = async (theme: CustomTheme) => {
    if (isEditMode) return;
    if (theme.id === themes?.selectedTheme) {
      await themeManager.disableTheme();
      themes.selectedTheme = '';
    } else {
      await themeManager.setTheme(theme.id);
      if (!themes) return;
      themes.selectedTheme = theme.id;
    }
  }

  // Handle theme deletion by ID and update themes list
  const handleThemeDelete = async (themeId: string) => {
    try {
      await themeManager.deleteTheme(themeId);
      if (!themes) return;

      // Remove deleted theme from the list and disable it if it's selected
      themes.themes = themes.themes.filter(theme => theme.id !== themeId);
      if (themeId === themes.selectedTheme) {
        themes.selectedTheme = '';
        await themeManager.disableTheme();
      }
    } catch (error) {
      console.error('Error deleting theme:', error);
    }
  }

  // Handle theme sharing by ID
  const handleShareTheme = async (theme: CustomTheme) => {
    try {
      await themeManager.shareTheme(theme.id);
    } catch (error) {
      console.error('Error sharing theme:', error);
    }
  }

  // Handle drag over event to indicate drag is happening
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    isDragging = true;
  }

  // Handle drag leave event to reset dragging state
  const handleDragLeave = () => {
    isDragging = false;
  }

  // Handle drop event to process dropped theme file
  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    isDragging = false;
    const file = e.dataTransfer?.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      try {
        const result = JSON.parse(event.target?.result as string);
        tempTheme = result;
        await themeManager.installTheme(result);
        await fetchThemes();
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file. Please upload a valid JSON theme file.');
      }
      tempTheme = null;
    };
    reader.readAsText(file);
  }

  // Fetch available themes and selected theme from ThemeManager
  const fetchThemes = async () => {
    themes = {
      themes: await themeManager.getAvailableThemes(),
      selectedTheme: themeManager.getSelectedThemeId() || '',
    }
  }

  // On component mount, fetch themes and add listener for theme updates
  onMount(async () => {
    await fetchThemes();
    themeUpdates.addListener(fetchThemes);
  })

  // On component destroy, remove listener for theme updates
  onDestroy(() => {
    themeUpdates.removeListener(fetchThemes);
  })
</script>

<div
  class="pt-5 mb-1 w-full"
  role="list"
  tabindex="-1"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <!-- Display the drag and drop area when dragging files over it -->
  <div class="{isDragging ? 'opacity-100' : 'opacity-0'} transition pointer-events-none absolute w-full p-2 z-50">
    <div class="sticky top-5 w-full h-64 bg-white rounded-xl shadow-xl dark:bg-zinc-900 dark:text-white outline-dashed outline-4 outline-zinc-200 dark:outline-zinc-700">
      <div class="flex justify-center items-center h-full">
        <div class="flex flex-col justify-center items-center">
          <!-- Import icon and label for theme import -->
          <svg height="48" width="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor">
              <path d="M44,31a1,1,0,0,0-1,1v8a3,3,0,0,1-3,3H8a3,3,0,0,1-3-3V32a1,1,0,0,0-2,0v8a5.006,5.006,0,0,0,5,5H40a5.006,5.006,0,0,0,5-5V32A1,1,0,0,0,44,31Z" fill="currentColor"/>
              <path d="M23.2,33.6a1,1,0,0,0,1.6,0l9-12A1,1,0,0,0,33,20H26V5a2,2,0,0,0-4,0V20H15a1,1,0,0,0-.8,1.6Z" fill="currentColor"/>
            </g>
          </svg>
          <span class="text-lg">Import Theme</span>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Display list of themes -->
  <h2 class="pb-2 text-lg font-bold">Themes</h2>
  <div class="flex flex-col gap-2 px-2">
    {#if themes}
      {#each themes.themes as theme (theme.id)}
        <!-- Button for each theme, with edit mode and selection indicators -->
        <button
          class="relative group w-full aspect-theme flex justify-center items-center rounded-xl transition ring dark:ring-white ring-zinc-300 {theme.id === themes.selectedTheme ? 'dark:ring-2 ring-4' : 'ring-0'}"
          onclick={() => handleThemeClick(theme)}
        >
          <!-- Edit mode button to delete theme -->
          {#if isEditMode}
            <div
              class="flex absolute top-2 right-2 z-20 place-items-center p-2 w-6 h-6 text-white bg-red-600 rounded-full opacity-100"
              onclick={(event) => { event.stopPropagation(); handleThemeDelete(theme.id) }}
              onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') handleThemeDelete(theme.id) }}
              role="button"
              tabindex="-1"
            >
              <div class="w-4 h-0.5 bg-white"></div>
            </div>
          {/if}

          <!-- Button to open theme editor (non-edit mode) -->
          {#if !isEditMode}
            <div
              class="absolute z-20 flex w-8 h-8 p-2 text-white transition-all rounded-full delay-[20ms] opacity-0 top-1/4 right-2 bg-black/50 place-items-center group-hover:opacity-100 group-hover:top-1/2 -translate-y-1/2"
              onclick={(event) => { event.stopPropagation(); OpenThemeCreator(theme.id); closeExtensionPopup() }}
              onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') OpenThemeCreator(theme.id); closeExtensionPopup() }}
              role="button"
              tabindex="-1"
            >
              <span class="text-lg font-IconFamily">&#xeaa5;</span>
            </div>

            <!-- Button to share theme (non-edit mode) -->
            <div
              class="flex absolute right-12 top-1/4 z-20 place-items-center p-2 w-8 h-8 text-center rounded-full opacity-0 transition-all -translate-y-1/2 text-white/80 bg-black/50 group-hover:opacity-100 group-hover:top-1/2"
              onclick={(event) => { event.stopPropagation(); handleShareTheme(theme) }}
              onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') handleShareTheme(theme) }}
              role="button"
              tabindex="-1"
            >
              <span class="text-lg font-IconFamily">&#xecb3;</span>
            </div>
          {/if}

          <!-- Theme cover image and name -->
          <div class="relative top-0 z-10 flex justify-center w-full h-full overflow-hidden transition dark:text-white rounded-xl group place-items-center bg-zinc-100 dark:bg-zinc-900 { isEditMode ? 'animate-shake brightness-90' : ''}">
            {#if theme.coverImage}
              <img
                src={typeof theme.coverImage === 'string' ? theme.coverImage : URL.createObjectURL(theme.coverImage)}
                alt={theme.name}
                class="object-cover absolute inset-0 z-0 w-full h-full pointer-events-none"
              />
            {/if}
            {#if !theme.hideThemeName}
              <div class="z-10 {theme.coverImage ? 'text-white' : ''}">{theme.name}</div>
            {/if}
          </div>
        </button>
      {/each}
    {/if}

    <!-- Loading state for temporary theme installation -->
    {#if tempTheme}
      <div class="flex justify-center place-items-center w-full bg-gray-200 rounded-xl animate-pulse dark:bg-zinc-700/50 aspect-theme">
        <svg class="w-5 h-5 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    {/if}

    <!-- Divider between theme list and buttons -->
    {#if themes && themes.themes.length > 0}
      <div id="divider" class="w-full h-[1px] my-2 bg-zinc-100 dark:bg-zinc-600"></div>
    {/if}

    <!-- Button to open theme store -->
    <button
      onclick={() => OpenStorePage()}
      class="flex justify-center items-center w-full rounded-xl transition aspect-theme bg-zinc-100 dark:bg-zinc-900 dark:text-white"
    >
      <span class="text-xl font-IconFamily">&#xecc5;</span>
      <span class="ml-2">Theme Store</span>
    </button>

    <!-- Button to create a custom theme -->
    <button
      onclick={() => { OpenThemeCreator(); closeExtensionPopup() }}
      class="flex justify-center items-center w-full rounded-xl transition aspect-theme bg-zinc-100 dark:bg-zinc-900 dark:text-white"
    >
      <span class="text-xl font-IconFamily">&#xec60;</span>
      <span class="ml-2">Create your own</span>
    </button>
  </div>
</div>
