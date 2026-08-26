<script lang="ts">
  import { onMount, tick } from "svelte";
  import browser from "webextension-polyfill";
  import ThemeGrid from "@/interface/components/store/ThemeGrid.svelte";
  import ThemeModal from "@/interface/components/store/ThemeModal.svelte";
  import SkeletonLoader from "@/interface/components/SkeletonLoader.svelte";
  import SignInToFavoriteModal from "@/interface/components/SignInToFavoriteModal.svelte";
  import type { Theme } from "@/interface/types/Theme";
  import { ThemeManager } from "@/plugins/built-in/themes/theme-manager";
  import { themeUpdates } from "@/interface/hooks/ThemeUpdates";
  import { cloudAuth } from "@/seqta/utils/CloudAuth";
  import {
    CustomThemeApiError,
    canEditCustomTheme,
    deleteCustomTheme,
    fetchCommunityThemes,
    fetchMyCustomThemeDetail,
    fetchMyCustomThemes,
    formatCustomThemeStatus,
    formatThemeDate,
    replaceCustomThemeFiles,
    statusBadgeClass,
    submitCustomTheme,
    updateCustomThemeMetadata,
  } from "@/seqta/utils/customThemes/client";
  import {
    RATE_LIMIT_DAILY_MESSAGE,
    RATE_LIMIT_PENDING_MESSAGE,
  } from "@/seqta/utils/customThemes/constants";
  import {
    buildUploadPartsFromLocalTheme,
    buildUploadPartsFromZipFile,
    mergeUploadPayload,
  } from "@/seqta/utils/customThemes/buildThemeUploadFormData";
  import type { CustomThemeOwner, CustomThemeFile } from "@/seqta/utils/customThemes/types";
  import type { LoadedCustomTheme } from "@/types/CustomThemes";
  import { isLocalCustomTheme } from "@/interface/utils/themeListFilters";

  let {
    searchTerm,
  } = $props<{
    searchTerm: string;
    setSearchTerm?: (term: string) => void;
  }>();

  type InnerTab = "browse" | "mine";

  const themeManager = ThemeManager.getInstance();

  let innerTab = $state<InnerTab>("browse");
  let cloudLoggedIn = $state(cloudAuth.state.isLoggedIn);

  let browseThemes = $state<Theme[]>([]);
  let browseLoading = $state(true);
  let browseError = $state<string | null>(null);

  let myThemes = $state<CustomThemeOwner[]>([]);
  let myLoading = $state(false);
  let myError = $state<string | null>(null);
  let statusFilter = $state<"" | "pending" | "approved" | "rejected">("");

  let displayTheme = $state<Theme | null>(null);
  let currentThemes = $state<string[]>([]);
  let selectedThemeId = $state("");
  let installedThemeColors = $state<Record<string, string>>({});

  let showSignInOverlay = $state(false);
  let showSubmitModal = $state(false);
  let submitNotes = $state("");
  let submitBusy = $state(false);
  let submitError = $state<string | null>(null);
  let submitValidationErrors = $state<string[]>([]);
  let selectedZipFile = $state<File | null>(null);
  let selectedLocalThemeId = $state("");
  let editableThemes = $state<LoadedCustomTheme[]>([]);

  let detailTheme = $state<CustomThemeOwner | null>(null);
  let detailFiles = $state<CustomThemeFile[]>([]);
  let detailLoading = $state(false);
  let detailError = $state<string | null>(null);
  let editName = $state("");
  let editDescription = $state("");
  let editNotes = $state("");
  let detailBusy = $state(false);
  let replaceZipFile = $state<File | null>(null);
  let showDeleteConfirm = $state(false);

  $effect(() => {
    const unsub = cloudAuth.subscribe((s) => {
      cloudLoggedIn = s.isLoggedIn;
    });
    return unsub;
  });

  async function refreshInstalledThemes() {
    const themes = await themeManager.getAvailableThemes();
    currentThemes = themes.filter((t) => t !== null).map((t) => t.id);
    selectedThemeId = themeManager.getSelectedThemeId() || "";
    installedThemeColors = Object.fromEntries(
      themes.filter((t) => t != null).map((t) => [t.id, t.defaultColour]),
    );
  }

  async function loadBrowseThemes() {
    browseLoading = true;
    browseError = null;
    try {
      const q = searchTerm.trim();
      const res = await fetchCommunityThemes({
        sort: "popular",
        limit: 50,
        search: q.length > 0 ? q : undefined,
      });
      browseThemes = res.themes as Theme[];
    } catch (err) {
      browseError = err instanceof Error ? err.message : "Could not load community themes";
    } finally {
      browseLoading = false;
    }
  }

  async function loadMyThemes() {
    if (!cloudLoggedIn) return;
    myLoading = true;
    myError = null;
    try {
      const res = await fetchMyCustomThemes({
        limit: 50,
        status: statusFilter || undefined,
      });
      myThemes = res.themes;
    } catch (err) {
      myError = err instanceof Error ? err.message : "Could not load your themes";
    } finally {
      myLoading = false;
    }
  }

  async function loadEditableThemes() {
    const all = await themeManager.getAvailableThemes();
    editableThemes = all.filter(isLocalCustomTheme) as LoadedCustomTheme[];
  }

  async function openDetail(theme: CustomThemeOwner) {
    detailTheme = theme;
    detailFiles = [];
    detailError = null;
    editName = theme.name;
    editDescription = theme.description ?? "";
    editNotes = theme.submission_notes ?? "";
    replaceZipFile = null;
    showDeleteConfirm = false;
    detailLoading = true;
    try {
      const res = await fetchMyCustomThemeDetail(theme.id);
      detailTheme = res.theme;
      detailFiles = res.files;
      editName = res.theme.name;
      editDescription = res.theme.description ?? "";
      editNotes = res.theme.submission_notes ?? "";
    } catch (err) {
      detailError = err instanceof Error ? err.message : "Could not load theme details";
    } finally {
      detailLoading = false;
    }
  }

  function closeDetail() {
    detailTheme = null;
    detailFiles = [];
    detailError = null;
    showDeleteConfirm = false;
  }

  async function installCommunityTheme(themeId: string, meta: Theme) {
    const row = browseThemes.find((x) => x.id === themeId) ?? meta;
    await themeManager.downloadCommunityTheme({
      id: themeId,
      theme_json_url: row.theme_json_url,
      updated_at: row.updated_at,
    });
    await themeManager.setTheme(themeId);
    themeUpdates.triggerUpdate();
    await refreshInstalledThemes();
    void browser.runtime.sendMessage({ type: "cloudSettingsRequestDebouncedUpload" }).catch(() => {});
  }

  async function removeInstalledTheme(themeId: string) {
    await themeManager.deleteTheme(themeId);
    themeUpdates.triggerUpdate();
    await refreshInstalledThemes();
  }

  async function applyInstalledTheme(themeId: string) {
    await themeManager.setTheme(themeId);
    selectedThemeId = themeId;
    themeUpdates.triggerUpdate();
    void browser.runtime.sendMessage({ type: "cloudSettingsRequestDebouncedUpload" }).catch(() => {});
  }

  function handleApiError(err: unknown): string {
    if (err instanceof CustomThemeApiError) {
      if (err.status === 429) {
        return err.message.includes("pending") ? RATE_LIMIT_PENDING_MESSAGE : RATE_LIMIT_DAILY_MESSAGE;
      }
      if (err.validationErrors.length > 0) return err.validationErrors.join("\n");
      return err.message;
    }
    return err instanceof Error ? err.message : "Something went wrong";
  }

  async function runSubmit() {
    submitBusy = true;
    submitError = null;
    submitValidationErrors = [];
    try {
      let payload;
      if (selectedZipFile) {
        payload = mergeUploadPayload(await buildUploadPartsFromZipFile(selectedZipFile), submitNotes);
      } else if (selectedLocalThemeId) {
        const local = (await themeManager.getTheme(selectedLocalThemeId)) as LoadedCustomTheme | null;
        if (!local || !isLocalCustomTheme(local)) throw new Error("Select a custom theme to submit");
        payload = mergeUploadPayload(await buildUploadPartsFromLocalTheme(local), submitNotes);
      } else {
        throw new Error("Choose a ZIP file or a custom theme");
      }
      const res = await submitCustomTheme(payload);
      showSubmitModal = false;
      submitNotes = "";
      selectedZipFile = null;
      selectedLocalThemeId = "";
      innerTab = "mine";
      await loadMyThemes();
      await openDetail(res.theme);
    } catch (err) {
      if (err instanceof CustomThemeApiError && err.validationErrors.length > 0) {
        submitValidationErrors = err.validationErrors;
      }
      submitError = handleApiError(err);
    } finally {
      submitBusy = false;
    }
  }

  async function saveMetadata() {
    if (!detailTheme) return;
    detailBusy = true;
    detailError = null;
    try {
      const updated = await updateCustomThemeMetadata(detailTheme.id, {
        name: editName.trim() || undefined,
        description: editDescription.trim() || undefined,
        submission_notes: editNotes.trim() || undefined,
      });
      detailTheme = updated;
      await loadMyThemes();
    } catch (err) {
      detailError = handleApiError(err);
    } finally {
      detailBusy = false;
    }
  }

  async function runReplaceFiles() {
    if (!detailTheme || !replaceZipFile) return;
    detailBusy = true;
    detailError = null;
    try {
      const payload = mergeUploadPayload(await buildUploadPartsFromZipFile(replaceZipFile));
      const res = await replaceCustomThemeFiles(detailTheme.id, payload);
      detailTheme = res.theme;
      replaceZipFile = null;
      await loadMyThemes();
    } catch (err) {
      detailError = handleApiError(err);
    } finally {
      detailBusy = false;
    }
  }

  async function runDelete() {
    if (!detailTheme) return;
    detailBusy = true;
    detailError = null;
    try {
      await deleteCustomTheme(detailTheme.id);
      closeDetail();
      await loadMyThemes();
    } catch (err) {
      detailError = handleApiError(err);
    } finally {
      detailBusy = false;
      showDeleteConfirm = false;
    }
  }

  $effect(() => {
    if (innerTab === "browse") {
      void loadBrowseThemes();
    }
  });

  $effect(() => {
    searchTerm;
    if (innerTab === "browse") void loadBrowseThemes();
  });

  $effect(() => {
    if (innerTab === "mine" && cloudLoggedIn) void loadMyThemes();
  });

  $effect(() => {
    statusFilter;
    if (innerTab === "mine" && cloudLoggedIn) void loadMyThemes();
  });

  function navigateToSubmitTheme() {
    innerTab = "mine";
    void tick().then(() => openSubmitModal());
  }

  onMount(() => {
    themeUpdates.addListener(refreshInstalledThemes);
    void refreshInstalledThemes();

    if (consumeOpenCommunityThemeSubmit()) {
      navigateToSubmitTheme();
    }

    const onOpenCommunitySubmit = () => navigateToSubmitTheme();
    window.addEventListener(OPEN_COMMUNITY_SUBMIT_EVENT, onOpenCommunitySubmit);

    return () => {
      themeUpdates.removeListener(refreshInstalledThemes);
      window.removeEventListener(OPEN_COMMUNITY_SUBMIT_EVENT, onOpenCommunitySubmit);
    };
  });

  function openSubmitModal() {
    if (!cloudLoggedIn) {
      showSignInOverlay = true;
      return;
    }
    void loadEditableThemes();
    showSubmitModal = true;
    submitError = null;
    submitValidationErrors = [];
  }

  let filteredBrowse = $derived(
    browseThemes.filter((theme) => {
      const q = searchTerm.toLowerCase();
      if (!q) return true;
      return (
        (theme.name ?? "").toLowerCase().includes(q) ||
        (theme.description ?? "").toLowerCase().includes(q)
      );
    }),
  );
