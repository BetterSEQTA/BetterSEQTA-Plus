<script lang="ts">
  // Import necessary types and functions
  import type { Theme } from '@/interface/types/Theme'
  import { fade } from 'svelte/transition';
  import { animate } from 'motion';

  // Destructure and initialize props with type definitions
  let { theme, currentThemes, setDisplayTheme, onInstall, onRemove, allThemes, displayTheme } = $props<{
    theme: Theme | null;
    currentThemes: string[];
    setDisplayTheme: (theme: Theme | null) => void;
    onInstall: (themeId: string) => void;
    onRemove: (themeId: string) => void;
    allThemes: Theme[];
    displayTheme: Theme | null;
  }>();

  // Initialize state for managing installation status and modal element
  let installing = $state(false);
  let modalElement: HTMLElement;

  // Function to get related themes excluding the current theme
  function getRelatedThemes() {
    return allThemes
      .filter((t: Theme) => t.id !== theme.id)  // Exclude the current theme
      .sort((a: Theme, b: Theme) => a.name.localeCompare(theme.name) - b.name.localeCompare(theme.name)) // Sort by name
      .slice(0, 4);  // Limit to 4 themes
  }

  // Animate the modal when the displayTheme changes
  $effect(() => {
    if (displayTheme) {
      animate(
        modalElement,
        { y: [500, 0], opacity: [0, 1] }, // Define animation for modal entry
        {
          type: 'spring',
          stiffness: 150,  // Spring stiffness for smooth animation
          damping: 20      // Damping to control animation smoothness
        }
      );
    }
  });

  // Function to hide the modal and optionally set a related theme
  const hideModal = (relatedTheme?: Theme | null) => {
    animate(
      modalElement,
      { y: [10, 500], opacity: [1, 0] }, // Define animation for modal exit
      {
        type: 'spring',
        stiffness: 150,  // Spring stiffness for smooth animation
        damping: 20      // Damping to control animation smoothness
      }
    );
    setTimeout(() => {
      setDisplayTheme(relatedTheme ?? null); // Update the display theme after the animation
    }, 100); // Delay to ensure animation completes before changing theme
  }
</script>

<!-- Modal container with overlay and interaction handling -->
<div 
  class="flex fixed inset-0 z-50 justify-center items-end bg-black/70" 
  onclick={(e) => {
    if (e.target === e.currentTarget) hideModal();  // Close modal if the overlay is clicked
  }} 
  onkeydown={(e) => {
    if (e.target === e.currentTarget) hideModal();  // Close modal if escape key is pressed
  }} 
  role="button" 
  tabindex="-1" 
  transition:fade
>
  <!-- Modal content wrapper -->
  <div
    bind:this={modalElement}
    class="w-full max-w-[600px] h-[95%] p-4 bg-white rounded-t-2xl dark:bg-zinc-800 overflow-scroll no-scrollbar cursor-auto" 
    onclick={(e) => e.stopPropagation()}  // Prevent modal from closing when clicked inside
    onkeydown={(e) => e.stopPropagation()} // Prevent modal from closing when interacting inside
  >
    <div class="relative h-auto">
      <!-- Close button in the top-right corner of the modal -->
      <button class="absolute top-0 right-0 p-2 text-xl font-bold text-gray-600 font-IconFamily dark:text-gray-200" onclick={() => hideModal()}>
        {'\ued8a'}  <!-- Unicode character for close icon -->
      </button>
      <!-- Theme name display -->
      <h2 class="mb-4 text-2xl font-bold">
        {theme.name}
      </h2>
      <!-- Theme cover image -->
      <img src={theme.marqueeImage} alt="Theme Cover" class="object-cover mb-4 w-full rounded-md" />
      <!-- Theme description -->
      <p class="mb-4 text-gray-700 dark:text-gray-300">
        {theme.description}
      </p>
      
      <!-- Conditional rendering of Install/Remove button based on theme status -->
      {#if currentThemes.includes(theme.id)}
        <!-- Button to remove the theme -->
        <button onclick={async () => {installing = true; await onRemove(theme.id); installing = false}} class="flex relative justify-center items-center px-4 py-2 mt-4 ml-auto w-32 text-black rounded-full dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200">
          {#if installing}
            <!-- Spinner icon displayed during installation/removal process -->
            <svg class="absolute w-4 h-4 { installing ? 'opacity-100' : 'opacity-0' }" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke="currentColor" fill="currentColor" class="origin-center animate-spin-fast" d="M2,12A11.2,11.2,0,0,1,13,1.05C12.67,1,12.34,1,12,1a11,11,0,0,0,0,22c.34,0,.67,0,1-.05C6,23,2,17.74,2,12Z"/>
            </svg>
          {/if}
          <span class="{ installing ? 'opacity-0' : 'opacity-100' }">Remove</span>
        </button>
      {:else}
        <!-- Button to install the theme -->
        <button onclick={async () => {installing = true; await onInstall(theme.id); installing = false}} class="flex relative justify-center items-center px-4 py-2 mt-4 ml-auto w-32 text-black rounded-full dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200">
          {#if installing}
            <!-- Spinner icon displayed during installation/removal process -->
            <svg class="absolute w-4 h-4 { installing ? 'opacity-100' : 'opacity-0' }" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke="currentColor" fill="currentColor" class="origin-center animate-spin-fast" d="M2,12A11.2,11.2,0,0,1,13,1.05C12.67,1,12.34,1,12,1a11,11,0,0,0,0,22c.34,0,.67,0,1-.05C6,23,2,17.74,2,12Z"/>
            </svg>
          {/if}
          <span class="{ installing ? 'opacity-0' : 'opacity-100' }">Install</span>
        </button>
      {/if}

      <!-- Divider between theme details and similar themes -->
      <div class="my-8 border-b border-zinc-200 dark:border-zinc-700"></div>

      <!-- Section heading for similar themes -->
      <h3 class="mb-4 text-lg font-bold">
        Similar Themes
      </h3>
      <!-- Grid to display related themes -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {#each getRelatedThemes() as relatedTheme (relatedTheme.id)}
          <!-- Button to switch to a related theme -->
          <button onclick={() => { hideModal(relatedTheme) }} class="w-full cursor-pointer">
            <div class="bg-gray-50 w-full transition-all hover:scale-105 duration-500 relative group group/card flex flex-col hover:shadow-2xl dark:hover:shadow-white/[0.1] hover:shadow-white/[0.8] dark:bg-zinc-800 dark:border-white/[0.1] h-auto rounded-xl overflow-clip border">
              <!-- Theme name overlay on image -->
              <div class="absolute bottom-1 left-3 z-10 mb-1 text-xl font-bold text-white transition-all duration-500 group-hover:-translate-y-0.5">
                {relatedTheme.name}
              </div>
              <div class="absolute bottom-0 z-0 w-full h-3/4 to-transparent from-black/80 bg-linear-to-t"></div>
              <!-- Theme preview image -->
              <img src={relatedTheme.marqueeImage} alt="Theme Preview" class="object-cover w-full h-48" />
            </div>
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>
