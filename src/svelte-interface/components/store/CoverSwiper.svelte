<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import type { Theme } from '@/svelte-interface/types/Theme';
  import { register, type SwiperContainer } from 'swiper/element/bundle';

  let { coverThemes } = $props<{ coverThemes: Theme[] }>();
  let swiperEl = $state<SwiperContainer | undefined>();
  

  const slidePrev = () => swiperEl?.swiper.slidePrev();
  const slideNext = () => swiperEl?.swiper.slideNext();

  onMount(() => {
    register();
  });
</script>

{#if coverThemes.length > 0}
  <div class="relative w-full transition-opacity rounded-xl overflow-clip" transition:fade>
    <swiper-container bind:this={swiperEl} slides-per-view="1" space-between="20" loop="true" autoplay="true" disable-on-interaction="false" pause-on-mouse-enter="true" class="w-full aspect-[8/3]">
      {#each coverThemes as theme, index (index)}
        <swiper-slide class="relative cursor-pointer rounded-xl overflow-clip">
          <img src={theme.marqueeImage} alt="Theme Preview" class="object-cover w-full h-full" />
          <div class='absolute bottom-0 left-0 p-8 z-[1]'>
            <h2 class='text-4xl font-bold text-white'>{theme.name}</h2>
            <p class='text-lg text-white'>{theme.description}</p>
          </div>
          <div class='absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/80 to-transparent'></div>
        </swiper-slide>
      {/each}
    </swiper-container>

    <!-- Pagination buttons -->
    <div class='absolute z-10 flex gap-2 bottom-2 right-2'>
      <button onclick={slidePrev} class='flex items-center justify-center w-8 h-8 text-white bg-black bg-opacity-50 rounded-full dark:bg-zinc-800 dark:bg-opacity-50'>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 19.5-7.5-7.5 7.5-7.5" />
        </svg>
      </button>
      <button onclick={slideNext} class='flex items-center justify-center w-8 h-8 text-white bg-black bg-opacity-50 rounded-full dark:bg-zinc-800 dark:bg-opacity-50'>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  </div>
{/if}
