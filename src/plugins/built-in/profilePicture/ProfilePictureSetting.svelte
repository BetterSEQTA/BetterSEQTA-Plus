<script lang="ts">
  import UploadIcon from "@lucide/svelte/icons/upload";
  import UserIcon from "@lucide/svelte/icons/user";
  import XIcon from "@lucide/svelte/icons/x";
  import { onMount } from "svelte";
  import browser from "@/lib/browser";
  import { cloudAuth } from "@/seqta/utils/CloudAuth";
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
      class="flex justify-center items-center rounded-md size-8 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 dark:text-white {removable ? '' : 'invisible'}"
      aria-label="Remove profile picture"
      onclick={() => setLocalPicture(null)}
    >
      <XIcon size={16} />
    </button>
    <div
      class="flex overflow-hidden justify-center items-center rounded-full size-10 bg-zinc-200 dark:bg-zinc-700 text-zinc-400"
    >
      {#if src}
        <img {src} alt="Your avatar" class="object-cover size-full" />
      {:else}
        <UserIcon size={20} />
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
      <UploadIcon size={16} />
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
