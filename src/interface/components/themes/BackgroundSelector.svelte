<script lang="ts">
  import { hasEnoughStorageSpace, isIndexedDBSupported, writeData, readAllData, deleteData } from '@/interface/hooks/BackgroundDataLoader'
  import BackgroundUploader from './BackgroundUploader.svelte';
  import BackgroundItem from './BackgroundItem.svelte'
  import { onMount, onDestroy } from 'svelte'
  import { loadBackground } from '@/seqta/ui/ImageBackgrounds'
  import { backgroundUpdates } from '@/interface/hooks/BackgroundUpdates'

  let { isEditMode, selectNoBackground = $bindable(), selectedBackground = $bindable() } = $props<{ isEditMode: boolean, selectNoBackground: () => void, selectedBackground: string | null }>();
  let backgrounds = $state<{ id: string; type: string; blob: Blob | null; url?: string }[]>([]);
  let error = $state<string | null>(null);
  let notice = $state<string | null>(null);
  let uploading = $state(false);

  let imageBackgrounds = $derived(backgrounds.filter(bg => bg.type === 'image'));
  let videoBackgrounds = $derived(backgrounds.filter(bg => bg.type === 'video'));

  function inferBackgroundType(file: File): 'image' | 'video' {
    const mime = file.type.toLowerCase();
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('image/')) return 'image';
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (['mp4', 'mov', 'webm', 'm4v', 'mkv'].includes(ext)) return 'video';
    return 'image';
  }

  function setError(e: unknown) {
    if (e instanceof Error) {
      error = e.message;
      return;
    }
    if (typeof e === 'string' && e) {
      error = e;
      return;
    }
    error = 'An unknown error occurred';
  }

  function isHeicFile(file: File): boolean {
    const mime = file.type.toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    return (
      mime.includes('heic') ||
      mime.includes('heif') ||
      ext === 'heic' ||
      ext === 'heif'
    );
  }

  async function handleFileChange(file: File): Promise<void> {
    if (!file) return;

    uploading = true;
    error = null;
    notice = null;

    try {
      if (!isIndexedDBSupported()) {
        throw new Error("Your browser doesn't support IndexedDB. Unable to save backgrounds.");
      }

      const hasSpace = await hasEnoughStorageSpace(file.size);
      if (!hasSpace) {
        throw new Error("Not enough storage space to save this background.");
      }

      const fileId = `${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
      const fileType = inferBackgroundType(file);
      const blob = file.slice(0, file.size, file.type || (fileType === 'video' ? 'video/mp4' : 'image/jpeg'));

      await writeData(fileId, fileType, blob);
      backgrounds = [
        ...backgrounds,
        { id: fileId, type: fileType, blob, url: URL.createObjectURL(blob) },
      ];
      backgroundUpdates.triggerUpdate();

      if (isHeicFile(file)) {
        notice =
          'HEIC saved, but Chrome and Edge often cannot preview it. Export as JPEG or PNG if the thumbnail stays blank.';
      }
    } catch (e) {
      setError(e);
    } finally {
      uploading = false;
    }
  }

  async function getTheme() {
    return localStorage.getItem('selectedBackground');
  }

  async function setTheme(theme: string) {
    localStorage.setItem('selectedBackground', theme);
  }

  async function syncBackgrounds(): Promise<void> {
    try {
      error = null;

      if (!isIndexedDBSupported()) {
        throw new Error("Your browser doesn't support IndexedDB. Unable to load backgrounds.");
      }

      selectedBackground = await getTheme();
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
      setError(e);
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
      backgroundUpdates.triggerUpdate();
    } catch (e) {
      setError(e);
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

  onMount(() => {
    syncBackgrounds();
    backgroundUpdates.addListener(syncBackgrounds);

    return () => {
      backgroundUpdates.removeListener(syncBackgrounds);
    };
  });

  onDestroy(() => {
    backgrounds.forEach((bg) => {
      if (bg.url) URL.revokeObjectURL(bg.url);
    });
  });
</script>

<div class="relative px-1 { !( isEditMode && imageBackgrounds.length === 0 && videoBackgrounds.length === 0 ) && 'pt-2' }">
  {#if notice}
    <div
      class="mx-1 mb-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
      role="status"
    >
      {notice}
    </div>
  {/if}

  {#if error}
    <div
      class="mx-1 mb-3 rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
      role="alert"
    >
      {error}
    </div>
  {/if}

  {#if !(imageBackgrounds.length === 0 && isEditMode)}
    <h2 class="pb-2 text-lg font-bold">Background Images</h2>
    <div class="flex flex-wrap gap-4 mb-4">
      {#if !isEditMode}
        <BackgroundUploader onFileChange={handleFileChange} />
        {#if uploading}
          <div class="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900">
            <div class="h-5 w-5 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent"></div>
          </div>
        {/if}
      {/if}
      {#each imageBackgrounds as bg (bg.id)}
        {#if bg.url}
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
        <BackgroundUploader onFileChange={handleFileChange} />
      {/if}
      {#each videoBackgrounds as bg (bg.id)}
        {#if bg.url}
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
