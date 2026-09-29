<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import SkeletonLoader from "@/interface/components/SkeletonLoader.svelte";
  import SignInToFavoriteModal from "@/interface/components/SignInToFavoriteModal.svelte";
  import type { CommunityThemesState } from "@/interface/hooks/communityThemesState.svelte";
  import {
    formatCustomThemeStatus,
    formatThemeDate,
    statusBadgeClass,
  } from "@/seqta/utils/customThemes/client";
  import ThemePlaceholderCover from "@/interface/components/themes/ThemePlaceholderCover.svelte";
  import ThemeBlobImage from "@/interface/components/themes/ThemeBlobImage.svelte";
  import type { CustomTheme } from "@/types/CustomThemes";
  import { ThemeManager } from "@/plugins/built-in/themes/theme-manager";
  import { themeUpdates } from "@/interface/hooks/ThemeUpdates";
  import { filterThemesByMode } from "@/interface/utils/themeListFilters";
  import { formatCustomThemeApiError } from "@/seqta/utils/customThemes/apiErrors";

  let { communityState }: { communityState: CommunityThemesState } = $props();

  const statusFilters = ["", "pending", "approved", "rejected"] as const;
  const themeManager = ThemeManager.getInstance();

  let localThemes = $state<CustomTheme[]>([]);
  let localThemesLoading = $state(true);
  let submittingLocalId = $state<string | null>(null);
  let localSubmitError = $state<string | null>(null);

  async function refreshLocalThemes() {
    localThemesLoading = true;
    try {
      const all = await themeManager.getAvailableThemes();
      localThemes = filterThemesByMode(all, "custom");
    } finally {
      localThemesLoading = false;
    }
  }

  async function submitLocalTheme(theme: CustomTheme) {
    localSubmitError = null;
    if (!communityState.cloudLoggedIn) {
      communityState.showSignInOverlay = true;
      return;
    }
    submittingLocalId = theme.id;
    try {
      const { submitThemeById } = await import("@/seqta/utils/customThemes/submitLocalTheme");
      await submitThemeById(theme.id, theme.description?.trim() || undefined);
      await communityState.loadMyThemes();
    } catch (err) {
      localSubmitError = formatCustomThemeApiError(err);
    } finally {
      submittingLocalId = null;
    }
  }

  function openInBuilder(themeId: string) {
    void import("@/seqta/utils/launchPageThemeBuilder").then(({ launchPageThemeBuilder }) =>
      launchPageThemeBuilder(themeId),
    );
  }

  onMount(() => {
    void refreshLocalThemes();
    themeUpdates.addListener(refreshLocalThemes);
  });

  onDestroy(() => {
    themeUpdates.removeListener(refreshLocalThemes);
  });
</script>

{#if !communityState.cloudLoggedIn}
  <div class="mx-auto flex max-w-md flex-col items-center py-20 text-center">
    <h2 class="text-2xl font-bold">Sign in to manage your themes</h2>
    <p class="mt-3 text-zinc-600 dark:text-zinc-300">
      Submit themes for review and track pending, approved, or rejected submissions.
    </p>
    <button
      type="button"
      class="mt-6 rounded-lg bg-zinc-900 px-5 py-2.5 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      onclick={() => (communityState.showSignInOverlay = true)}
    >
      Sign in with BetterSEQTA Cloud
    </button>
  </div>
{:else}
  <section class="mb-8">
    <h2 class="text-lg font-semibold text-zinc-900 dark:text-white">Themes on this device</h2>
    <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
      Submit a custom theme you created or imported without opening the theme builder.
    </p>
    {#if localSubmitError}
      <p class="mt-2 whitespace-pre-line text-sm text-red-600 dark:text-red-400">{localSubmitError}</p>
    {/if}
    {#if localThemesLoading}
      <div class="mt-3 grid grid-cols-1 gap-3">
        {#each Array(2) as _, i (i)}
          <SkeletonLoader width="100%" height="72px" />
        {/each}
      </div>
    {:else if localThemes.length === 0}
      <p class="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
        No local custom themes yet. Use Create &amp; submit above or build one in Custom themes settings.
      </p>
    {:else}
      <ul class="mt-3 space-y-3">
        {#each localThemes as theme (theme.id)}
          <li
            class="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
          >
            {#if theme.coverImage}
              <ThemeBlobImage
                source={theme.coverImage}
                alt=""
                class="h-14 w-20 shrink-0 rounded-lg object-cover"
              />
            {:else}
              <ThemePlaceholderCover
                accentHint={theme.defaultColour}
                class="h-14 w-20 shrink-0 rounded-lg object-cover"
              />
            {/if}
            <div class="min-w-0 flex-1">
              <span class="font-semibold text-zinc-900 dark:text-white">{theme.name || "Untitled theme"}</span>
              {#if theme.description}
                <p class="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">{theme.description}</p>
              {/if}
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                class="rounded-lg bg-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                onclick={() => openInBuilder(theme.id)}
              >
                Edit
              </button>
              <button
                type="button"
                class="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                disabled={submittingLocalId === theme.id}
                onclick={() => void submitLocalTheme(theme)}
              >
                {submittingLocalId === theme.id ? "Submitting…" : "Submit"}
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <h2 class="text-lg font-semibold text-zinc-900 dark:text-white">Community submissions</h2>
  <div class="mb-4 mt-3 flex flex-wrap gap-2">
    {#each statusFilters as status (status)}
      <button
        type="button"
        class="rounded-full px-3 py-1 text-sm font-medium transition {communityState.statusFilter === status
          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
          : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300'}"
        onclick={() => (communityState.statusFilter = status)}
      >
        {status === "" ? "All" : formatCustomThemeStatus(status)}
      </button>
    {/each}
  </div>

  {#if communityState.myLoading}
    <div class="grid grid-cols-1 gap-3">
      {#each Array(4) as _, i (i)}
        <SkeletonLoader width="100%" height="72px" />
      {/each}
    </div>
  {:else if communityState.myError}
    <p class="text-red-600 dark:text-red-400">{communityState.myError}</p>
  {:else if communityState.myThemes.length === 0}
    <div class="py-10 text-center">
      <p class="text-lg text-zinc-600 dark:text-zinc-300">No community submissions yet.</p>
      <button
        type="button"
        class="mt-4 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        onclick={() =>
          void import("@/seqta/utils/launchPageThemeBuilder").then(({ launchPageThemeBuilder }) =>
            launchPageThemeBuilder(),
          )}
      >
        Create &amp; submit a theme
      </button>
    </div>
  {:else}
    <ul class="space-y-3">
      {#each communityState.myThemes as theme (theme.id)}
        <li>
          <button
            type="button"
            class="flex w-full items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
            onclick={() => void communityState.openDetail(theme)}
          >
            {#if theme.coverImage}
              <img src={theme.coverImage} alt="" class="h-14 w-20 shrink-0 rounded-lg object-cover" />
            {:else}
              <ThemePlaceholderCover class="h-14 w-20 shrink-0 rounded-lg object-cover" />
            {/if}
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-zinc-900 dark:text-white">{theme.name}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-semibold {statusBadgeClass(theme.status)}"
                >
                  {formatCustomThemeStatus(theme.status)}
                </span>
              </div>
              <p class="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                Submitted {formatThemeDate(theme.created_at)}
              </p>
            </div>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
{/if}

{#if communityState.showSignInOverlay}
  <SignInToFavoriteModal onClose={() => (communityState.showSignInOverlay = false)} />
{/if}
