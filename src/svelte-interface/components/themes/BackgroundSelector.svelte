<script lang="ts">
  import { hasEnoughStorageSpace, isIndexedDBSupported, writeData, openDatabase, readAllData, deleteData } from '@/svelte-interface/hooks/BackgroundDataLoader'
  import BackgroundUploader from './BackgroundUploader.svelte';
  import BackgroundItem from './BackgroundItem.svelte'
  import { onMount } from 'svelte'
  import { loadBackground } from '@/seqta/ui/ImageBackgrounds'
  import { delay } from 'lodash'

  let { isEditMode, selectNoBackground = $bindable(), selectedBackground = $bindable() } = $props<{ isEditMode: boolean, selectNoBackground: () => void, selectedBackground: string | null }>();
  let backgrounds = $state<{ id: string; type: string; blob: Blob; url?: string }[]>([]);
  let isLoading = $state<boolean>(false);
  let error = $state<string | null>(null);

  let imageBackgrounds = $derived(backgrounds.filter(bg => bg.type === 'image'));
  let videoBackgrounds = $derived(backgrounds.filter(bg => bg.type === 'video'));

  let isVisible = $state(false);
  let observer: IntersectionObserver;
  let element: HTMLElement;

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

  async function loadBackgrounds(): Promise<void> {
    try {
      isLoading = true;
      error = null;

      if (!isIndexedDBSupported()) {
        throw new Error("Your browser doesn't support IndexedDB. Unable to load backgrounds.");
      }

      await openDatabase();
      const data = await readAllData();
      
      if (!isVisible) {
        backgrounds = data;
        return;
      };
      backgrounds = await preloadBackgrounds(data);
    } catch (e) {
      if (e instanceof Error) {
        error = e.message;
      } else {
        error = 'An unknown error occurred';
      }
    } finally {
      isLoading = false;
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

  selectNoBackground = () => {
    selectedBackground = null;
    setTheme('');
  }

  $effect(() => {
    loadBackground();
    selectedBackground
  });

  $effect(() => {
    console.error(error);
  });

  onMount(() => {
    loadBackgrounds();
    
    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        delay(() => {
          isVisible = true;
          loadBackgrounds();
        }, 100);
        selectedBackground = getTheme();
        observer.disconnect();
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  });
</script>

<div bind:this={element} class="relative px-1 py-2">
  <h2 class="pb-2 text-lg font-bold">Background Images</h2>
  <div class="flex flex-wrap gap-4 mb-4">
    {#if !isEditMode}
      <BackgroundUploader on:fileChange={e => handleFileChange(e.detail)} />
    {/if}
    {#if isVisible}
      {#each imageBackgrounds as bg (bg.id)}
        <BackgroundItem
          bg={bg}
          isSelected={selectedBackground === bg.id}
          isEditMode={isEditMode}
          onClick={() => selectBackground(bg.id)}
          onDelete={() => deleteBackground(bg.id)}/>
      {/each}
    {:else}
      {#each imageBackgrounds as bg (bg.id)}
        <div class="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse"></div>
      {/each}
    {/if}
  </div>

  <h2 class="py-2 text-lg font-bold">Background Videos</h2>
  <div class="flex flex-wrap gap-4">
    {#if !isEditMode}
      <BackgroundUploader on:fileChange={e => handleFileChange(e.detail)} />
    {/if}
    {#if isVisible}
      {#each videoBackgrounds as bg (bg.id)}
        <BackgroundItem
          bg={bg}
          isSelected={selectedBackground === bg.id}
          isEditMode={isEditMode}
          onClick={() => selectBackground(bg.id)}
          onDelete={() => deleteBackground(bg.id)}
        />
      {/each}
    {:else}
      {#each videoBackgrounds as bg (bg.id)}
        <div class="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse"></div>
      {/each}
    {/if}
  </div>
</div>