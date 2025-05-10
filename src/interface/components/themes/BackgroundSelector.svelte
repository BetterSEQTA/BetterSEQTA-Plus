```html
<script lang="ts">
  // Import necessary functions and components from hooks and libraries
  import { hasEnoughStorageSpace, isIndexedDBSupported, writeData, openDatabase, readAllData, deleteData } from '@/interface/hooks/BackgroundDataLoader'
  import BackgroundUploader from './BackgroundUploader.svelte';
  import BackgroundItem from './BackgroundItem.svelte'
  import { onMount, onDestroy } from 'svelte'
  import { loadBackground } from '@/seqta/ui/ImageBackgrounds'
  import { delay } from 'lodash'
  import { backgroundUpdates } from '@/interface/hooks/BackgroundUpdates'

  // Destructure props with types and define initial state for component variables
  let { isEditMode, selectNoBackground = $bindable(), selectedBackground = $bindable() } = $props<{ isEditMode: boolean, selectNoBackground: () => void, selectedBackground: string | null }>();
  let backgrounds = $state<{ id: string; type: string; blob: Blob | null; url?: string }[]>([]);  // Store background data
  let error = $state<string | null>(null);  // Store error messages

  // Derived states for image and video backgrounds based on the type
  let imageBackgrounds = $derived(backgrounds.filter(bg => bg.type === 'image'));
  let videoBackgrounds = $derived(backgrounds.filter(bg => bg.type === 'video'));

  let isVisible = $state(false);  // Control visibility of background list
  let element: HTMLElement;  // Reference to the component's root element
  let observer: MutationObserver;  // Observer for detecting tab class changes
  let parentElement: HTMLElement | null = null;  // Reference to the parent tab element

  // Function to get the currently selected theme from localStorage
  async function getTheme() {
    return localStorage.getItem('selectedBackground');
  }

  // Function to set the selected theme in localStorage
  async function setTheme(theme: string) {
    localStorage.setItem('selectedBackground', theme);
  }

  // Handle file changes for uploading new background images or videos
  async function handleFileChange(file: File): Promise<void> {
    if (!file) return;

    try {
      if (!isIndexedDBSupported()) {
        throw new Error("Your browser doesn't support IndexedDB. Unable to save backgrounds.");
      }

      const hasSpace = await hasEnoughStorageSpace(file.size);  // Check if there is enough storage space
      if (!hasSpace) {
        throw new Error("Not enough storage space to save this background.");
      }

      const fileId = `${Date.now()}-${file.name}`;  // Generate a unique ID for the file
      const fileType = file.type.split('/')[0];  // Determine the file type (image or video)
      const blob = new Blob([file], { type: file.type });  // Create a Blob from the file

      await writeData(fileId, fileType, blob);  // Write the data to IndexedDB
      backgrounds = [...backgrounds, { id: fileId, type: fileType, blob, url: URL.createObjectURL(blob) }];  // Add the background to the list
    } catch (e) {
      if (e instanceof Error) {
        error = e.message;  // Set error message if an error occurs
      } else {
        error = 'An unknown error occurred';
      }
    }
  }

  // Load background metadata from IndexedDB
  async function loadBackgroundMetadata(): Promise<void> {
    try {
      error = null;

      if (!isIndexedDBSupported()) {
        throw new Error("Your browser doesn't support IndexedDB. Unable to load backgrounds.");
      }

      await openDatabase();  // Open the IndexedDB
      const data = await readAllData();  // Read all data from IndexedDB
      selectedBackground = await getTheme();  // Get the selected background from localStorage
      
      // Only load metadata (id and type) for placeholders
      backgrounds = data.map(({ id, type }) => ({ id, type, blob: null }));
    } catch (e) {
      if (e instanceof Error) {
        error = e.message;  // Set error message if an error occurs
      } else {
        error = 'An unknown error occurred';
      }
    }
  }

  // Synchronize backgrounds by fetching the latest data from IndexedDB
  async function syncBackgrounds(): Promise<void> {
    try {
      error = null;

      if (!isIndexedDBSupported()) {
        throw new Error("Your browser doesn't support IndexedDB. Unable to load backgrounds.");
      }

      const dbData = await readAllData();  // Read all data from IndexedDB
      
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
        selectNoBackground();  // Deselect the background if it doesn't exist anymore
      }
    } catch (e) {
      if (e instanceof Error) {
        error = e.message;  // Set error message if an error occurs
      } else {
        error = 'An unknown error occurred';
      }
    }
  }

  // Function to select or deselect a background
  function selectBackground(fileId: string): void {
    if (selectedBackground === fileId) {
      selectNoBackground();  // Deselect the background if it's already selected
      return;
    }
    
    selectedBackground = fileId;  // Select the new background
    setTheme(fileId);  // Update the selected background in localStorage
  }

  // Function to delete a background
  async function deleteBackground(fileId: string): Promise<void> {
    try {
      await deleteData(fileId);  // Delete the background data from IndexedDB
      backgrounds = backgrounds.filter(bg => bg.id !== fileId);  // Remove from the backgrounds list

      if (selectedBackground === fileId) {
        selectNoBackground();  // Deselect if the deleted background was selected
      }
    } catch (e) {
      if (e instanceof Error) {
        error = `Failed to delete background: ${e.message}`;  // Set error message if an error occurs
      } else {
        error = 'An unknown error occurred';
      }
    }
  }

  // Function to deselect any selected background
  selectNoBackground = () => {
    selectedBackground = null;  // Clear the selected background
    setTheme('');  // Remove the selected background from localStorage
  }

  // Effect to load the background and update the selected background on mount
  $effect(() => {
    loadBackground();
    selectedBackground
  });

  // Effect to log the error if any occurs
  $effect(() => {
    if (error) {
      console.error(error);  // Log the error to the console
    }
  });

  // Check if the parent tab is active and sync backgrounds if necessary
  function checkActiveClass() {
    if (parentElement?.classList.contains('active')) {
      delay(() => {
        isVisible = true;  // Set visibility to true
        syncBackgrounds();  // Sync the backgrounds
      }, 600);  // Delay the action by 600ms
    }
  }

  // Initialize the component on mount and set up the observer for active class changes
  onMount(() => {
    loadBackgroundMetadata();  // Load background metadata from IndexedDB
    backgroundUpdates.addListener(syncBackgrounds);  // Listen for background updates
    
    parentElement = element.closest('.tab');  // Find the parent tab element
    if (parentElement) {
      observer = new MutationObserver(checkActiveClass);  // Set up an observer for class changes
      observer.observe(parentElement, { attributes: true, attributeFilter: ['class'] });  // Observe class changes

      return () => {
        observer.disconnect();  // Clean up the observer on destroy
        backgroundUpdates.removeListener(syncBackgrounds);  // Remove the listener on destroy
      };
    }
  });

  // Clean up the observer on component destroy
  onDestroy(() => {
    if (observer) {
      observer.disconnect();  // Disconnect the observer
    }
  });
</script>

<!-- Backgrounds section rendering -->
<div bind:this={element} class="relative px-1 { !( isEditMode && imageBackgrounds.length === 0 && videoBackgrounds.length === 0 ) && 'pt-2' }">
  <!-- Render background images if there are any -->
  {#if !(imageBackgrounds.length === 0 && isEditMode)}
    <h2 class="pb-2 text-lg font-bold">Background Images</h2>
    <div class="flex flex-wrap gap-4 mb-4">
      {#if !isEditMode}
        <BackgroundUploader on:fileChange={e => handleFileChange(e.detail)} />  <!-- Render file uploader when not in edit mode -->
      {/if}
      {#each imageBackgrounds as bg (bg.id)}
        {#if isVisible && bg.blob}
          <BackgroundItem
            bg={bg}
            isSelected={selectedBackground === bg.id}  <!-- Highlight selected background -->
            isEditMode={isEditMode}
            onClick={() => selectBackground(bg.id)}  <!-- Select background on click -->
            onDelete={() => deleteBackground(bg.id)}  <!-- Delete background on click -->
          />
        {:else}
          <div class="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse"></div>  <!-- Loading state -->
        {/if}
      {/each}
    </div>
  {/if}

  <!-- Render background videos if there are any -->
  {#if !(videoBackgrounds.length === 0 && isEditMode)}
    <h2 class="py-2 text-lg font-bold">Background Videos</h2>
    <div class="flex flex-wrap gap-4">
      {#if !isEditMode}
        <BackgroundUploader on:fileChange={e => handleFileChange(e.detail)} />  <!-- Render file uploader when not in edit mode -->
      {/if}
      {#each videoBackgrounds as bg (bg.id)}
        {#if isVisible && bg.blob}
          <BackgroundItem
            bg={bg}
            isSelected={selectedBackground === bg.id}  <!-- Highlight selected background -->
            isEditMode={isEditMode}
            onClick={() => selectBackground(bg.id)}  <!-- Select background on click -->
            onDelete={() => deleteBackground(bg.id)}  <!-- Delete background on click -->
          />
        {:else}
          <div class="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse"></div>  <!-- Loading state -->
        {/if}
      {/each
```
