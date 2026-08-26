<script lang="ts">
  import type { CustomTheme, ThemeList } from '@/types/CustomThemes'
  import { onDestroy, onMount } from 'svelte'
  import browser from 'webextension-polyfill'
  import { themeUpdates } from '@/interface/hooks/ThemeUpdates'
  import { ThemeManager } from '@/plugins/built-in/themes/theme-manager'
  import { cloudAuth } from '@/seqta/utils/CloudAuth'
  import SignInToFavoriteModal from '@/interface/components/SignInToFavoriteModal.svelte'
  import ThemeBlobImage from '@/interface/components/themes/ThemeBlobImage.svelte'
  import { filterThemesByMode, isLocalCustomTheme, type ThemeListMode } from '@/interface/utils/themeListFilters'
  import { closeExtensionPopup, SettingsClicked } from '@/seqta/utils/Closers/closeExtensionPopup'

  const themeManager = ThemeManager.getInstance();

  let themes = $state<ThemeList | null>(null);
  let { isEditMode, showNavigation = true, listMode = 'all' } = $props<{
    isEditMode: boolean;
    showNavigation?: boolean;
    listMode?: ThemeListMode;
  }>();
  let isDragging = $state(false);
  let dragDepth = $state(0);
  let tempTheme = $state(null);
  let fileInput = $state<HTMLInputElement | null>(null);
  let favoriteStatus = $state<Record<string, boolean>>({});
  let cloudLoggedIn = $state(cloudAuth.state.isLoggedIn);
  let prevLoggedIn = $state(false);
  let showSignInModal = $state(false);

  $effect(() => {
    const unsub = cloudAuth.subscribe((s) => {
      const now = s.isLoggedIn;
      if (now && !prevLoggedIn && themes) void fetchThemes();
      prevLoggedIn = now;
      cloudLoggedIn = now;
    });
    return unsub;
  });

  const handleThemeClick = async (theme: CustomTheme, e: MouseEvent) => {
    if (isEditMode) return;
    if (theme.id === themes?.selectedTheme) {
      themeManager.setTransitionPoint(e.clientX, e.clientY);
      await themeManager.disableTheme();
      themes.selectedTheme = '';
    } else {
      themeManager.setTransitionPoint(e.clientX, e.clientY);
      await themeManager.setTheme(theme.id);
      if (!themes) return;
      themes.selectedTheme = theme.id;
    }
  }

  const handleThemeDelete = async (themeId: string) => {
    try {
      await themeManager.deleteTheme(themeId);
      if (!themes) return;

      themes.themes = themes.themes.filter(theme => theme.id !== themeId);
      if (themeId === themes.selectedTheme) {
        themes.selectedTheme = '';
        await themeManager.disableTheme();
      }
    } catch (error) {
      console.error('Error deleting theme:', error);
    }
  }

  const handleShareTheme = async (theme: CustomTheme) => {
    try {
      await themeManager.shareTheme(theme.id);
    } catch (error) {
      console.error('Error sharing theme:', error);
    }
  }

  const allowsFileImport = $derived(listMode === 'custom');

  const handleDragEnter = (e: DragEvent) => {
    if (!allowsFileImport) return;
    e.preventDefault();
    dragDepth += 1;
    isDragging = true;
  }

  const handleDragOver = (e: DragEvent) => {
    if (!allowsFileImport) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    isDragging = true;
  }

  const handleDragLeave = (e: DragEvent) => {
    if (!allowsFileImport) return;
    e.preventDefault();
    dragDepth -= 1;
    if (dragDepth <= 0) {
      dragDepth = 0;
      isDragging = false;
    }
  }

  async function importThemeFromFile(file: File) {
    const reader = new FileReader();
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      try {
        const result = JSON.parse(event.target?.result as string);
        tempTheme = result;
        await themeManager.installTheme(result, { fromStore: false });
        await fetchThemes();
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file. Please upload a valid JSON theme file.');
      }
      tempTheme = null;
    };
    reader.readAsText(file);
  }

  const handleDrop = async (e: DragEvent) => {
    if (!allowsFileImport) return;
    e.preventDefault();
    dragDepth = 0;
    isDragging = false;
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    await importThemeFromFile(file);
  }

  const handleFileInputChange = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) await importThemeFromFile(file);
    input.value = '';
  }

  const triggerFileUpload = () => {
    fileInput?.click();
  }

  const fetchThemes = async () => {
    themes = {
      themes: await themeManager.getAvailableThemes(),
      selectedTheme: themeManager.getSelectedThemeId() || '',
    }
    if (themes && cloudLoggedIn) {
      const status: Record<string, boolean> = {};
      await Promise.all(
        themes.themes.map(async (t) => {
          try {
            const res = (await browser.runtime.sendMessage({
              type: 'fetchThemeDetails',
              themeId: t.id,
            })) as { success?: boolean; data?: { theme?: { is_favorited?: boolean } } };
              if (res?.success && res?.data?.theme) {
                status[t.id] = !!res.data.theme.is_favorited;
              }
            } catch {
              // Theme may not exist on store (e.g. locally created)
            }
          })
        );
        favoriteStatus = status;
    } else {
      favoriteStatus = {};
    }
  }

  const openStorePage = async () => {
    const { OpenStorePage } = await import('@/seqta/ui/renderStore')
    await OpenStorePage()
  }

  const openThemeCreator = async (themeId?: string) => {
    const { OpenThemeCreator } = await import('@/plugins/built-in/themes/ThemeCreator')
    OpenThemeCreator(themeId)
    if (!SettingsClicked) closeExtensionPopup()
  }

  const openCommunitySubmit = async () => {
    if (SettingsClicked) {
      const [{ requestSettingsDestination }, { requestOpenCommunityThemeSubmit }] =
        await Promise.all([
          import('@/seqta/utils/settingsNavigation'),
          import('@/seqta/utils/openCommunityThemeSubmit'),
        ])
      requestOpenCommunityThemeSubmit()
      requestSettingsDestination({ page: 'themes', view: 'community' })
      return
    }

    const { openCommunityThemeSubmit } = await import('@/seqta/utils/openCommunityThemeSubmit')
    await openCommunityThemeSubmit()
    closeExtensionPopup()
  }

  const customThemeActionClass =
    'flex h-12 items-center justify-center gap-2 w-full rounded-xl transition bg-zinc-100 text-xl dark:bg-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'

  const customThemeActionCompactClass = customThemeActionClass

  const handleToggleFavorite = async (theme: CustomTheme, e: MouseEvent) => {
    e.stopPropagation();
    if (!cloudLoggedIn) {
      showSignInModal = true;
      return;
    }
    const isFavorite = !favoriteStatus[theme.id];
    const result = (await browser.runtime.sendMessage({
      type: 'cloudFavorite',
      themeId: theme.id,
      action: isFavorite ? 'favorite' : 'unfavorite',
    })) as { success?: boolean };
    if (result?.success) {
      favoriteStatus = { ...favoriteStatus, [theme.id]: isFavorite };
    }
  }

  onMount(async () => {
    await fetchThemes();
    themeUpdates.addListener(fetchThemes);
  })

  onDestroy(() => {
    themeUpdates.removeListener(fetchThemes);
  })

  const visibleThemes = $derived(
    themes ? filterThemesByMode(themes.themes, listMode) : [],
  );

  const useTwoColumnLayout = $derived(listMode === 'downloaded' || listMode === 'custom');
