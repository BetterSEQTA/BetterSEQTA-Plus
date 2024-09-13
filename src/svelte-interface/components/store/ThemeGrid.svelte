<script lang="ts">
  import type { Theme } from '@/svelte-interface/types/Theme'
  import ThemeCard from './ThemeCard.svelte';
  import ThemeModal from './ThemeModal.svelte';

  let { themes, searchTerm } = $props<{ themes: Theme[]; searchTerm: string }>();
  let displayTheme = $state<Theme | null>();

  let filteredThemes = $derived(themes.filter((theme: Theme) =>
    theme.name.toLowerCase().includes(searchTerm.toLowerCase()) || theme.description.toLowerCase().includes(searchTerm.toLowerCase())
  ));
</script>

<div class="grid grid-cols-1 gap-4 py-12 mx-auto sm:grid-cols-2 lg:grid-cols-3">
  {#each filteredThemes as theme (theme.id)}
    <ThemeCard theme={theme} onClick={() => displayTheme = theme} />
  {/each}

  <!-- "Got a Theme Idea?" card -->
  <a href="https://betterseqta.gitbook.io/betterseqta-docs" class='w-full cursor-pointer'>
    <div class="bg-zinc-50 h-48 w-full transition-all hover:scale-105 duration-500 relative justify-center items-center group group/card flex flex-col hover:shadow-2xl dark:hover:shadow-white/[0.1] hover:shadow-white/[0.8] dark:bg-zinc-800 dark:border-white/[0.1] rounded-xl overflow-clip border">
      <div class="text-2xl font-IconFamily">{'\uecb3'}</div>
      <div class="text-xl font-bold text-center transition-all duration-500 dark:text-white">
        Got a Theme Idea?
        <p class="text-lg font-light subtitle">Transform it into a stunning theme!</p>
      </div>
    </div>
  </a>

  {#if filteredThemes.length === 0}
    <div class="flex flex-col items-center justify-center w-full text-center h-96">
      <h1 class="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">That doesn't exist! 😭😭😭</h1>
      <p class="mt-6 text-lg leading-7 text-zinc-600 dark:text-zinc-300">Sorry, we couldn't find the theme you're looking for. Maybe... you could create it?</p>
    </div>
  {/if}
</div>

{#if displayTheme}
  <ThemeModal theme={displayTheme} onClose={() => displayTheme = null} onInstall={() => {}} onRemove={() => {}} />
{/if}
