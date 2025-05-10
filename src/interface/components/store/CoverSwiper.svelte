```typescript
<script lang="ts">
  // Importing necessary modules and components
  import { fade } from 'svelte/transition'; // Import fade transition for smooth visibility changes
  import type { Theme } from '@/interface/types/Theme'; // Import type definition for Theme
  import emblaCarouselSvelte from 'embla-carousel-svelte'; // Import the embla carousel component
  import Autoplay from 'embla-carousel-autoplay'; // Import the autoplay plugin for embla carousel

  // Declaring props passed to this component
  let { coverThemes, setDisplayTheme } = $props<{ coverThemes: Theme[], setDisplayTheme: (theme: Theme) => void }>();
  
  // Initializing embla carousel API
  let emblaApi = $state();

  // Carousel options and plugins configuration
  const options = { loop: true }; // Enable loop for the carousel
  const plugins = [
    Autoplay({
      delay: 5000, // Set autoplay delay to 5000ms
      stopOnInteraction: false, // Disable stop on interaction
      stopOnMouseEnter: true // Stop autoplay when the mouse enters the carousel area
    })
  ];

  // Initialize the embla API when the carousel is set up
  function onInit(event: CustomEvent) {
    emblaApi = event.detail; // Capture the embla API instance
  }

  // Functions for navigating the carousel
  // @ts-ignore: Ignore TypeScript error since emblaApi might be undefined initially
  const slidePrev = () => emblaApi?.scrollPrev(); // Scroll to the previous slide in the carousel
  // @ts-ignore: Ignore TypeScript error since emblaApi might be undefined initially
  const slideNext = () => emblaApi?.scrollNext(); // Scroll to the next slide in the carousel
</script>

{#if coverThemes.length > 0} <!-- Only render carousel if coverThemes array is not empty -->
  <div class="relative w-full overflow-clip rounded-xl transition-opacity" transition:fade>
    <!-- Carousel container with fade transition -->
    <div 
      class="w-full aspect-8/3" 
      use:emblaCarouselSvelte={{ options, plugins }} 
      onemblaInit={onInit} <!-- Initialize embla API when the carousel is set up -->
    >
      <div class="flex">
        {#each coverThemes as theme} <!-- Loop through the coverThemes array and display each theme -->
          <div
            class="relative flex-[0_0_100%] cursor-pointer rounded-xl overflow-clip"
            role="button" <!-- Accessibility: define the element as a clickable button -->
            tabindex="0" <!-- Make the element focusable for keyboard navigation -->
            onkeydown={(e) => { if (e.key === 'Enter') setDisplayTheme(theme) }} <!-- Set theme on Enter key press -->
            onclick={() => setDisplayTheme(theme)} <!-- Set theme on click -->
          >
            <img src={theme.marqueeImage} alt="Theme Preview" class="object-cover w-full h-full" /> <!-- Display theme image -->
            <div class='absolute bottom-0 left-0 p-8 z-[1]'>
              <h2 class='text-4xl font-bold text-white'>{theme.name}</h2> <!-- Display theme name -->
              <p class='text-lg text-white'>{theme.description}</p> <!-- Display theme description -->
            </div>
            <div class='absolute bottom-0 left-0 w-full h-1/2 to-transparent bg-linear-to-t from-black/80'></div> <!-- Gradient overlay for readability -->
          </div>
        {/each}
      </div>
    </div>

    <!-- Navigation buttons for carousel -->
    <div class='flex absolute right-2 bottom-2 z-10 gap-2'>
      <!-- Previous button -->
      <button aria-label="Previous" onclick={slidePrev} class='flex justify-center items-center w-8 h-8 text-white rounded-full bg-black/50 dark:bg-zinc-800'>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 19.5-7.5-7.5 7.5-7.5" />
        </svg>
      </button>
      <!-- Next button -->
      <button aria-label="Next" onclick={slideNext} class='flex justify-center items-center w-8 h-8 text-white rounded-full bg-black/50 dark:bg-zinc-800'>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  </div>
{/if}
```
