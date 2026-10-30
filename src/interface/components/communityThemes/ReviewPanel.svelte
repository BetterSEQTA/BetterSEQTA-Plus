<script lang="ts">
  import ThemeGrid from "@/interface/components/store/ThemeGrid.svelte";
  import ThemeModal from "@/interface/components/store/ThemeModal.svelte";
  import SkeletonLoader from "@/interface/components/SkeletonLoader.svelte";
  import Select from "@/interface/components/Select.svelte";
  import type { CommunityThemesState } from "@/interface/hooks/communityThemesState.svelte";

  let { communityState, searchTerm }: { communityState: CommunityThemesState; searchTerm: string } =
    $props();
</script>

<div class="mb-6 flex flex-wrap items-end gap-4">
  <div class="min-w-[10rem]">
    <span class="mb-1 block text-sm font-medium">Status</span>
    <Select
      value={communityState.reviewStatusFilter}
      onChange={(v) => (communityState.reviewStatusFilter = v as typeof communityState.reviewStatusFilter)}
      options={[
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
      ]}
    />
  </div>
  <div class="min-w-[10rem]">
    <span class="mb-1 block text-sm font-medium">Source</span>
    <Select
      value={communityState.reviewSourceFilter}
      onChange={(v) =>
        (communityState.reviewSourceFilter = v as typeof communityState.reviewSourceFilter)}
      options={[
        { value: "", label: "All sources" },
        { value: "marketplace", label: "Official store" },
        { value: "community", label: "Community" },
      ]}
    />
  </div>
</div>

{#if communityState.reviewLoading}
  <div class="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
    {#each Array(6) as _, i (i)}
      <SkeletonLoader width="100%" height="200px" />
    {/each}
  </div>
{:else if communityState.reviewError}
  <p class="py-16 text-center text-red-600 dark:text-red-400">{communityState.reviewError}</p>
{:else if communityState.reviewThemes.length === 0}
  <p class="py-16 text-center text-zinc-500">No themes match this filter.</p>
{:else}
  <ThemeGrid
    themes={communityState.reviewThemes}
    {searchTerm}
    setDisplayTheme={(t) => (communityState.displayTheme = t)}
    toggleFavorite={() => {}}
    isLoggedIn={false}
    installedThemeIds={communityState.currentThemes}
    variant="community"
  />
  {#if communityState.displayTheme}
    <ThemeModal
      currentThemes={communityState.currentThemes}
      allThemes={communityState.reviewThemes}
      theme={communityState.displayTheme}
      displayTheme={communityState.displayTheme}
      setDisplayTheme={(t) => (communityState.displayTheme = t)}
      selectedThemeId={communityState.selectedThemeId}
      installedThemeColors={communityState.installedThemeColors}
      variant="community"
      adminPreviewMode
      onInstall={(id) => void communityState.previewAdminTheme(id, communityState.displayTheme!)}
      onRemove={(id) => void communityState.removeInstalledTheme(id)}
      onApply={(id) => void communityState.applyInstalledTheme(id)}
    />
    {#if communityState.reviewPreviewError}
      <p class="fixed bottom-6 left-1/2 z-[100000] -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white" role="alert">
        {communityState.reviewPreviewError}
      </p>
    {/if}
  {/if}
{/if}
