<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { Theme } from '@/interface/types/Theme';
  import emblaCarouselSvelte from 'embla-carousel-svelte';
  import Autoplay from 'embla-carousel-autoplay';

  let { coverThemes, setDisplayTheme } = $props<{ coverThemes: Theme[], setDisplayTheme: (theme: Theme) => void }>();
  let emblaApi = $state();

  const options = { loop: true };
  const plugins = [
    Autoplay({
      delay: 5000,
      stopOnInteraction: false,
      stopOnMouseEnter: true
    })
  ];

  function onInit(event: CustomEvent) {
    emblaApi = event.detail;
  }

  // @ts-ignore
  const slidePrev = () => emblaApi?.scrollPrev();
  // @ts-ignore
  const slideNext = () => emblaApi?.scrollNext();
</script>

{#if coverThemes.length > 0}
  <div class="relative w-full overflow-clip rounded-xl transition-opacity" transition:fade>
    <div 
      class="w-full aspect-8/3" 
      use:emblaCarouselSvelte={{ options, plugins }} 
      onemblaInit={onInit}
    >
      <div class="flex">
        {#each coverThemes as theme}
          <div
            class="relative flex-[0_0_100%] cursor-pointer rounded-xl overflow-clip"
            role="button"
            tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter') setDisplayTheme(theme) }}
            onclick={() => setDisplayTheme(theme)}
          >
            <img src={theme.marqueeImage} alt="Theme Preview" class="object-cover w-full h-full" />
            <div class='absolute bottom-0 left-0 p-8 z-[1]'>
              <h2 class='text-4xl font-bold text-white'>{theme.name}</h2>
              <p class='text-lg text-white'>{theme.description}</p>
            </div>
            <div class='absolute bottom-0 left-0 w-full h-1/2 to-transparent bg-linear-to-t from-black/80'></div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Navigation buttons -->
    <div class='flex absolute right-2 bottom-2 z-10 gap-2'>
      <button aria-label="Previous" onclick={slidePrev} class='flex justify-center items-center w-8 h-8 text-white rounded-full bg-black/50 dark:bg-zinc-800'>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 19.5-7.5-7.5 7.5-7.5" />
        </svg>
      </button>
      <button aria-label="Next" onclick={slideNext} class='flex justify-center items-center w-8 h-8 text-white rounded-full bg-black/50 dark:bg-zinc-800'>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  </div>
{/if}
