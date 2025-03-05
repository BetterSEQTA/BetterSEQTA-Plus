<script lang="ts">
  import { hasEnoughStorageSpace, isIndexedDBSupported, writeData, openDatabase, readAllData, deleteData } from '@/interface/hooks/BackgroundDataLoader'
  import BackgroundUploader from './BackgroundUploader.svelte';
  import BackgroundItem from './BackgroundItem.svelte'
  import { onMount, onDestroy } from 'svelte'
  import { loadBackground } from '@/seqta/ui/ImageBackgrounds'
  import { delay } from 'lodash'
  import { backgroundUpdates } from '@/interface/hooks/BackgroundUpdates'

  let { isEditMode, selectNoBackground = $bindable(), selectedBackground = $bindable() } = $props<{ isEditMode: boolean, selectNoBackground: () => void, selectedBackground: string | null }>();
  let backgrounds = $state<{ id: string; type: string; blob: Blob | null; url?: string }[]>([]);
  let error = $state<string | null>(null);

  let imageBackgrounds = $derived(backgrounds.filter(bg => bg.type === 'image'));
  let videoBackgrounds = $derived(backgrounds.filter(bg => bg.type === 'video'));

  let isVisible = $state(false);
  let element: HTMLElement;
  let observer: MutationObserver;
  let parentElement: HTMLElement | null = null;

  async function getTheme() {
    return localStorage.getItem('selectedBackground');
  }

  async function setTheme(theme: string) {
    localStorage.setItem('selectedBackground', theme);
  }

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

  async function syncBackgrounds(): Promise<void> {
    try {
      error = null;

      if (!isIndexedDBSupported()) {
        throw new Error("Your browser doesn't support IndexedDB. Unable to load backgrounds.");
      }

      const dbData = await readAllData();
      
      // Release existing object URLs to prevent memory leaks
      backgrounds.forEach(bg => {
        if (bg.url) URL.revokeObjectURL(bg.url);
      });

      // Create fresh background objects with new object URLs
      backgrounds = dbData.map(bg => ({
        id: bg.id,
        type: bg.type,
        blob: bg.blob,
        url: URL.createObjectURL(bg.blob)
      }));

      // Check if selected background still exists
      if (selectedBackground && !backgrounds.some(bg => bg.id === selectedBackground)) {
        selectNoBackground();
      }
    } catch (e) {
      if (e instanceof Error) {
        error = e.message;
      } else {
        error = 'An unknown error occurred';
      }
    }
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

  selectNoBackground = () => {
    selectedBackground = null;
    setTheme('');
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

  function checkActiveClass() {
    if (parentElement?.classList.contains('active')) {
      delay(() => {
        isVisible = true;
        syncBackgrounds();
      }, 600);
    }
  }

  onMount(() => {
    loadBackgroundMetadata();
    backgroundUpdates.addListener(syncBackgrounds);
    
    parentElement = element.closest('.tab');
    if (parentElement) {
      observer = new MutationObserver(checkActiveClass);
      observer.observe(parentElement, { attributes: true, attributeFilter: ['class'] });

      return () => {
        observer.disconnect();
        backgroundUpdates.removeListener(syncBackgrounds);
      };
    }
  });

  onDestroy(() => {
    if (observer) {
      observer.disconnect();
    }
  });
</script>

<div bind:this={element} class="relative px-1 { !( isEditMode && imageBackgrounds.length === 0 && videoBackgrounds.length === 0 ) && 'pt-2' }">
  {#if !(imageBackgrounds.length === 0 && isEditMode)}
    <h2 class="pb-2 text-lg font-bold">Background Images</h2>
    <div class="flex flex-wrap gap-4 mb-4">
      {#if !isEditMode}
        <BackgroundUploader on:fileChange={e => handleFileChange(e.detail)} />
      {/if}
      {#each imageBackgrounds as bg (bg.id)}
        {#if isVisible && bg.blob}
          <BackgroundItem
            bg={bg}
            isSelected={selectedBackground === bg.id}
            isEditMode={isEditMode}
            onClick={() => selectBackground(bg.id)}
            onDelete={() => deleteBackground(bg.id)}/>
        {:else}
          <div class="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse"></div>
        {/if}
      {/each}
    </div>
  {/if}

  {#if !(videoBackgrounds.length === 0 && isEditMode)}
    <h2 class="py-2 text-lg font-bold">Background Videos</h2>
    <div class="flex flex-wrap gap-4">
      {#if !isEditMode}
        <BackgroundUploader on:fileChange={e => handleFileChange(e.detail)} />
      {/if}
      {#each videoBackgrounds as bg (bg.id)}
        {#if isVisible && bg.blob}
          <BackgroundItem
            bg={bg}
            isSelected={selectedBackground === bg.id}
            isEditMode={isEditMode}
            onClick={() => selectBackground(bg.id)}
            onDelete={() => deleteBackground(bg.id)}
          />
        {:else}
          <div class="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse"></div>
        {/if}
      {/each}
    </div>
  {/if}
</div>