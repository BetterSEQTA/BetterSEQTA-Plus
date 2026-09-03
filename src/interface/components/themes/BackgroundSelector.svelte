<script lang="ts">
  import { hasEnoughStorageSpace, isIndexedDBSupported, writeData, readAllData, deleteData } from '@/interface/hooks/BackgroundDataLoader'
  import BackgroundUploader from './BackgroundUploader.svelte';
  import BackgroundItem from './BackgroundItem.svelte'
  import { onMount, onDestroy } from 'svelte'
  import { loadBackground } from '@/seqta/ui/ImageBackgrounds'
  import { backgroundUpdates } from '@/interface/hooks/BackgroundUpdates'

  let { isEditMode, selectNoBackground = $bindable(), selectedBackground = $bindable() } = $props<{ isEditMode: boolean, selectNoBackground: () => void, selectedBackground: string | null }>();
  let backgrounds = $state<{ id: string; type: string; blob: Blob | null; url?: string }[]>([]);
  let feedback = $state<{ kind: 'error' | 'warn'; text: string } | null>(null);

  let imageBackgrounds = $derived(backgrounds.filter(bg => bg.type === 'image'));
  let videoBackgrounds = $derived(backgrounds.filter(bg => bg.type === 'video'));

  function inferBackgroundType(file: File): 'image' | 'video' {
    const mime = file.type.toLowerCase();
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('image/')) return 'image';
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    return ['mp4', 'mov', 'webm', 'm4v', 'mkv'].includes(ext) ? 'video' : 'image';
  }

  async function handleFileChange(file: File): Promise<void> {
    if (!file) return;
    feedback = null;

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

      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (['heic', 'heif'].includes(ext) || file.type.toLowerCase().includes('hei')) {
        feedback = {
          kind: 'warn',
          text: 'HEIC saved, but Chrome and Edge often cannot preview it. Export as JPEG or PNG if the thumbnail stays blank.',
        };
      }
    } catch (e) {
      feedback = {
        kind: 'error',
        text: e instanceof Error ? e.message : 'An unknown error occurred',
      };
    }
  }

  async function syncBackgrounds(): Promise<void> {
    try {
      feedback = null;

      if (!isIndexedDBSupported()) {
        throw new Error("Your browser doesn't support IndexedDB. Unable to load backgrounds.");
      }

      selectedBackground = localStorage.getItem('selectedBackground');
      const dbData = await readAllData();

      backgrounds.forEach(bg => {
        if (bg.url) URL.revokeObjectURL(bg.url);
      });

      backgrounds = dbData.map(bg => ({
        id: bg.id,
        type: bg.type,
        blob: bg.blob,
        url: URL.createObjectURL(bg.blob)
      }));

      if (selectedBackground && !backgrounds.some(bg => bg.id === selectedBackground)) {
        selectNoBackground();
      }
    } catch (e) {
      feedback = {
        kind: 'error',
        text: e instanceof Error ? e.message : 'An unknown error occurred',
      };
    }
  }

  function selectBackground(fileId: string): void {
    if (selectedBackground === fileId) {
      selectNoBackground();
      return;
    }

    selectedBackground = fileId;
    localStorage.setItem('selectedBackground', fileId);
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
      feedback = {
        kind: 'error',
        text: e instanceof Error ? e.message : 'An unknown error occurred',
      };
    }
  }

  selectNoBackground = () => {
    selectedBackground = null;
    localStorage.setItem('selectedBackground', '');
  }

  $effect(() => {
    loadBackground();
    selectedBackground
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
  {#if feedback}
    <div
      class="mx-1 mb-3 rounded-lg border px-3 py-2 text-sm {feedback.kind === 'warn'
        ? 'border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100'
        : 'border-red-300/60 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200'}"
      role={feedback.kind === 'warn' ? 'status' : 'alert'}
    >
      {feedback.text}
    </div>
  {/if}

  {#if !(imageBackgrounds.length === 0 && isEditMode)}
    <h2 class="pb-2 text-lg font-bold">Background Images</h2>
    <div class="flex flex-wrap gap-4 mb-4">
      {#if !isEditMode}
        <BackgroundUploader onFileChange={handleFileChange} />
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
