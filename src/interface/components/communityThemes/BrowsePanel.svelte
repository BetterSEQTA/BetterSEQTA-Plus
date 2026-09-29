<script lang="ts">
  import ThemeGrid from "@/interface/components/store/ThemeGrid.svelte";
  import ThemeModal from "@/interface/components/store/ThemeModal.svelte";
  import SkeletonLoader from "@/interface/components/SkeletonLoader.svelte";
  import type { CommunityThemesState } from "@/interface/hooks/communityThemesState.svelte";

  let { communityState, searchTerm }: { communityState: CommunityThemesState; searchTerm: string } =
    $props();

  const themes = $derived(
    communityState.browseThemes.filter((theme) => {
      const q = searchTerm.toLowerCase();
      if (!q) return true;
      return (
        (theme.name ?? "").toLowerCase().includes(q) ||
        (theme.description ?? "").toLowerCase().includes(q)
      );
    }),
  );
</script>

{#if communityState.browseLoading}
  <div class="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
    {#each Array(6) as _, i (i)}
      <SkeletonLoader width="100%" height="200px" />
    {/each}
  </div>
{:else if communityState.browseError}
  <div class="flex flex-col items-center justify-center py-24 text-center">
    <h2 class="text-2xl font-bold">Couldn&apos;t load community themes</h2>
    <p class="mt-3 text-zinc-600 dark:text-zinc-300">{communityState.browseError}</p>
    <button
      type="button"
      class="mt-6 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      onclick={() => void communityState.loadBrowseThemes()}
    >
      Try again
    </button>
  </div>
{:else}
  <ThemeGrid
    {themes}
    {searchTerm}
    setDisplayTheme={(theme) => (communityState.displayTheme = theme)}
    toggleFavorite={() => {}}
    isLoggedIn={false}
    installedThemeIds={communityState.currentThemes}
    variant="community"
  />
  {#if communityState.displayTheme}
    <ThemeModal
      currentThemes={communityState.currentThemes}
      allThemes={themes}
      theme={communityState.displayTheme}
      displayTheme={communityState.displayTheme}
      setDisplayTheme={(t) => (communityState.displayTheme = t)}
      selectedThemeId={communityState.selectedThemeId}
      installedThemeColors={communityState.installedThemeColors}
      variant="community"
      onInstall={async (themeId) => {
        if (communityState.displayTheme) await communityState.installCommunityTheme(themeId, communityState.displayTheme);
      }}
      onRemove={(id) => void communityState.removeInstalledTheme(id)}
      onApply={(id) => void communityState.applyInstalledTheme(id)}
    />
  {/if}
{/if}
