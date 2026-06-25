<script lang="ts">
  import localforage from 'localforage'
  import { onMount } from 'svelte'
  import browser from 'webextension-polyfill'
  import CloudPfpAvatar from '@/interface/components/CloudPfpAvatar.svelte'
  import { cloudAuth } from '@/seqta/utils/CloudAuth'
  import {
    clearCloudProfilePicture,
    isUseCloudPfpEnabled,
    notifyProfilePictureChanged,
    pullCloudProfilePictureFromServer,
    syncLocalProfilePictureToCloud,
  } from '@/seqta/utils/cloudPfpSync'

  let value = $state<string | undefined>(undefined)
  let fileInput = $state<HTMLInputElement | undefined>(undefined)
  let dragging = $state(false)
  let blobUrl = $state<string | undefined>(undefined)
  let useCloudPfp = $state(false)
  let refreshingCloud = $state(false)
  let cloudRefreshError = $state<string | undefined>(undefined)

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
    const onStorage = (
      changes: Record<string, browser.Storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === 'local' && changes['plugin.profile-picture.settings']) {
        void load()
      }
    }
    browser.storage.onChanged.addListener(onStorage)
    return () => browser.storage.onChanged.removeListener(onStorage)
  })

  async function afterProfilePictureChange() {
    window.dispatchEvent(new Event('profile-picture-updated'))
    if (await isUseCloudPfpEnabled()) {
      await syncLocalProfilePictureToCloud()
    }
    await notifyProfilePictureChanged()
  }

  async function refreshCloudPfp() {
    cloudRefreshError = undefined
    refreshingCloud = true
    const result = await pullCloudProfilePictureFromServer()
    refreshingCloud = false
    if (!result.success) {
      cloudRefreshError = result.error ?? 'Could not refresh cloud photo'
    }
  }

  function triggerSelect() {
    fileInput?.click()
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return

    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
    }

    await store.setItem('profile-picture', file)
    const newBlobUrl = URL.createObjectURL(file)
    value = newBlobUrl
    blobUrl = newBlobUrl
    await afterProfilePictureChange()
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
    if (await isUseCloudPfpEnabled()) {
      await clearCloudProfilePicture()
    }
    await afterProfilePictureChange()
  }
</script>

<div class="flex flex-col gap-2 items-end">
  {#if useCloudPfp}
    <div class="flex gap-2 items-center">
      <CloudPfpAvatar user={cloudAuth.state.user} class="object-cover rounded-full size-10" />
      <button
        type="button"
        class="px-2 py-1 text-xs rounded-md bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50"
        disabled={refreshingCloud}
        onclick={() => refreshCloudPfp()}
      >
        {refreshingCloud ? 'Refreshing…' : 'Refresh from cloud'}
      </button>
    </div>
    {#if cloudRefreshError}
      <p class="text-xs text-red-500">{cloudRefreshError}</p>
    {/if}
  {/if}

  <div
    class="flex relative justify-center items-center rounded-lg cursor-pointer select-none border-zinc-300 dark:border-zinc-600 bg-white/20 dark:bg-zinc-800/30"
    onclick={() => value ? null : triggerSelect()}
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
      <img src={value} alt="Profile" class="object-cover rounded-full size-10" />
      <button
        class="flex justify-center items-center m-1 text-lg dark:text-white size-7"
        onclick={(e) => {
          e.stopPropagation()
          removeImage()
        }}
      >&#215;</button>
    {:else}
      <div class="flex gap-2 items-center px-3 py-1 text-xs rounded-lg border border-dashed transition border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300">
        <span class="text-lg font-IconFamily">{'\ued47'}</span>
        <span>Upload</span>
      </div>
    {/if}
    <input type="file" accept="image/*" class="hidden" bind:this={fileInput} onchange={onFileChange} />
    {#if dragging}
      <div class="absolute inset-0 rounded-full bg-zinc-200/40 dark:bg-zinc-700/40"></div>
    {/if}
  </div>
</div>
