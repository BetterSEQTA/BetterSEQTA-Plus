<script lang="ts">
  import type { CustomTheme, ThemeList } from '@/types/CustomThemes'
  import { getAvailableThemes } from '@/seqta/ui/themes/getAvailableThemes'
  import { onDestroy, onMount } from 'svelte'
  import { OpenThemeCreator } from '@/seqta/ui/ThemeCreator'
  import shareTheme from '@/seqta/ui/themes/shareTheme'
  import { InstallTheme } from '@/seqta/ui/themes/downloadTheme'
  import { disableTheme } from '@/seqta/ui/themes/disableTheme'
  import { setTheme } from '@/seqta/ui/themes/setTheme'
  import { deleteTheme } from '@/seqta/ui/themes/deleteTheme'
  import { OpenStorePage } from '@/seqta/ui/renderStore'
  import { themeUpdates } from '@/svelte-interface/hooks/ThemeUpdates'
  import { closeExtensionPopup } from '@/SEQTA'

  let themes = $state<ThemeList | null>(null);
  let { isEditMode } = $props<{ isEditMode: boolean }>();
  let isDragging = $state(false);
  let tempTheme = $state(null);

  const handleThemeClick = async (theme: CustomTheme) => {
    if (isEditMode) return;
    if (theme.id === themes?.selectedTheme) {
      await disableTheme();
      themes.selectedTheme = '';
    } else {
      await setTheme(theme.id);
      if (!themes) return;
      themes.selectedTheme = theme.id;
    }
  }

  const handleThemeDelete = async (themeId: string) => {
    try {
      await deleteTheme(themeId);
      if (!themes) return;

      themes.themes = themes.themes.filter(theme => theme.id !== themeId);
      if (themeId === themes.selectedTheme) {
        themes.selectedTheme = '';
        await disableTheme();
      }
    } catch (error) {
      console.error('Error deleting theme:', error);
    }
  }

  const handleShareTheme = async (theme: CustomTheme) => {
    try {
      await shareTheme(theme.id);
    } catch (error) {
      console.error('Error sharing theme:', error);
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    isDragging = true;
  }

  const handleDragLeave = () => {
    isDragging = false;
  }

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
        await InstallTheme(result);
        await fetchThemes();
      } catch (error) {
        alert('Error parsing file. Please upload a valid JSON theme file.');
      }
      tempTheme = null;
    };
    reader.readAsText(file);
  }

  const fetchThemes = async () => {
    themes = await getAvailableThemes();
  }

  onMount(async () => {
    await fetchThemes();

    themeUpdates.addListener(fetchThemes);
  })

  onDestroy(() => {
    themeUpdates.removeListener(fetchThemes);
  })
</script>

<div
  class="w-full mt-3 mb-1"
  role="list"
  tabindex="-1"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <div class="{isDragging ? 'opacity-100' : 'opacity-0'} transition pointer-events-none absolute w-full p-2 z-50">
    <div class="sticky w-full h-64 bg-white shadow-xl dark:bg-zinc-900 top-5 dark:text-white rounded-xl outline-dashed outline-4 outline-zinc-200 dark:outline-zinc-700">
      <div class="flex items-center justify-center h-full">
        <div class="flex flex-col items-center justify-center">
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
  <h2 class="pb-2 text-lg font-bold">Themes</h2>
  <div class="flex flex-col gap-2 px-1">
    {#if themes}
      {#each themes.themes as theme (theme.id)}
        <button
          class="relative group w-full aspect-theme flex justify-center items-center rounded-xl transition ring dark:ring-white ring-zinc-300 {theme.id === themes.selectedTheme ? 'dark:ring-2 ring-4' : 'ring-0'}"
          onclick={() => handleThemeClick(theme)}
        >
          {#if isEditMode}
            <div
              class="absolute z-20 flex w-6 h-6 p-2 text-white transition-all rounded-full opacity-0 top-1 right-2 dark:bg-red-600 place-items-center group-hover:opacity-100 group-hover:top-2"
              onclick={(event) => { event.stopPropagation(); handleThemeDelete(theme.id) }}
              onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') handleThemeDelete(theme.id) }}
              role="button"
              tabindex="-1"
            >
              <div class="w-4 h-0.5 bg-white"></div>
            </div>
          {/if}

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

            <div
              class="absolute z-20 flex w-8 h-8 p-2 text-center transition-all -translate-y-1/2 rounded-full opacity-0 text-white/80 top-1/4 right-12 bg-black/50 place-items-center group-hover:opacity-100 group-hover:top-1/2"
              onclick={(event) => { event.stopPropagation(); handleShareTheme(theme) }}
              onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') handleShareTheme(theme) }}
              role="button"
              tabindex="-1"
            >
              <span class="text-lg font-IconFamily">&#xecb3;</span>
            </div>
          {/if}

          <div class="relative top-0 z-10 flex justify-center w-full h-full overflow-hidden transition dark:text-white rounded-xl group place-items-center bg-zinc-100 dark:bg-zinc-900">
            {#if theme.coverImage}
              <img
                src={typeof theme.coverImage === 'string' ? theme.coverImage : URL.createObjectURL(theme.coverImage)}
                alt={theme.name}
                class="absolute inset-0 z-0 object-cover w-full h-full pointer-events-none"
              />
            {/if}
            {#if !theme.hideThemeName}
              <div class="z-10 {theme.coverImage ? 'text-white' : ''}">{theme.name}</div>
            {/if}
          </div>
        </button>
      {/each}
    {/if}

    {#if tempTheme}
      <div class="flex justify-center w-full bg-gray-200 rounded-xl dark:bg-zinc-700/50 place-items-center aspect-theme animate-pulse">
        <svg class="w-5 h-5 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    {/if}

    {#if themes && themes.themes.length > 0}
      <div id="divider" class="w-full h-[1px] my-2 bg-zinc-100 dark:bg-zinc-600"></div>
    {/if}

    <button
      onclick={() => OpenStorePage()}
      class="flex items-center justify-center w-full transition aspect-theme rounded-xl bg-zinc-100 dark:bg-zinc-900 dark:text-white"
    >
      <span class="text-xl font-IconFamily">&#xecc5;</span>
      <span class="ml-2">Theme Store</span>
    </button>

    <button
      onclick={() => { OpenThemeCreator(); closeExtensionPopup() }}
      class="flex items-center justify-center w-full transition aspect-theme rounded-xl bg-zinc-100 dark:bg-zinc-900 dark:text-white"
    >
      <span class="text-xl font-IconFamily">&#xec60;</span>
      <span class="ml-2">Create your own</span>
    </button>
  </div>
</div>
