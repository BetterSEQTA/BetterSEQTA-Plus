<script lang="ts">
  import RotateCwIcon from "@lucide/svelte/icons/rotate-cw";
  import UploadIcon from "@lucide/svelte/icons/upload";
  import localforage from 'localforage'
  import { onMount } from 'svelte'
  import browser from '@/lib/browser'
  import CloudPfpAvatar from '@/interface/components/CloudPfpAvatar.svelte'
  import { cloudAuth } from '@/seqta/utils/CloudAuth'
  import {
    clearCloudProfilePicture,
    isUseCloudPfpEnabled,
    notifyProfilePictureChanged,
    pullCloudProfilePictureFromServer,
    revertCloudProfilePicture,
    syncLocalProfilePictureToCloud,
    uploadCloudProfilePicture,
  } from '@/seqta/utils/cloudPfpSync'

  let value = $state<string | undefined>(undefined)
  let fileInput = $state<HTMLInputElement | undefined>(undefined)
  let cloudFileInput = $state<HTMLInputElement | undefined>(undefined)
  let dragging = $state(false)
  let blobUrl = $state<string | undefined>(undefined)
  let useCloudPfp = $state(false)
  let cloudState = $state(cloudAuth.state)
  let cloudBusy = $state(false)
  let cloudError = $state<string | undefined>(undefined)

  const store = localforage.createInstance({
    name: 'profile-picture-store',
    storeName: 'profilePicture',
  })

  async function load() {
    useCloudPfp = await isUseCloudPfpEnabled()
    const blob = await store.getItem<Blob>('profile-picture')
    if (blob && blob instanceof Blob) {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      blobUrl = URL.createObjectURL(blob)
      value = blobUrl
    } else {
      value = undefined
    }
  }

  onMount(() => {
    void load()
    const unsub = cloudAuth.subscribe((s) => { cloudState = s })
    const onStorage = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === 'local' && changes['plugin.profile-picture.settings']) void load()
    }
    browser.storage.onChanged.addListener(onStorage)
    return () => {
      browser.storage.onChanged.removeListener(onStorage)
      unsub()
    }
  })

  async function afterProfilePictureChange() {
    window.dispatchEvent(new Event('profile-picture-updated'))
    if (await isUseCloudPfpEnabled()) await syncLocalProfilePictureToCloud()
    await notifyProfilePictureChanged()
  }

  async function runCloud(action: () => Promise<{ success: boolean; error?: string }>) {
    cloudError = undefined
    cloudBusy = true
    const result = await action()
    cloudBusy = false
    if (!result.success) cloudError = result.error
  }

  function triggerSelect() {
    fileInput?.click()
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file?.type.startsWith('image/')) return

    if (blobUrl) URL.revokeObjectURL(blobUrl)
    await store.setItem('profile-picture', file)
    blobUrl = URL.createObjectURL(file)
    value = blobUrl
    await afterProfilePictureChange()
  }

  async function onCloudFileChange() {
    const file = cloudFileInput?.files?.[0]
    if (cloudFileInput) cloudFileInput.value = ''
    if (!file) return
    await runCloud(() => uploadCloudProfilePicture(file))
  }

  function onFileChange() {
    handleFiles(fileInput?.files || null)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    dragging = false
    handleFiles(event.dataTransfer?.files || null)
  }

  async function removeImage() {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      blobUrl = undefined
    }
    value = undefined
    await store.removeItem('profile-picture')
    if (await isUseCloudPfpEnabled()) await clearCloudProfilePicture()
    await afterProfilePictureChange()
  }
</script>

<div class="flex flex-col items-end gap-1 shrink-0">
  <div class="flex items-center gap-2">
    {#if useCloudPfp && cloudState.isLoggedIn}
      <CloudPfpAvatar user={cloudState.user} class="object-cover rounded-full size-10 shrink-0" />
      <button
        type="button"
        class="flex justify-center items-center shrink-0 rounded-md size-8 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50"
        disabled={cloudBusy}
        title="Refresh from cloud"
        aria-label="Refresh from cloud"
        onclick={() => runCloud(pullCloudProfilePictureFromServer)}
      >
        <RotateCwIcon size="1em" class="text-lg dark:text-white" />
      </button>
      <div class="w-px h-8 shrink-0 bg-zinc-300 dark:bg-zinc-600" aria-hidden="true"></div>
    {/if}

    <div
      class="relative shrink-0 cursor-pointer select-none"
      onclick={() => (value ? null : triggerSelect())}
      ondragover={(e) => { e.stopPropagation(); dragging = true }}
      ondragleave={() => dragging = false}
      ondrop={onDrop}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          triggerSelect()
        }
      }}
      role="button"
      tabindex="0"
    >
      {#if value}
        <div class="flex items-center rounded-lg bg-zinc-200 dark:bg-zinc-800">
          <img src={value} alt="Local profile" class="object-cover rounded-full size-10" />
          <button
            class="flex justify-center items-center m-1 text-lg dark:text-white size-7"
            aria-label="Remove local profile picture"
            onclick={(e) => {
              e.stopPropagation()
              removeImage()
            }}
          >&#215;</button>
        </div>
      {:else}
        <div class="flex gap-2 items-center px-3 py-1 text-xs rounded-lg border border-dashed transition border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 text-nowrap">
          <UploadIcon size="1em" class="text-lg" />
          <span>Upload</span>
        </div>
      {/if}
      <input type="file" accept="image/*" class="hidden" bind:this={fileInput} onchange={onFileChange} />
      {#if dragging}
        <div class="absolute inset-0 rounded-lg bg-zinc-200/40 dark:bg-zinc-700/40"></div>
      {/if}
    </div>
  </div>

  {#if cloudState.isLoggedIn}
    <div class="flex flex-wrap gap-2 justify-end items-center max-w-56">
      <button
        type="button"
        class="text-xs text-zinc-600 dark:text-zinc-300 hover:underline disabled:opacity-50"
        disabled={cloudBusy}
        onclick={() => cloudFileInput?.click()}
      >
        Cloud upload
      </button>
      <button
        type="button"
        class="text-xs text-zinc-600 dark:text-zinc-300 hover:underline disabled:opacity-50"
        disabled={cloudBusy || !cloudState.user?.pfpUrl}
        onclick={() => runCloud(clearCloudProfilePicture)}
      >
        Clear cloud
      </button>
      {#each cloudState.user?.pfpHistory ?? [] as entry (entry.id)}
        <button
          type="button"
          class="size-7 overflow-hidden rounded-full ring-1 ring-zinc-300 dark:ring-zinc-600 disabled:opacity-50"
          title="Restore"
          disabled={cloudBusy}
          onclick={() => runCloud(() => revertCloudProfilePicture(entry.id))}
        >
          <img src={entry.r2Key} alt="" class="object-cover size-full" />
        </button>
      {/each}
      <input type="file" accept="image/*" class="hidden" bind:this={cloudFileInput} onchange={onCloudFileChange} />
    </div>
  {/if}

  {#if cloudError}
    <p class="max-w-48 text-xs text-right text-red-500">{cloudError}</p>
  {/if}
</div>
