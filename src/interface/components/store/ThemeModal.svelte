<script lang="ts">

  import type { Theme } from '@/interface/types/Theme'

  import { fade } from 'svelte/transition'

  import { animate } from 'motion'

  import emblaCarouselSvelte from 'embla-carousel-svelte'

  import {

    buildModalHeroSlides,

    flavourCarouselImageUrl,

    masterCarouselImageUrl,

    masterGridDisplayDownloadCount,

  } from '@/interface/utils/themeStoreFlavours'



  let {

    theme,

    currentThemes,

    setDisplayTheme,

    onInstall,

    onRemove,

    allThemes,

    allStoreThemeRows,

    displayTheme,

    toggleFavorite,

    isLoggedIn,

    onRequestSignIn,

  } = $props<{

    theme: Theme | null

    currentThemes: string[]

    setDisplayTheme: (theme: Theme | null) => void

    onInstall: (themeId: string) => void | Promise<void>

    onRemove: (themeId: string) => void | Promise<void>

    allThemes: Theme[]

    /** Raw API themes (includes slaves) — same aggregation as grid download count */

    allStoreThemeRows?: Theme[]

    displayTheme: Theme | null

    toggleFavorite?: (theme: Theme) => void

    isLoggedIn?: boolean

    onRequestSignIn?: () => void

  }>()



  const modalDisplayDownloadCount = $derived.by(() => {

    const t = theme

    if (!t) return 0

    if (allStoreThemeRows != null) return masterGridDisplayDownloadCount(t, allStoreThemeRows)

    return t.download_count ?? 0

  })

  let installingId = $state<string | null>(null)

  let modalElement: HTMLElement

  /** Embla CarouselInstance — scrollTo from embla-carousel */

  let heroEmblaApi = $state<{

    scrollTo: (index: number, jump?: boolean) => void

    scrollPrev: () => void

    scrollNext: () => void

  } | null>(null)



  function handleFavoriteClick() {

    if (isLoggedIn && toggleFavorite && theme) {

      toggleFavorite(theme)

    } else {

      onRequestSignIn?.()

    }

  }



  function tagsOverlap(a: string[] | undefined, b: string[] | undefined): boolean {

    const lowerB = new Set((b ?? []).map((t) => t.toLowerCase()))

    return (a ?? []).some((t) => lowerB.has(t.toLowerCase()))

  }



  const flavourIdsAvoidForRelated = $derived.by(() => {

    const set = new Set<string>()

    for (const f of theme?.flavours ?? []) {

      set.add(f.id)

    }

    return set

  })



  const relatedThemes = $derived.by(() => {

    const t = theme

    if (!t) return [] as Theme[]

    if ((t.tags ?? []).length === 0) return []

    return allThemes

      .filter((x: Theme) => {

        if (!x || x.id === t.id) return false

        if (flavourIdsAvoidForRelated.has(x.id)) return false

        if (x.master_id === t.id) return false

        return tagsOverlap(t.tags, x.tags)

      })

      .sort((a: Theme, b: Theme) => {

        const diff = (b.download_count ?? 0) - (a.download_count ?? 0)

        if (diff !== 0) return diff

        const byName = a.name.localeCompare(b.name)

        if (byName !== 0) return byName

        return a.id.localeCompare(b.id)

      })

      .slice(0, 4)

  })



  const hasFlavours = $derived((theme?.flavours?.length ?? 0) > 0)

  const heroSlides = $derived(theme ? buildModalHeroSlides(theme) : [])



  const heroCarouselOpts = $derived({ loop: heroSlides.length > 1 })



  function heroInit(ev: CustomEvent) {

    heroEmblaApi = ev.detail

  }



  const heroPrev = () => heroEmblaApi?.scrollPrev?.()

  const heroNext = () => heroEmblaApi?.scrollNext?.()



  /** Carousel slide 0 = master; flavours start at slide 1 + flavourIndex */

  function scrollHeroToMasterSlide() {

    heroEmblaApi?.scrollTo?.(0, true)

  }



  function scrollHeroToFlavourIndex(flavourIndex: number) {

    heroEmblaApi?.scrollTo?.(flavourIndex + 1, true)

  }



  $effect(() => {

    if (displayTheme) {

      animate(

        modalElement,

        { y: [500, 0], opacity: [0, 1] },

        {

          type: 'spring',

          stiffness: 150,

          damping: 20,

        },

      )

    }

  })



  const hideModal = (relatedTheme?: Theme | null) => {

    animate(

      modalElement,

      { y: [10, 500], opacity: [1, 0] },

      {

        type: 'spring',

        stiffness: 150,

        damping: 20,

      },

    )

    setTimeout(() => {

      setDisplayTheme(relatedTheme ?? null)

    }, 100)

  }



  async function runInstall(id: string) {

    installingId = id

    try {

      await onInstall(id)

    } finally {

      installingId = null

    }

  }



  async function runRemove(id: string) {

    installingId = id

    try {

      await onRemove(id)

    } finally {

      installingId = null

    }

  }



  async function onFlavourClick(flIdx: number, themeId: string, action: 'install' | 'remove') {

    scrollHeroToFlavourIndex(flIdx)

    if (action === 'install') await runInstall(themeId)

    else await runRemove(themeId)

  }



  async function onMasterVariantClick(action: 'install' | 'remove') {

    if (!theme) return

    scrollHeroToMasterSlide()

    if (action === 'install') await runInstall(theme.id)

    else await runRemove(theme.id)

  }

