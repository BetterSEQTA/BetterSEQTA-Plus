<script lang="ts">
  import SkeletonLoader from "@/interface/components/SkeletonLoader.svelte";
  import ModalFrame from "./ModalFrame.svelte";
  import type { CommunityThemesState } from "@/interface/hooks/communityThemesState.svelte";
  import {
    canEditCustomTheme,
    formatCustomThemeStatus,
    formatThemeDate,
    statusBadgeClass,
  } from "@/seqta/utils/customThemes/client";

  let { communityState }: { communityState: CommunityThemesState } = $props();

  const theme = $derived(communityState.detailTheme);
</script>

<ModalFrame
  open={theme != null}
  busy={communityState.detailBusy}
  maxWidthClass="max-w-2xl"
  onClose={() => communityState.closeDetail()}
>
  {#if theme}
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold">{theme.name}</h2>
        <span
          class="mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold {statusBadgeClass(theme.status)}"
        >
          {formatCustomThemeStatus(theme.status)}
        </span>
      </div>
      <button
        type="button"
        class="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700"
        aria-label="Close"
        onclick={() => communityState.closeDetail()}
      >
        ✕
      </button>
    </div>

    {#if theme.status === "rejected" && theme.rejection_reason}
      <div
        class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
      >
        <p class="font-semibold">Rejection reason</p>
        <p class="mt-1 whitespace-pre-wrap">{theme.rejection_reason}</p>
      </div>
    {/if}

    {#if communityState.detailLoading}
      <div class="py-8"><SkeletonLoader width="100%" height="120px" /></div>
    {:else}
      <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt class="text-zinc-500">Submitted</dt>
          <dd>{formatThemeDate(theme.created_at)}</dd>
        </div>
        <div>
          <dt class="text-zinc-500">Last updated</dt>
          <dd>{formatThemeDate(theme.updated_at)}</dd>
        </div>
        {#if theme.reviewed_at}
          <div>
            <dt class="text-zinc-500">Reviewed</dt>
            <dd>{formatThemeDate(theme.reviewed_at)}</dd>
          </div>
        {/if}
        {#if theme.slug}
          <div>
            <dt class="text-zinc-500">Slug</dt>
            <dd class="truncate">{theme.slug}</dd>
          </div>
        {/if}
      </dl>

      {#if communityState.detailFiles.length > 0}
        <div class="mt-4">
          <h3 class="text-sm font-semibold">Files</h3>
          <ul class="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {#each communityState.detailFiles as file (file.id)}
              <li>{file.file_path} ({file.file_size.toLocaleString()} bytes)</li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if canEditCustomTheme(theme)}
        <div class="mt-6 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <h3 class="font-semibold">Edit metadata</h3>
          <input
            class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            bind:value={communityState.editName}
            placeholder="Name"
          />
          <textarea
            class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            rows="2"
            bind:value={communityState.editDescription}
            placeholder="Description"
          ></textarea>
          <textarea
            class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            rows="2"
            bind:value={communityState.editNotes}
            placeholder="Submission notes"
          ></textarea>
          <button
            type="button"
            class="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium dark:bg-zinc-700"
            disabled={communityState.detailBusy}
            onclick={() => void communityState.saveMetadata()}
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
              communityState.replaceZipFile = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
            }}
          />
          <button
            type="button"
            class="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            disabled={communityState.detailBusy || !communityState.replaceZipFile}
            onclick={() => void communityState.runReplaceFiles()}
          >
            Upload revised files
          </button>
        </div>
      {:else if theme.status === "approved"}
        <p class="mt-4 text-sm text-zinc-500">
          Approved themes cannot be edited. Delete and re-submit if you need to publish an update.
        </p>
      {/if}

      {#if communityState.detailError}
        <p class="mt-4 whitespace-pre-line text-sm text-red-600 dark:text-red-400">
          {communityState.detailError}
        </p>
      {/if}

      <div
        class="mt-6 flex flex-wrap justify-between gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700"
      >
        {#if communityState.showDeleteConfirm}
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm text-red-600 dark:text-red-400">Delete permanently?</span>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
              disabled={communityState.detailBusy}
              onclick={() => void communityState.runDelete()}
            >
              Confirm delete
            </button>
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-sm"
              onclick={() => (communityState.showDeleteConfirm = false)}
            >
              Cancel
            </button>
          </div>
        {:else}
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            onclick={() => (communityState.showDeleteConfirm = true)}
          >
            Delete theme
          </button>
        {/if}
        <button
          type="button"
          class="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium dark:bg-zinc-700"
          onclick={() => communityState.closeDetail()}
        >
          Close
        </button>
      </div>
    {/if}
  {/if}
</ModalFrame>