</script>

<div
  class="relative mb-1 w-full {useTwoColumnLayout ? '' : 'max-w-lg mx-auto'}"
  role="list"
  tabindex="-1"
  ondragenter={handleDragEnter}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  {#if allowsFileImport}
    <input
      bind:this={fileInput}
      type="file"
      accept=".json,application/json"
      class="hidden"
      onchange={(e) => void handleFileInputChange(e)}
    />
  {/if}

  {#if allowsFileImport && isDragging}
    <div class="absolute inset-0 z-50 flex items-center justify-center p-3 pointer-events-none">
      <div class="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border-4 border-dashed border-zinc-300 bg-white/95 px-6 text-center shadow-xl dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-white">
        <svg height="48" width="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g fill="currentColor">
            <path d="M44,31a1,1,0,0,0-1,1v8a3,3,0,0,1-3,3H8a3,3,0,0,1-3-3V32a1,1,0,0,0-2,0v8a5.006,5.006,0,0,0,5,5H40a5.006,5.006,0,0,0,5-5V32A1,1,0,0,0,44,31Z" fill="currentColor"/>
            <path d="M23.2,33.6a1,1,0,0,0,1.6,0l9-12A1,1,0,0,0,33,20H26V5a2,2,0,0,0-4,0V20H15a1,1,0,0,0-.8,1.6Z" fill="currentColor"/>
          </g>
        </svg>
        <span class="text-lg font-medium">Drop theme file to import</span>
      </div>
    </div>
  {/if}

  <div class="{useTwoColumnLayout ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-2 px-2'}">
    {#if allowsFileImport}
      <button
        type="button"
        onclick={triggerFileUpload}
        class="flex aspect-[10/1] w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 text-center transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900/40 dark:hover:border-zinc-500 dark:hover:bg-zinc-900 {useTwoColumnLayout ? 'col-span-2' : ''}"
      >
        <span class="text-xl font-IconFamily text-zinc-500 dark:text-zinc-400" aria-hidden="true">&#xe9fc;</span>
        <div class="text-left">
          <span class="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Drag and drop theme files here</span>
          <span class="block text-xs text-zinc-500 dark:text-zinc-400">or click to upload</span>
        </div>
      </button>
    {/if}
    {#if themes}
      {#each visibleThemes as theme (theme.id)}
        <button
          class="relative group w-full aspect-theme flex justify-center items-center rounded-xl transition ring dark:ring-white ring-zinc-300 {theme.id === themes.selectedTheme ? 'dark:ring-2 ring-4' : 'ring-0'}"
          onclick={(e) => handleThemeClick(theme, e)}
        >
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

          {#if !isEditMode}
            <div class="absolute inset-y-0 right-3 z-20 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              {#if !isLocalCustomTheme(theme)}
                <div
                  class="flex h-8 w-8 place-items-center rounded-full bg-black/50 p-2 text-center {(favoriteStatus[theme.id] ?? false) ? 'text-red-400' : 'text-white/80'}"
                  onclick={(event) => handleToggleFavorite(theme, event)}
                  onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') handleToggleFavorite(theme, event as any) }}
                  role="button"
                  tabindex="-1"
                  title={cloudLoggedIn ? ((favoriteStatus[theme.id] ?? false) ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to favorite themes'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={(favoriteStatus[theme.id] ?? false) ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" class="h-5 w-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              {/if}

              <div
                class="flex h-8 w-8 place-items-center rounded-full bg-black/50 p-2 text-white/80"
                onclick={(event) => { event.stopPropagation(); handleShareTheme(theme) }}
                onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') handleShareTheme(theme) }}
                role="button"
                tabindex="-1"
                title="Export theme"
              >
                <span class="text-lg font-IconFamily">&#xecb3;</span>
              </div>

              {#if isLocalCustomTheme(theme)}
                <div
                  class="flex h-8 w-8 place-items-center rounded-full bg-black/50 p-2 text-white"
                  onclick={(event) => { event.stopPropagation(); void openThemeCreator(theme.id) }}
                  onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') void openThemeCreator(theme.id) }}
                  role="button"
                  tabindex="-1"
                  title="Edit theme"
                >
                  <span class="text-lg font-IconFamily">&#xeaa5;</span>
                </div>
              {/if}
            </div>
          {/if}

          <div class="relative top-0 z-10 flex justify-center w-full h-full overflow-hidden transition dark:text-white rounded-xl group place-items-center bg-zinc-100 dark:bg-zinc-900 { isEditMode ? 'animate-shake brightness-90' : ''}">
            {#if theme.coverImage}
              <ThemeBlobImage
                source={theme.coverImage}
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

    {#if tempTheme}
      <div class="flex justify-center place-items-center w-full bg-gray-200 rounded-xl animate-pulse dark:bg-zinc-700/50 aspect-theme {useTwoColumnLayout ? 'col-span-2' : ''}">
        <svg class="w-5 h-5 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    {/if}

    {#if themes && visibleThemes.length === 0 && !tempTheme}
      <div class="flex min-h-56 flex-col items-center justify-center px-4 py-10 text-center {useTwoColumnLayout ? 'col-span-2' : ''}">
        {#if listMode === 'custom'}
          <h3 class="text-xl font-semibold text-zinc-900 dark:text-white" style="text-wrap: balance">
            No custom themes yet
          </h3>
          <p class="mt-2 max-w-md text-base text-zinc-500 dark:text-zinc-400" style="text-wrap: pretty">
            Drag and drop a theme file above, create your own theme, or follow our guide to get started.
          </p>
        {:else if listMode === 'downloaded'}
          <h3 class="text-xl font-semibold text-zinc-900 dark:text-white" style="text-wrap: balance">
            No downloaded themes
          </h3>
          <p class="mt-2 max-w-md text-base text-zinc-500 dark:text-zinc-400" style="text-wrap: pretty">
            Browse the theme store to find and install themes.
          </p>
          <div class="mt-6 grid w-full max-w-md grid-cols-1 gap-2">
            <button
              type="button"
              onclick={() => void openStorePage()}
              class="flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-200 px-4 font-medium text-zinc-900 transition-[background-color,color,transform] duration-150 hover:bg-zinc-300 active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
            >
              <span class="font-IconFamily text-lg" aria-hidden="true">&#xecc5;</span>
              Browse the store
            </button>
          </div>
        {:else}
          <h3 class="text-xl font-semibold text-zinc-900 dark:text-white" style="text-wrap: balance">
            No themes installed
          </h3>
          <p class="mt-2 max-w-md text-base text-zinc-500 dark:text-zinc-400" style="text-wrap: pretty">
            Install a theme from the store or create one of your own.
          </p>
          <div class="mt-6 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onclick={() => void openStorePage()}
              class="flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-200 px-4 font-medium text-zinc-900 transition-[background-color,color,transform] duration-150 hover:bg-zinc-300 active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
            >
              <span class="font-IconFamily text-lg" aria-hidden="true">&#xecc5;</span>
              Install a theme
            </button>
            <button
              type="button"
              onclick={() => void openThemeCreator()}
              class="flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-200 px-4 font-medium text-zinc-900 transition-[background-color,color,transform] duration-150 hover:bg-zinc-300 active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
            >
              <span class="font-IconFamily text-lg" aria-hidden="true">&#xec60;</span>
              Create a theme
            </button>
          </div>
        {/if}
      </div>
    {/if}

    {#if themes && (listMode === 'custom' || (showNavigation && visibleThemes.length > 0) || (listMode === 'downloaded' && visibleThemes.length > 0))}
      <div id="divider" class="w-full h-[1px] my-2 bg-zinc-100 dark:bg-zinc-600 {useTwoColumnLayout ? 'col-span-2' : ''}"></div>

      {#if listMode === 'custom'}
        <div class="grid grid-cols-2 gap-2 {useTwoColumnLayout ? 'col-span-2' : ''}">
          <button
            type="button"
            onclick={() => void openThemeCreator()}
            class={customThemeActionCompactClass}
          >
            <span class="text-2xl font-IconFamily" aria-hidden="true">&#xec60;</span>
            <span>Create theme</span>
          </button>

          <a
            href="https://docs.betterseqta.org/theme-creation/"
            target="_blank"
            rel="noopener noreferrer"
            class={customThemeActionCompactClass}
          >
            <span class="text-2xl font-IconFamily" aria-hidden="true">{'\uecb3'}</span>
            <span>View docs</span>
          </a>

          <button
            type="button"
            onclick={() => void openCommunitySubmit()}
            class="{customThemeActionClass} col-span-2"
          >
            <span class="text-2xl font-IconFamily" aria-hidden="true">&#xe9fc;</span>
            <span>Submit theme</span>
          </button>
        </div>
      {:else if listMode === 'downloaded'}
        <button
          onclick={() => void openStorePage()}
          class="flex justify-center items-center w-full rounded-xl transition aspect-theme bg-zinc-100 dark:bg-zinc-900 dark:text-white {useTwoColumnLayout ? 'col-span-2' : ''}"
        >
          <span class="text-xl font-IconFamily">&#xecc5;</span>
          <span class="ml-2">Theme Store</span>
        </button>
      {:else}
        <button
          onclick={() => void openStorePage()}
          class="flex justify-center items-center w-full rounded-xl transition aspect-theme bg-zinc-100 dark:bg-zinc-900 dark:text-white"
        >
          <span class="text-xl font-IconFamily">&#xecc5;</span>
          <span class="ml-2">Theme Store</span>
        </button>

        <button
          onclick={() => void openThemeCreator()}
          class="flex justify-center items-center w-full rounded-xl transition aspect-theme bg-zinc-100 dark:bg-zinc-900 dark:text-white"
        >
          <span class="text-xl font-IconFamily">&#xec60;</span>
          <span class="ml-2">Create your own</span>
        </button>
      {/if}
    {/if}
  </div>
</div>

{#if showSignInModal}
  <SignInToFavoriteModal onClose={() => (showSignInModal = false)} />
{/if}
