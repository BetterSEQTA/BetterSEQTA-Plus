<script lang="ts">
  import type { Theme } from '@/interface/types/Theme'
  import ThemeCard from './ThemeCard.svelte';

  let { themes, searchTerm, setDisplayTheme } = $props<{ themes: Theme[]; searchTerm: string, setDisplayTheme: (theme: Theme) => void }>();
  
  let filteredThemes = $derived(themes.filter((theme: Theme) =>
    theme.name.toLowerCase().includes(searchTerm.toLowerCase()) || theme.description.toLowerCase().includes(searchTerm.toLowerCase())
  ));
</script>

<div class="relative" >
  <div class="grid grid-cols-1 gap-4 py-12 mx-auto sm:grid-cols-2 lg:grid-cols-3">
    {#each filteredThemes as theme (theme.id)}
      <ThemeCard theme={theme} onClick={() => setDisplayTheme(theme)} />
    {/each}
  
    {#if filteredThemes.length !== 0}
      <a href="https://betterseqta.gitbook.io/betterseqta-docs" class='w-full cursor-pointer'>
        <div class="bg-zinc-50 h-48 w-full transition-all hover:scale-105 duration-500 relative justify-center items-center group group/card flex flex-col hover:shadow-2xl dark:hover:shadow-white/[0.1] hover:shadow-white/[0.8] dark:bg-zinc-800 dark:border-white/[0.1] rounded-xl overflow-clip border">
          <div class="text-2xl font-IconFamily">{'\uecb3'}</div>
          <div class="text-xl font-bold text-center transition-all duration-500 dark:text-white">
            Got a Theme Idea?
            <p class="text-lg font-light subtitle">Transform it into a stunning theme!</p>
          </div>
        </div>
      </a>
    {/if}
  
  </div>
  {#if filteredThemes.length === 0}
    <div class="absolute top-0 flex flex-col items-center justify-center w-full text-center h-96">
      <h1 class="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">That doesn't exist! 😭😭😭</h1>
      <p class="mt-6 text-lg leading-7 text-zinc-600 dark:text-zinc-300">Sorry, we couldn't find the theme you're looking for. Maybe... you could create it?</p>
      <a href="https://betterseqta.gitbook.io/betterseqta-docs" class='p-2 px-3 mt-4 transition rounded-md cursor-pointer dark:text-white bg-zinc-500/10 hover:scale-105'>
        Show me how!
      </a>
    </div>
  {/if}
</div>