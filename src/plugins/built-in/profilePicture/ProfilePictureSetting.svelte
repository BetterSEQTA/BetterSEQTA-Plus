<script lang="ts">
  import { onMount } from "svelte";
  import browser from "@/lib/browser";
  import { cloudAuth } from "@/seqta/utils/cloudAuth";
  import { revokePfpUrl } from "@/seqta/utils/cloudPfpCache";
  import { uploadCloudProfilePicture } from "@/seqta/utils/cloudPfpSync";
  import { pluginSettingsStore } from "@/interface/pages/settings/pluginSettingsState.svelte";
  import { loadPicture, REVISION_KEY, setLocalPicture } from "./picture";

  let cloud = $state(cloudAuth.state);
  let src = $state<string | null>(null);
  let removable = $state(false);
  let busy = $state(false);
  let error = $state<string>();
  let input = $state<HTMLInputElement>();
  let revision = $state(0);
  let version = 0;

  const useCloud = $derived(
    pluginSettingsStore.values["profile-picture"]?.useCloudPfp === true && cloud.isLoggedIn,
  );

  $effect(() => {
    const cloudUser = useCloud ? cloud.user : null;
    void revision;
    const current = ++version;
    void loadPicture(cloudUser).then((url) => {
      if (current !== version) return revokePfpUrl(url);
      revokePfpUrl(src);
      src = url;
      removable = !!url && !cloudUser;
    });
  });

  onMount(() => {
    const unsubscribe = cloudAuth.subscribe((state) => (cloud = state));
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "local" && changes[REVISION_KEY]) revision++;
    };
    browser.storage.onChanged.addListener(onStorage);
    return () => {
      version++;
      unsubscribe();
      browser.storage.onChanged.removeListener(onStorage);
      revokePfpUrl(src);
    };
  });

  async function save(file: File | undefined) {
    if (!file?.type.startsWith("image/")) return;
    error = undefined;
    if (!useCloud) return setLocalPicture(file);
    busy = true;
    const result = await uploadCloudProfilePicture(file);
    busy = false;
    if (!result.success) error = result.error;
  }
</script>

<div class="flex flex-col gap-1 items-end shrink-0">
  <div class="flex gap-2 items-center">
    <button
      type="button"
      class="flex justify-center items-center rounded-md size-8 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 dark:text-white {removable
        ? ''
        : 'invisible'}"
      aria-label="Remove profile picture"
      onclick={() => setLocalPicture(null)}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
    </button>
    <div
      class="flex overflow-hidden justify-center items-center rounded-full size-10 bg-zinc-200 dark:bg-zinc-700 text-zinc-400"
    >
      {#if src}
        <img {src} alt="Your avatar" class="object-cover size-full" />
      {:else}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z" /></svg>
      {/if}
    </div>
    <button
      type="button"
      class="flex gap-1.5 items-center px-3 h-8 text-xs rounded-md border border-dashed transition border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 text-nowrap disabled:opacity-50"
      disabled={busy}
      onclick={() => input?.click()}
      ondragover={(event) => event.preventDefault()}
      ondrop={(event) => {
        event.preventDefault();
        void save(event.dataTransfer?.files[0]);
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
      Upload
    </button>
    <input
      type="file"
      accept="image/*"
      class="hidden"
      bind:this={input}
      onchange={() => {
        void save(input?.files?.[0]);
        if (input) input.value = "";
      }}
    />
  </div>
  {#if error}
    <p class="max-w-48 text-xs text-right text-red-500">{error}</p>
  {/if}
</div>