</script>



<div

  class="flex fixed inset-0 z-50 justify-center items-end bg-black/70 backdrop-blur-sm"

  onclick={(e) => {

    if (e.target === e.currentTarget) hideModal()

  }}

  onkeydown={(e) => {

    if (e.target === e.currentTarget && e.key === 'Escape') hideModal()

  }}

  role="presentation"

  transition:fade

>

  <!-- svelte-ignore a11y_no_static_element_interactions -->

  <div

    bind:this={modalElement}

    class="w-full max-w-[600px] h-[95%] p-4 bg-white rounded-t-2xl dark:bg-zinc-800 overflow-y-auto overflow-x-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-auto transition-colors duration-200"

    onclick={(e) => e.stopPropagation()}

    onkeydown={(e) => e.stopPropagation()}

    role="dialog"

    aria-modal="true"

    tabindex="-1"

  >

    {#if theme}

      <div class="relative h-auto">

        <div class="absolute top-0 right-0 flex gap-1 items-center">

          <button

            type="button"

            class="p-2 text-xl font-bold text-gray-600 font-IconFamily dark:text-gray-200 transition-colors duration-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800"

            onclick={() => hideModal()}

            aria-label="Close"

          >

            {'\ued8a'}

          </button>

        </div>

        <div class="flex flex-wrap items-center gap-2 pr-12 mb-2">

          <h2 class="text-2xl font-bold text-zinc-900 dark:text-white">

            {theme.name}

          </h2>

          {#if theme.featured === true}

            <span

              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"

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

          {/if}

        </div>

        {#if theme.author}

          <p class="mb-2 text-sm text-zinc-600 dark:text-zinc-400">

            By {theme.author}

          </p>

        {/if}

        <div class="flex gap-4 mb-4 text-sm text-zinc-600 dark:text-zinc-400">

          <span class="flex items-center gap-1.5">

            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">

              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />

            </svg>

            {modalDisplayDownloadCount.toLocaleString()} downloads

          </span>

          <span class="flex items-center gap-1.5">

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={theme.is_favorited ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5" class="w-4 h-4">

              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />

            </svg>

            {(theme.favorite_count ?? 0).toLocaleString()} favorites

          </span>

        </div>



        {#if heroSlides.length > 0}

          {#key theme?.id}

            <div class="relative mb-4 w-full overflow-hidden rounded-xl">

              <div

                class="w-full max-h-[280px]"

                use:emblaCarouselSvelte={{ options: heroCarouselOpts, plugins: [] }}

                onemblaInit={heroInit}

              >

                <div class="flex">

                  {#each heroSlides as slide, slideIdx (slideIdx)}

                    <div class="relative flex-[0_0_100%] shrink-0 min-w-0">

                      <img src={slide.imageUrl} alt={slide.caption} class="object-cover w-full max-h-[280px] rounded-xl" />

                    </div>

                  {/each}

                </div>

              </div>

              {#if heroSlides.length > 1}

                <div class="flex justify-end gap-2 mt-2">

                  <button

                    type="button"

                    onclick={heroPrev}

                    class="p-2 rounded-full bg-zinc-200 dark:bg-zinc-700 transition-all duration-200 hover:scale-105 active:scale-95 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"

                    aria-label="Previous hero slide"

                  >

                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class="w-5 h-5">

                      <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 19.5-7.5-7.5 7.5-7.5" />

                    </svg>

                  </button>

                  <button

                    type="button"

                    onclick={heroNext}

                    class="p-2 rounded-full bg-zinc-200 dark:bg-zinc-700 transition-all duration-200 hover:scale-105 active:scale-95 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"

                    aria-label="Next hero slide"

                  >

                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class="w-5 h-5">

                      <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />

                    </svg>

                  </button>

                </div>

              {/if}

            </div>

          {/key}

        {/if}



        {#if hasFlavours}

          {@const masterThumb = masterCarouselImageUrl(theme)}

          <p class="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">Variants</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 w-full">

            {#if currentThemes.includes(theme.id)}

              <button

                type="button"

                onclick={() => onMasterVariantClick('remove')}

                disabled={installingId !== null}

                class="relative w-full overflow-hidden rounded-2xl min-h-[9.5rem] sm:min-h-[11rem] text-left shadow-md border border-zinc-400/70 dark:border-zinc-500 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800 disabled:opacity-70 group ring-1 ring-black/10 dark:ring-white/10"

                title="Remove {theme.name} (master)"

              >

                {#if masterThumb}
                  <img src={masterThumb} alt="" class="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" draggable="false" />
                {:else}
                  <div class="absolute inset-0 bg-zinc-700" role="presentation"></div>
                {/if}
                <div class="absolute inset-0 bg-neutral-950/50" role="presentation"></div>

                <div class="relative z-10 flex flex-col justify-end min-h-[9.5rem] sm:min-h-[11rem] p-5">

                  {#if installingId === theme.id}

                    <span class="flex justify-center mb-3">

                      <span class="inline-block w-10 h-10 animate-spin rounded-full border-2 border-white border-t-transparent align-middle"></span>

                    </span>

                  {/if}

                  <span class="text-lg sm:text-xl font-bold text-white drop-shadow-md tracking-tight leading-snug">

                    Remove · {theme.name}

                  </span>

                  <span class="mt-1 text-sm font-medium text-white/85">Master</span>

                </div>

              </button>

            {:else}

              <button

                type="button"

                onclick={() => onMasterVariantClick('install')}

                disabled={installingId !== null}

                class="relative w-full overflow-hidden rounded-2xl min-h-[9.5rem] sm:min-h-[11rem] text-left shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800 disabled:opacity-70 group ring-1 ring-black/10 dark:ring-white/10"

                title="Install {theme.name} (master)"

              >

                {#if masterThumb}
                  <img src={masterThumb} alt="" class="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" draggable="false" />
                {:else}
                  <div class="absolute inset-0 bg-zinc-600" role="presentation"></div>
                {/if}
                <div class="absolute inset-0 bg-neutral-950/50" role="presentation"></div>

                <div class="relative z-10 flex flex-col justify-end min-h-[9.5rem] sm:min-h-[11rem] p-5">

                  {#if installingId === theme.id}

                    <span class="flex justify-center mb-3">

                      <span class="inline-block w-10 h-10 animate-spin rounded-full border-2 border-white border-t-transparent align-middle"></span>

                    </span>

                  {/if}

                  <span class="text-lg sm:text-xl font-bold text-white drop-shadow-md tracking-tight leading-snug">{theme.name}</span>

                  <span class="mt-1 text-sm font-medium text-white/85">Master</span>

                </div>

              </button>

            {/if}

            {#each theme.flavours ?? [] as f, flavourIdx (f.id)}

              {@const thumb = flavourCarouselImageUrl(f)}

              {#if currentThemes.includes(f.id)}

                <button

                  type="button"

                  onclick={() => onFlavourClick(flavourIdx, f.id, 'remove')}

                  disabled={installingId !== null}

                  class="relative w-full overflow-hidden rounded-2xl min-h-[9.5rem] sm:min-h-[11rem] text-left shadow-md border border-zinc-400/70 dark:border-zinc-500 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800 disabled:opacity-70 group ring-1 ring-black/10 dark:ring-white/10"

                  title="Remove {f.name}"

                >

                  {#if thumb}
                    <img src={thumb} alt="" class="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" draggable="false" />
                  {:else}
                    <div class="absolute inset-0 bg-zinc-700" role="presentation"></div>
                  {/if}
                  <div class="absolute inset-0 bg-neutral-950/50" role="presentation"></div>

                  <div class="relative z-10 flex flex-col justify-end min-h-[9.5rem] sm:min-h-[11rem] p-5">

                    {#if installingId === f.id}

                      <span class="flex justify-center mb-3">

                        <span class="inline-block w-10 h-10 animate-spin rounded-full border-2 border-white border-t-transparent align-middle"></span>

                      </span>

                    {/if}

                    <span class="text-lg sm:text-xl font-bold text-white drop-shadow-md tracking-tight leading-snug">

                      Remove · {f.name}

                    </span>

                  </div>

                </button>

              {:else}

                <button

                  type="button"

                  onclick={() => onFlavourClick(flavourIdx, f.id, 'install')}

                  disabled={installingId !== null}

                  class="relative w-full overflow-hidden rounded-2xl min-h-[9.5rem] sm:min-h-[11rem] text-left shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800 disabled:opacity-70 group ring-1 ring-black/10 dark:ring-white/10"

                  title="Install {f.name}"

                >

                  {#if thumb}
                    <img src={thumb} alt="" class="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" draggable="false" />
                  {:else}
                    <div class="absolute inset-0 bg-zinc-600" role="presentation"></div>
                  {/if}
                  <div class="absolute inset-0 bg-neutral-950/50" role="presentation"></div>

                  <div class="relative z-10 flex flex-col justify-end min-h-[9.5rem] sm:min-h-[11rem] p-5">

                    {#if installingId === f.id}

                      <span class="flex justify-center mb-3">

                        <span class="inline-block w-10 h-10 animate-spin rounded-full border-2 border-white border-t-transparent align-middle"></span>

                      </span>

                    {/if}

                    <span class="text-lg sm:text-xl font-bold text-white drop-shadow-md tracking-tight leading-snug">{f.name}</span>

                  </div>

                </button>

              {/if}

            {/each}

          </div>

        {/if}



        <p class="mb-4 text-gray-700 dark:text-gray-300">

          {theme.description}

        </p>



        <div class="flex flex-wrap gap-2 mt-4 justify-start sm:justify-end items-center">

          {#if toggleFavorite && theme}

            <button

              type="button"

              class="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800 {theme.is_favorited ? 'text-red-500 bg-red-500/10 dark:bg-red-500/20' : 'bg-zinc-200 dark:bg-zinc-700 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-600'}"

              onclick={handleFavoriteClick}

              title={isLoggedIn ? (theme.is_favorited ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to favorite themes'}

              aria-label={theme.is_favorited ? 'Unfavorite' : 'Favorite'}

            >

              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={theme.is_favorited ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" class="w-5 h-5">

                <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />

              </svg>

              {theme.is_favorited ? 'Favorited' : 'Favorite'}

            </button>

          {/if}



          {#if !hasFlavours}

            {#if currentThemes.includes(theme.id)}

              <button

                type="button"

                onclick={() => runRemove(theme.id)}

                disabled={installingId !== null}

                class="relative flex justify-center items-center px-4 py-2 min-w-[8rem] text-black rounded-lg dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-70"

              >

                {#if installingId === theme.id}

                  <svg class="absolute w-4 h-4 animate-spin" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">

                    <path stroke="currentColor" fill="currentColor" class="origin-center animate-spin-fast" d="M2,12A11.2,11.2,0,0,1,13,1.05C12.67,1,12.34,1,12,1a11,11,0,0,0,0,22c.34,0,.67,0,1-.05C6,23,2,17.74,2,12Z"/>

                  </svg>

                {/if}

                <span class="{installingId === theme.id ? 'opacity-0' : 'opacity-100'}">Remove</span>

              </button>

            {:else}

              <button

                type="button"

                onclick={() => runInstall(theme.id)}

                disabled={installingId !== null}

                class="relative flex justify-center items-center px-4 py-2 min-w-[8rem] text-black rounded-lg dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-70"

              >

                {#if installingId === theme.id}

                  <svg class="absolute w-4 h-4 animate-spin" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">

                    <path stroke="currentColor" fill="currentColor" class="origin-center animate-spin-fast" d="M2,12A11.2,11.2,0,0,1,13,1.05C12.67,1,12.34,1,12,1a11,11,0,0,0,0,22c.34,0,.67,0,1-.05C6,23,2,17.74,2,12Z"/>

                  </svg>

                {/if}

                <span class="{installingId === theme.id ? 'opacity-0' : 'opacity-100'}">Install</span>

              </button>

            {/if}

          {/if}

        </div>



        {#if relatedThemes.length > 0}

          <div class="my-8 border-b border-zinc-200 dark:border-zinc-700"></div>



          <h3 class="mb-4 text-lg font-bold text-zinc-900 dark:text-white">

            Related themes

          </h3>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {#each relatedThemes as relatedTheme (relatedTheme.id)}

              <button

                type="button"

                onclick={() => {

                  hideModal(relatedTheme)

                }}

                class="relative z-0 hover:z-20 w-full cursor-pointer rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02]"

              >

                <div class="bg-gray-50 w-full transition-all duration-500 ease-out relative group group/card flex flex-col hover:shadow-xl dark:hover:shadow-white/[0.1] hover:shadow-white/[0.8] dark:bg-zinc-800 dark:border-white/[0.1] h-auto rounded-xl overflow-clip border border-zinc-200 dark:border-zinc-700">

                  <div class="absolute bottom-1 left-3 z-10 mb-1 text-xl font-bold text-white transition-all duration-500 group-hover:-translate-y-0.5">

                    {relatedTheme.name}

                  </div>

                  <div class="absolute bottom-0 z-0 w-full h-3/4 to-transparent from-black/80 bg-linear-to-t"></div>

                  <img src={relatedTheme.marqueeImage || relatedTheme.coverImage} alt="" class="object-cover w-full h-48" />

                </div>

              </button>

            {/each}

          </div>

        {/if}

      </div>

    {:else}

      <div class="flex justify-center items-center h-full text-zinc-600 dark:text-zinc-300">

        <button

          type="button"

          class="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 transition-all duration-200 hover:scale-105 active:scale-95 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800"

          onclick={() => hideModal()}

        >

          Close

        </button>

      </div>

    {/if}

  </div>

</div>



