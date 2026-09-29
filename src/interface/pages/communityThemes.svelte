<script lang="ts">
  import { onMount } from "svelte";
  import BrowsePanel from "@/interface/components/communityThemes/BrowsePanel.svelte";
  import MyThemesPanel from "@/interface/components/communityThemes/MyThemesPanel.svelte";
  import OwnerThemeDetailModal from "@/interface/components/communityThemes/OwnerThemeDetailModal.svelte";
  import { createCommunityThemesState } from "@/interface/hooks/communityThemesState.svelte";

  let { searchTerm }: { searchTerm: string; setSearchTerm?: (term: string) => void } = $props();

  const state = createCommunityThemesState(() => searchTerm);
  state.bindReactiveLoads();

  onMount(() => state.mount());
</script>

<div class="relative flex h-full min-h-0 flex-col overflow-hidden text-zinc-900 dark:text-white">
  <div class="shrink-0 border-b border-zinc-200/60 px-6 py-4 dark:border-zinc-700/50">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="inline-flex rounded-xl bg-zinc-200/80 p-1 dark:bg-zinc-800/80">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {state.innerTab === 'browse'
            ? 'bg-white text-zinc-900 shadow dark:bg-zinc-700 dark:text-white'
            : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}"
          onclick={() => (state.innerTab = "browse")}
        >
          Browse
        </button>
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {state.innerTab === 'mine'
            ? 'bg-white text-zinc-900 shadow dark:bg-zinc-700 dark:text-white'
            : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}"
          onclick={() => (state.innerTab = "mine")}
        >
          My themes
        </button>
      </div>
      <button
        type="button"
        class="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        onclick={() =>
          void import("@/seqta/utils/launchPageThemeBuilder").then(({ launchPageThemeBuilder }) =>
            launchPageThemeBuilder(),
          )}
      >
        Create & submit
      </button>
    </div>
    <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
      Community themes are user-submitted and moderated separately from the official theme store.
    </p>
  </div>

  <main class="min-h-0 flex-1 overflow-y-auto bg-zinc-50/80 px-6 py-6 dark:bg-zinc-900/40 md:px-8 lg:px-10">
    {#if state.innerTab === "browse"}
      <BrowsePanel {state} {searchTerm} />
    {:else}
      <MyThemesPanel {state} />
    {/if}
  </main>

  <OwnerThemeDetailModal {state} />
</div>
