<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { ThemeCoverSlide } from '@/interface/types/Theme';
  import emblaCarouselSvelte from 'embla-carousel-svelte';
  import Autoplay from 'embla-carousel-autoplay';

  let { slides, setDisplayTheme } = $props<{
    slides: ThemeCoverSlide[];
    setDisplayTheme: (theme: import('@/interface/types/Theme').Theme) => void;
  }>();
  let emblaApi = $state();

  const options = { loop: true };
  const plugins = [
    Autoplay({
      delay: 5000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }),
  ];

  function onInit(event: CustomEvent) {
    emblaApi = event.detail;
  }

  // @ts-ignore
  const slidePrev = () => emblaApi?.scrollPrev();
  // @ts-ignore
  const slideNext = () => emblaApi?.scrollNext();
</script>

{#if slides.length > 0}
  <div class="relative w-full overflow-clip rounded-xl transition-opacity" transition:fade>
    <div
      class="w-full aspect-[5/1] max-h-[500px]"
      use:emblaCarouselSvelte={{ options, plugins }}
      onemblaInit={onInit}
    >
      <div class="flex">
        {#each slides as slide (slide.imageUrl + slide.title + (slide.subtitle ?? ''))}
          <div
            class="relative flex-[0_0_100%] cursor-pointer rounded-xl overflow-clip"
            role="button"
            tabindex="0"
            onkeydown={(e) => {
              if (e.key === 'Enter') setDisplayTheme(slide.openTheme);
            }}
            onclick={() => setDisplayTheme(slide.openTheme)}
          >
            <img src={slide.imageUrl} alt="" class="object-cover w-full h-full" />
            {#if slide.badgeFeatured === true}
              <div class="absolute top-4 left-4 z-[2] pointer-events-none">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100 shadow-sm"
                  aria-label="Featured theme"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5">
                    <path
                      fill-rule="evenodd"
                      d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  Featured
                </span>
              </div>
            {/if}
            <div class="absolute bottom-0 left-0 p-8 z-[1]">
              <h2 class="text-4xl font-bold text-white">{slide.title}</h2>
              {#if slide.subtitle}
                <p class="text-lg font-medium text-white/95 mt-1 line-clamp-2">{slide.subtitle}</p>
              {/if}
              {#if slide.openTheme.author && !slide.subtitle}
                <p class="text-sm text-white/90 mt-1 mb-1 line-clamp-1">By {slide.openTheme.author}</p>
              {/if}
              {#if slide.openTheme.description && !slide.subtitle}
                <p class="text-lg text-white line-clamp-3">{slide.openTheme.description}</p>
              {/if}
            </div>
            <div class="absolute bottom-0 left-0 w-full h-1/2 to-transparent bg-linear-to-t from-black/80"></div>
          </div>
        {/each}
      </div>
    </div>

    <div class="flex absolute right-2 bottom-2 z-10 gap-2">
      <button
        aria-label="Previous"
        onclick={slidePrev}
        type="button"
        class="flex justify-center items-center w-8 h-8 text-white rounded-full bg-black/50 dark:bg-zinc-800 transition-all duration-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 19.5-7.5-7.5 7.5-7.5" />
        </svg>
      </button>
      <button
        aria-label="Next"
        onclick={slideNext}
        type="button"
        class="flex justify-center items-center w-8 h-8 text-white rounded-full bg-black/50 dark:bg-zinc-800 transition-all duration-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  </div>
{/if}
