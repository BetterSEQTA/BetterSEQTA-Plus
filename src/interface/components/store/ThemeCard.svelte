<script lang="ts">
  // Importing types and transitions
  import type { Theme } from '@/interface/types/Theme'; // Type definition for theme object

  // Props for the component: theme object and onClick function
  let { theme, onClick } = $props<{ theme: Theme; onClick: () => void }>();

  // Importing the fade transition from Svelte
  import { fade } from 'svelte/transition';
</script>

<!-- Main container for the theme card with a click event -->
<div class="w-full cursor-pointer" role="button" tabindex="-1" onkeydown={onClick} onclick={onClick}>
  <!-- Theme card container with hover effects, shadow, and transition -->
  <div class="bg-gray-50 w-full transition-all hover:scale-105 duration-500 relative group flex flex-col hover:shadow-2xl dark:hover:shadow-white/[0.1] hover:shadow-white/[0.8] dark:bg-zinc-800 dark:border-white/[0.1] h-auto rounded-xl overflow-clip border" transition:fade>
    <!-- Theme name displayed at the bottom of the card -->
    <div class="absolute bottom-1 left-3 z-10 mb-1 text-xl font-bold text-white">
      {theme.name} <!-- Display theme name -->
    </div>
    
    <!-- Dark gradient overlay on the bottom of the card -->
    <div class='absolute bottom-0 z-0 w-full h-3/4 bg-linear-to-t to-transparent from-black/80'></div>
    
    <!-- Theme preview image -->
    <div class='w-full'>
      <img src={theme.marqueeImage} alt="Theme Preview" class="object-cover w-full h-48 rounded-md" /> <!-- Display theme preview image -->
    </div>
  </div>
</div>
