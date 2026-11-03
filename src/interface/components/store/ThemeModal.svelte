<script lang="ts">
import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
import DownloadIcon from "@lucide/svelte/icons/download";
import HeartIcon from "@lucide/svelte/icons/heart";
import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
import StarIcon from "@lucide/svelte/icons/star";
import XIcon from '@lucide/svelte/icons/x'
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
import {
getThemeApplyButtonStyles,
resolveStoreVariantAccentColor,
} from '@/interface/utils/themeListFilters'
import { isFeatureDisabled } from '@/seqta/utils/remoteStatus'
let {
theme,
currentThemes,
setDisplayTheme,
onInstall,
onRemove,
onApply,
allThemes,
allStoreThemeRows,
displayTheme,
toggleFavorite,
isLoggedIn,
onRequestSignIn,
selectedThemeId = '',
installedThemeColors = {},
variant = 'official',
adminPreviewMode = false,
}: {
theme: Theme | null
currentThemes: string[]
setDisplayTheme: (theme: Theme | null) => void
onInstall: (themeId: string) => void | Promise<void>
onRemove: (themeId: string) => void | Promise<void>
onApply: (themeId: string) => void | Promise<void>
allThemes: Theme[]
/** Raw API themes (includes slaves) — same aggregation as grid download count */
allStoreThemeRows?: Theme[]
displayTheme: Theme | null
toggleFavorite?: (theme: Theme) => void
isLoggedIn?: boolean
onRequestSignIn?: () => void
selectedThemeId?: string
installedThemeColors?: Record<string, string>
variant?: 'official' | 'community'
adminPreviewMode?: boolean
} = $props()
const installActionLabel = $derived(adminPreviewMode ? 'Preview & apply' : 'Install')
const isCommunity = $derived(variant === 'community')
const themeStoreInstallLocked = $derived(isFeatureDisabled('themeStore.install') && !adminPreviewMode)
const showFavorites = $derived(!isCommunity)
function variantApplyStyles(variantId: string) {
if (!theme) {
return getThemeApplyButtonStyles(undefined)
}
return getThemeApplyButtonStyles(
resolveStoreVariantAccentColor(theme, variantId, installedThemeColors),
)
}
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
if (displayTheme && modalElement) {
animate(
modalElement,
{ y: [16, 0], opacity: [0, 1], scale: [0.98, 1] },
{
type: 'spring',
stiffness: 150,
damping: 20,
},
)
}
})
const hideModal = (relatedTheme: Theme | null = null) => {
animate(
modalElement,
{ y: [0, 16], opacity: [1, 0], scale: [1, 0.98] },
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
if (themeStoreInstallLocked) return
installingId = id
try {
await onInstall(id)
} finally {
installingId = null
}
}
async function runRemove(id: string) {
if (themeStoreInstallLocked) return
installingId = id
try {
await onRemove(id)
} finally {
installingId = null
}
}
async function runApply(id: string) {
installingId = id
try {
await onApply(id)
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
class="flex fixed inset-0 z-50 items-center justify-center bg-black/70 backdrop-blur-xs p-4 sm:p-6"
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
class="flex w-full max-w-[600px] h-fit max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-black/30 dark:border-zinc-700 dark:bg-zinc-800 cursor-auto transition-colors duration-200"
onclick={(e) => e.stopPropagation()}
onkeydown={(e) => e.stopPropagation()}
role="dialog"
aria-modal="true"
tabindex="-1"
>
{#if theme}
<div class="relative flex max-h-[calc(100dvh-3rem)] flex-col overflow-y-auto overflow-x-hidden p-5 pb-8">
<div class="absolute top-0 right-0 flex gap-1 items-center">
<button
type="button"
class="p-2 text-xl font-bold text-gray-600 dark:text-gray-200 transition-colors duration-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
onclick={() => hideModal()}
aria-label="Close"
>
<XIcon size="1em"  />
</button>
</div>
<div class="flex flex-wrap items-center gap-2 pr-12 mb-2">
<h2 class="text-2xl font-bold text-zinc-900 dark:text-white">
{theme.name}
</h2>
{#if isCommunity}
<span
class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100"
aria-label="Community theme"
>
Community
</span>
{/if}
{#if theme.featured === true}
<span
class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
aria-label="Featured theme"
>
<StarIcon class="w-3.5 h-3.5" fill="currentColor" />
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
{#if !adminPreviewMode}
<span class="flex items-center gap-1.5">
<DownloadIcon class="w-4 h-4" />
{modalDisplayDownloadCount.toLocaleString()} downloads
</span>
{:else}
<span class="text-amber-700 dark:text-amber-300">Admin preview — does not count as a public download</span>
{/if}
{#if showFavorites}
<span class="flex items-center gap-1.5">
<HeartIcon class="w-4 h-4" fill={theme.is_favorited ? 'currentColor' : 'none'} />
{(theme.favorite_count ?? 0).toLocaleString()} favorites
</span>
{/if}
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
class="p-2 rounded-full bg-zinc-200 dark:bg-zinc-700 transition-all duration-200 hover:scale-105 active:scale-95 dark:text-white"
aria-label="Previous hero slide"
>
<ChevronLeftIcon class="w-5 h-5" />
</button>
<button
type="button"
onclick={heroNext}
class="p-2 rounded-full bg-zinc-200 dark:bg-zinc-700 transition-all duration-200 hover:scale-105 active:scale-95 dark:text-white"
aria-label="Next hero slide"
>
<ChevronRightIcon class="w-5 h-5" />
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
<div
class="relative w-full overflow-hidden rounded-2xl min-h-38 sm:min-h-44 text-left shadow-md border border-zinc-400/70 dark:border-zinc-500 group ring-1 ring-black/10 dark:ring-white/10"
>
{#if masterThumb}
                  <img src={masterThumb} alt="" class="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" draggable="false" />
                {:else}
                  <div class="absolute inset-0 bg-zinc-700" role="presentation"></div>
                {/if}
                <div class="absolute inset-0 bg-neutral-950/50" role="presentation"></div>
<div class="relative z-10 flex flex-col justify-end min-h-38 sm:min-h-44 p-5">
{#if installingId === theme.id}
<span class="flex justify-center mb-3">
<span class="inline-block w-10 h-10 animate-spin rounded-full border-2 border-white border-t-transparent align-middle"></span>
</span>
{/if}
<span class="text-lg sm:text-xl font-bold text-white drop-shadow-md tracking-tight leading-snug">
{theme.id === selectedThemeId ? 'Applied · ' : ''}{theme.name}
</span>
<span class="mt-1 text-sm font-medium text-white/85">Master · Installed</span>
<div class="mt-3 flex flex-wrap gap-2">
{#if theme.id !== selectedThemeId}
<button
type="button"
onclick={(e) => { e.stopPropagation(); void runApply(theme.id) }}
disabled={installingId !== null}
style={variantApplyStyles(theme.id).apply}
class="px-3 py-1.5 text-sm font-semibold rounded-lg hover:brightness-90 disabled:opacity-70"
>
Apply
</button>
{/if}
<button
type="button"
onclick={(e) => { e.stopPropagation(); void onMasterVariantClick('remove') }}
disabled={installingId !== null}
class="px-3 py-1.5 text-sm font-semibold rounded-lg bg-white/20 text-white hover:bg-white/30 disabled:opacity-70"
>
Remove
</button>
</div>
</div>
</div>
{:else}
<button
type="button"
onclick={() => onMasterVariantClick('install')}
disabled={installingId !== null}
class="relative w-full overflow-hidden rounded-2xl min-h-38 sm:min-h-44 text-left shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 group ring-1 ring-black/10 dark:ring-white/10"
title="Install {theme.name} (master)"
>
{#if masterThumb}
                  <img src={masterThumb} alt="" class="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" draggable="false" />
                {:else}
                  <div class="absolute inset-0 bg-zinc-600" role="presentation"></div>
                {/if}
                <div class="absolute inset-0 bg-neutral-950/50" role="presentation"></div>
<div class="relative z-10 flex flex-col justify-end min-h-38 sm:min-h-44 p-5">
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
<div
class="relative w-full overflow-hidden rounded-2xl min-h-38 sm:min-h-44 text-left shadow-md border border-zinc-400/70 dark:border-zinc-500 group ring-1 ring-black/10 dark:ring-white/10"
>
{#if thumb}
                    <img src={thumb} alt="" class="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" draggable="false" />
                  {:else}
                    <div class="absolute inset-0 bg-zinc-700" role="presentation"></div>
                  {/if}
                  <div class="absolute inset-0 bg-neutral-950/50" role="presentation"></div>
<div class="relative z-10 flex flex-col justify-end min-h-38 sm:min-h-44 p-5">
{#if installingId === f.id}
<span class="flex justify-center mb-3">
<span class="inline-block w-10 h-10 animate-spin rounded-full border-2 border-white border-t-transparent align-middle"></span>
</span>
{/if}
<span class="text-lg sm:text-xl font-bold text-white drop-shadow-md tracking-tight leading-snug">
{f.id === selectedThemeId ? 'Applied · ' : ''}{f.name}
</span>
<span class="mt-1 text-sm font-medium text-white/85">Installed</span>
<div class="mt-3 flex flex-wrap gap-2">
{#if f.id !== selectedThemeId}
<button
type="button"
onclick={(e) => { e.stopPropagation(); scrollHeroToFlavourIndex(flavourIdx); void runApply(f.id) }}
disabled={installingId !== null}
style={variantApplyStyles(f.id).apply}
class="px-3 py-1.5 text-sm font-semibold rounded-lg hover:brightness-90 disabled:opacity-70"
>
Apply
</button>
{/if}
<button
type="button"
onclick={(e) => { e.stopPropagation(); void onFlavourClick(flavourIdx, f.id, 'remove') }}
disabled={installingId !== null}
class="px-3 py-1.5 text-sm font-semibold rounded-lg bg-white/20 text-white hover:bg-white/30 disabled:opacity-70"
>
Remove
</button>
</div>
</div>
</div>
{:else}
<button
type="button"
onclick={() => onFlavourClick(flavourIdx, f.id, 'install')}
disabled={installingId !== null}
class="relative w-full overflow-hidden rounded-2xl min-h-38 sm:min-h-44 text-left shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 group ring-1 ring-black/10 dark:ring-white/10"
title="Install {f.name}"
>
{#if thumb}
                    <img src={thumb} alt="" class="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" draggable="false" />
                  {:else}
                    <div class="absolute inset-0 bg-zinc-600" role="presentation"></div>
                  {/if}
                  <div class="absolute inset-0 bg-neutral-950/50" role="presentation"></div>
<div class="relative z-10 flex flex-col justify-end min-h-38 sm:min-h-44 p-5">
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
{#if showFavorites && toggleFavorite && theme}
<button
type="button"
class="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95      {theme.is_favorited ? 'text-red-500 bg-red-500/10 dark:bg-red-500/20' : 'bg-zinc-200 dark:bg-zinc-700 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-600'}"
onclick={handleFavoriteClick}
title={isLoggedIn ? (theme.is_favorited ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to favorite themes'}
aria-label={theme.is_favorited ? 'Unfavorite' : 'Favorite'}
>
<HeartIcon class="w-5 h-5" fill={theme.is_favorited ? 'currentColor' : 'none'} />
{theme.is_favorited ? 'Favorited' : 'Favorite'}
</button>
{/if}
{#if !hasFlavours}
{#if currentThemes.includes(theme.id)}
{#if theme.id === selectedThemeId}
<button
type="button"
disabled
style={variantApplyStyles(theme.id).applied}
class="relative flex justify-center items-center px-4 py-2 min-w-32 rounded-lg opacity-90"
>
Applied
</button>
{:else}
<button
type="button"
onclick={() => runApply(theme.id)}
disabled={installingId !== null}
style={variantApplyStyles(theme.id).apply}
class="relative flex justify-center items-center px-4 py-2 min-w-32 rounded-lg transition-all duration-200 hover:brightness-90 active:scale-95 disabled:opacity-70"
>
{#if installingId === theme.id}
<LoaderCircleIcon class="absolute w-4 h-4 animate-spin" />
{/if}
<span class="{installingId === theme.id ? 'opacity-0' : 'opacity-100'}">Apply</span>
</button>
{/if}
<button
type="button"
onclick={() => runRemove(theme.id)}
disabled={installingId !== null}
class="relative flex justify-center items-center px-4 py-2 min-w-32 text-black rounded-lg dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-70"
>
{#if installingId === theme.id}
<LoaderCircleIcon class="absolute w-4 h-4 animate-spin" />
{/if}
<span class="{installingId === theme.id ? 'opacity-0' : 'opacity-100'}">Remove</span>
</button>
{:else}
<button
type="button"
onclick={() => runInstall(theme.id)}
disabled={installingId !== null}
class="relative flex justify-center items-center px-4 py-2 min-w-32 text-black rounded-lg dark:text-white bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600/50 hover:bg-zinc-200 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-70"
>
{#if installingId === theme.id}
<LoaderCircleIcon class="absolute w-4 h-4 animate-spin" />
{/if}
<span class="{installingId === theme.id ? 'opacity-0' : 'opacity-100'}">{installActionLabel}</span>
</button>
{/if}
{/if}
</div>
{#if relatedThemes.length > 0}
<div class="pt-6 mt-6 border-t border-zinc-200 dark:border-zinc-700"></div>
<h3 class="mb-4 text-lg font-bold text-zinc-900 dark:text-white">
Related themes
</h3>
<div class="grid grid-cols-1 gap-4 pb-2 sm:grid-cols-2">
{#each relatedThemes as relatedTheme (relatedTheme.id)}
<button
type="button"
onclick={() => {
hideModal(relatedTheme)
}}
class="relative z-0 hover:z-20 w-full cursor-pointer rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02]"
>
<div class="bg-gray-50 w-full transition-all duration-500 ease-out relative group group/card flex flex-col hover:shadow-xl dark:hover:shadow-white/10 hover:shadow-white/80 dark:bg-zinc-800 dark:border-white/10 h-auto rounded-xl overflow-clip border border-zinc-200 dark:border-zinc-700">
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
<div class="flex justify-center items-center p-8 text-zinc-600 dark:text-zinc-300">
<button
type="button"
class="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 transition-all duration-200 hover:scale-105 active:scale-95 dark:text-white"
onclick={() => hideModal()}
>
Close
</button>
</div>
{/if}
</div>
</div>
