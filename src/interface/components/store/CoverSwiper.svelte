<script lang="ts">
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import StarIcon from "@lucide/svelte/icons/star";
  import { fade } from "svelte/transition";
  import type { ThemeCoverSlide } from "@/interface/types/theme";
  import emblaCarouselSvelte from "embla-carousel-svelte";
  import Autoplay from "embla-carousel-autoplay";

  let {
    slides,
    setDisplayTheme,
  }: {
    slides: ThemeCoverSlide[];
    setDisplayTheme: (theme: import("@/interface/types/theme").Theme) => void;
  } = $props();
  let emblaApi = $state();

  const options = $derived({ loop: slides.length > 1 });
  const plugins = $derived(
    slides.length > 1
      ? [
          Autoplay({
            delay: 5000,
            stopOnInteraction: false,
            stopOnMouseEnter: true,
          }),
        ]
      : [],
  );

  function onInit(event: CustomEvent) {
    emblaApi = event.detail;
  }

  // @ts-ignore
  const slidePrev = () => emblaApi?.scrollPrev();
  // @ts-ignore
  const slideNext = () => emblaApi?.scrollNext();
</script>

{#if slides.length > 0}
  <div
    class="relative w-full overflow-clip rounded-xl ring-1 ring-black/10 transition-opacity dark:ring-white/10"
    transition:fade
  >
    <div
      class="w-full overflow-hidden"
      use:emblaCarouselSvelte={{ options, plugins }}
      onemblaInit={onInit}
    >
      <div class="flex">
        {#each slides as slide (slide.imageUrl + slide.title + (slide.subtitle ?? ""))}
          <div
            class="cover-slide relative isolate min-w-0 flex-[0_0_100%] cursor-pointer overflow-hidden"
            role="button"
            tabindex="0"
            onkeydown={(e) => {
              if (e.key === "Enter") setDisplayTheme(slide.openTheme);
            }}
            onclick={() => setDisplayTheme(slide.openTheme)}
          >
            <img
              src={slide.imageUrl}
              alt=""
              class="absolute inset-0 z-0 h-full w-full object-cover"
            />
            {#if slide.badgeFeatured === true}
              <div class="absolute top-4 left-4 z-2 pointer-events-none">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100 shadow-xs"
                  aria-label="Featured theme"
                >
                  <StarIcon class="w-3.5 h-3.5" fill="currentColor" />
                  Featured
                </span>
              </div>
            {/if}
            <div class="absolute bottom-0 left-0 z-2 p-8">
              <h2 class="text-4xl font-bold text-white">{slide.title}</h2>
              {#if slide.subtitle}
                <p class="text-lg font-medium text-white/95 mt-1 line-clamp-2">{slide.subtitle}</p>
              {/if}
              {#if slide.openTheme.author && !slide.subtitle}
                <p class="text-sm text-white/90 mt-1 mb-1 line-clamp-1">
                  By {slide.openTheme.author}
                </p>
              {/if}
              {#if slide.openTheme.description && !slide.subtitle}
                <p class="text-lg text-white line-clamp-3">{slide.openTheme.description}</p>
              {/if}
            </div>
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
        <ChevronLeftIcon class="w-6 h-6" />
      </button>
      <button
        aria-label="Next"
        onclick={slideNext}
        type="button"
        class="flex justify-center items-center w-8 h-8 text-white rounded-full bg-black/50 dark:bg-zinc-800 transition-all duration-200"
      >
        <ChevronRightIcon class="w-6 h-6" />
      </button>
    </div>
  </div>
{/if}

<style>
  .cover-slide {
    aspect-ratio: 3 / 1;
  }

  .cover-slide::after {
    position: absolute;
    z-index: 1;
    inset: 0;
    background: linear-gradient(
      to top,
      rgb(0 0 0 / 46%) 0%,
      rgb(0 0 0 / 42.5%) 18%,
      rgb(0 0 0 / 34%) 36%,
      rgb(0 0 0 / 21%) 54%,
      rgb(0 0 0 / 8%) 72%,
      transparent 88%
    );
    content: "";
    pointer-events: none;
  }
</style>