</script>

<div class="relative flex h-full min-h-0 flex-col overflow-hidden text-zinc-900 dark:text-white">
  <div class="shrink-0 border-b border-zinc-200/60 px-6 py-4 dark:border-zinc-700/50">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="inline-flex rounded-xl bg-zinc-200/80 p-1 dark:bg-zinc-800/80">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {innerTab === 'browse'
            ? 'bg-white text-zinc-900 shadow dark:bg-zinc-700 dark:text-white'
            : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}"
          onclick={() => (innerTab = "browse")}
        >
          Browse
        </button>
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {innerTab === 'mine'
            ? 'bg-white text-zinc-900 shadow dark:bg-zinc-700 dark:text-white'
            : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}"
          onclick={() => (innerTab = "mine")}
        >
          My themes
        </button>
      </div>
      {#if innerTab === "mine"}
        <button
          type="button"
          class="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          onclick={openSubmitModal}
        >
          Submit theme
        </button>
      {/if}
    </div>
    <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
      Community themes are user-submitted and moderated separately from the official theme store.
    </p>
  </div>

  <main class="min-h-0 flex-1 overflow-y-auto bg-zinc-50/80 px-6 py-6 dark:bg-zinc-900/40 md:px-8 lg:px-10">
    {#if innerTab === "browse"}
      {#if browseLoading}
        <div class="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each Array(6) as _, i (i)}
            <SkeletonLoader width="100%" height="200px" />
          {/each}
        </div>
      {:else if browseError}
        <div class="flex flex-col items-center justify-center py-24 text-center">
          <h2 class="text-2xl font-bold">Couldn&apos;t load community themes</h2>
          <p class="mt-3 text-zinc-600 dark:text-zinc-300">{browseError}</p>
          <button
            type="button"
            class="mt-6 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            onclick={() => void loadBrowseThemes()}
          >
            Try again
          </button>
        </div>
      {:else}
        <ThemeGrid
          themes={filteredBrowse}
          {searchTerm}
          setDisplayTheme={(theme) => (displayTheme = theme)}
          toggleFavorite={() => {}}
          isLoggedIn={false}
          installedThemeIds={currentThemes}
          variant="community"
        />
        {#if displayTheme}
          <ThemeModal
            currentThemes={currentThemes}
            allThemes={filteredBrowse}
            theme={displayTheme}
            {displayTheme}
            setDisplayTheme={(t) => (displayTheme = t)}
            {selectedThemeId}
            {installedThemeColors}
            variant="community"
            onInstall={async (themeId) => {
              if (displayTheme) await installCommunityTheme(themeId, displayTheme);
            }}
            onRemove={removeInstalledTheme}
            onApply={applyInstalledTheme}
          />
        {/if}
      {/if}
    {:else if !cloudLoggedIn}
      <div class="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <h2 class="text-2xl font-bold">Sign in to manage your themes</h2>
        <p class="mt-3 text-zinc-600 dark:text-zinc-300">
          Submit themes for review and track pending, approved, or rejected submissions.
        </p>
        <button
          type="button"
          class="mt-6 rounded-lg bg-zinc-900 px-5 py-2.5 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          onclick={() => (showSignInOverlay = true)}
        >
          Sign in with BetterSEQTA Cloud
        </button>
      </div>
    {:else}
      <div class="mb-4 flex flex-wrap gap-2">
        {#each ["", "pending", "approved", "rejected"] as status (status)}
          <button
            type="button"
            class="rounded-full px-3 py-1 text-sm font-medium transition {statusFilter === status
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300'}"
            onclick={() => (statusFilter = status as typeof statusFilter)}
          >
            {status === "" ? "All" : formatCustomThemeStatus(status)}
          </button>
        {/each}
      </div>

      {#if myLoading}
        <div class="grid grid-cols-1 gap-3">
          {#each Array(4) as _, i (i)}
            <SkeletonLoader width="100%" height="72px" />
          {/each}
        </div>
      {:else if myError}
        <p class="text-red-600 dark:text-red-400">{myError}</p>
      {:else if myThemes.length === 0}
        <div class="py-16 text-center">
          <p class="text-lg text-zinc-600 dark:text-zinc-300">No submissions yet.</p>
          <button
            type="button"
            class="mt-4 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            onclick={openSubmitModal}
          >
            Submit your first theme
          </button>
        </div>
      {:else}
        <ul class="space-y-3">
          {#each myThemes as theme (theme.id)}
            <li>
              <button
                type="button"
                class="flex w-full items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
                onclick={() => void openDetail(theme)}
              >
                {#if theme.coverImage}
                  <img
                    src={theme.coverImage}
                    alt=""
                    class="h-14 w-20 shrink-0 rounded-lg object-cover"
                  />
                {:else}
                  <div class="h-14 w-20 shrink-0 rounded-lg bg-zinc-200 dark:bg-zinc-700"></div>
                {/if}
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-semibold text-zinc-900 dark:text-white">{theme.name}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-semibold {statusBadgeClass(theme.status)}">
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
  </main>

  {#if showSignInOverlay}
    <SignInToFavoriteModal onClose={() => (showSignInOverlay = false)} />
  {/if}

  {#if showSubmitModal}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onclick={(e) => {
        if (e.target === e.currentTarget && !submitBusy) showSubmitModal = false;
      }}
    >
      <div
        class="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-theme-title"
      >
        <h2 id="submit-theme-title" class="text-xl font-bold">Submit a theme</h2>
        <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Upload a ZIP with theme.json or submit one of your custom themes.
        </p>

        <div class="mt-4 space-y-4">
          <label class="block">
            <span class="text-sm font-medium">Theme ZIP</span>
            <input
              type="file"
              accept=".zip,application/zip"
              class="mt-1 block w-full text-sm"
              onchange={(e) => {
                const file = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
                selectedZipFile = file;
                if (file) selectedLocalThemeId = "";
              }}
            />
          </label>

          <div class="text-center text-xs text-zinc-400">or</div>

          <label class="block">
            <span class="text-sm font-medium">From custom themes</span>
            <select
              class="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              bind:value={selectedLocalThemeId}
              onchange={() => {
                if (selectedLocalThemeId) selectedZipFile = null;
              }}
            >
              <option value="">Select a theme…</option>
              {#each editableThemes as t (t.id)}
                <option value={t.id}>{t.name}</option>
              {/each}
            </select>
          </label>

          <label class="block">
            <span class="text-sm font-medium">Notes for reviewers (optional)</span>
            <textarea
              class="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              rows="3"
              bind:value={submitNotes}
              placeholder="Anything reviewers should know…"
            ></textarea>
          </label>

          {#if submitValidationErrors.length > 0}
            <ul class="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              {#each submitValidationErrors as msg (msg)}
                <li>{msg}</li>
              {/each}
            </ul>
          {/if}
          {#if submitError}
            <p class="text-sm text-red-600 dark:text-red-400 whitespace-pre-line">{submitError}</p>
          {/if}
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            disabled={submitBusy}
            onclick={() => (showSubmitModal = false)}
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            disabled={submitBusy}
            onclick={() => void runSubmit()}
          >
            {submitBusy ? "Uploading…" : "Submit for review"}
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if detailTheme}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onclick={(e) => {
        if (e.target === e.currentTarget && !detailBusy) closeDetail();
      }}
    >
      <div
        class="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-800"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold">{detailTheme.name}</h2>
            <span class="mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold {statusBadgeClass(detailTheme.status)}">
              {formatCustomThemeStatus(detailTheme.status)}
            </span>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            aria-label="Close"
            onclick={closeDetail}
          >
            ✕
          </button>
        </div>

        {#if detailTheme.status === "rejected" && detailTheme.rejection_reason}
          <div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
            <p class="font-semibold">Rejection reason</p>
            <p class="mt-1 whitespace-pre-wrap">{detailTheme.rejection_reason}</p>
          </div>
        {/if}

        {#if detailLoading}
          <div class="py-8"><SkeletonLoader width="100%" height="120px" /></div>
        {:else}
          <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-zinc-500">Submitted</dt>
              <dd>{formatThemeDate(detailTheme.created_at)}</dd>
            </div>
            <div>
              <dt class="text-zinc-500">Last updated</dt>
              <dd>{formatThemeDate(detailTheme.updated_at)}</dd>
            </div>
            {#if detailTheme.reviewed_at}
              <div>
                <dt class="text-zinc-500">Reviewed</dt>
                <dd>{formatThemeDate(detailTheme.reviewed_at)}</dd>
              </div>
            {/if}
            {#if detailTheme.slug}
              <div>
                <dt class="text-zinc-500">Slug</dt>
                <dd class="truncate">{detailTheme.slug}</dd>
              </div>
            {/if}
          </dl>

          {#if detailFiles.length > 0}
            <div class="mt-4">
              <h3 class="text-sm font-semibold">Files</h3>
              <ul class="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                {#each detailFiles as file (file.id)}
                  <li>{file.file_path} ({file.file_size.toLocaleString()} bytes)</li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if canEditCustomTheme(detailTheme)}
            <div class="mt-6 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <h3 class="font-semibold">Edit metadata</h3>
              <input
                class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                bind:value={editName}
                placeholder="Name"
              />
              <textarea
                class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                rows="2"
                bind:value={editDescription}
                placeholder="Description"
              ></textarea>
              <textarea
                class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                rows="2"
                bind:value={editNotes}
                placeholder="Submission notes"
              ></textarea>
              <button
                type="button"
                class="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium dark:bg-zinc-700"
                disabled={detailBusy}
                onclick={() => void saveMetadata()}
              >
                Save metadata
              </button>

              <h3 class="pt-2 font-semibold">Replace files</h3>
              <p class="text-sm text-zinc-500">Uploading new files resets review to pending.</p>
              <input
                type="file"
                accept=".zip,application/zip"
                class="block w-full text-sm"
                onchange={(e) => {
                  replaceZipFile = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
                }}
              />
              <button
                type="button"
                class="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                disabled={detailBusy || !replaceZipFile}
                onclick={() => void runReplaceFiles()}
              >
                Upload revised files
              </button>
            </div>
          {:else if detailTheme.status === "approved"}
            <p class="mt-4 text-sm text-zinc-500">
              Approved themes cannot be edited. Delete and re-submit if you need to publish an update.
            </p>
          {/if}

          {#if detailError}
            <p class="mt-4 text-sm text-red-600 dark:text-red-400 whitespace-pre-line">{detailError}</p>
          {/if}

          <div class="mt-6 flex flex-wrap justify-between gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
            {#if showDeleteConfirm}
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm text-red-600 dark:text-red-400">Delete permanently?</span>
                <button
                  type="button"
                  class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
                  disabled={detailBusy}
                  onclick={() => void runDelete()}
                >
                  Confirm delete
                </button>
                <button
                  type="button"
                  class="rounded-lg px-3 py-1.5 text-sm"
                  onclick={() => (showDeleteConfirm = false)}
                >
                  Cancel
                </button>
              </div>
            {:else}
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                onclick={() => (showDeleteConfirm = true)}
              >
                Delete theme
              </button>
            {/if}
            <button
              type="button"
              class="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium dark:bg-zinc-700"
              onclick={closeDetail}
            >
              Close
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
