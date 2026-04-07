<script lang="ts">
  import browser from "webextension-polyfill";
  import { cloudAuth } from "@/seqta/utils/CloudAuth";
  import DisclaimerModal from "./DisclaimerModal.svelte";
  import Button from "./Button.svelte";

  let cloudState = $state(cloudAuth.state);
  let busy = $state(false);
  let statusMessage = $state<string | null>(null);
  let statusError = $state<string | null>(null);
  let lastUploadAt = $state<string | null>(null);
  let lastDownloadAt = $state<string | null>(null);
  let showRestoreConfirm = $state(false);

  $effect(() => {
    const unsub = cloudAuth.subscribe((s) => {
      cloudState = s;
    });
    return unsub;
  });

  function formatNow(): string {
    return new Date().toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  async function upload() {
    const token = await cloudAuth.getStoredToken();
    if (!token) return;
    busy = true;
    statusError = null;
    statusMessage = null;
    try {
      const res = (await browser.runtime.sendMessage({
        type: "cloudSettingsUpload",
        token,
      })) as { success?: boolean; error?: string };
      if (res?.success) {
        statusMessage = "Settings saved to the cloud.";
        lastUploadAt = formatNow();
      } else {
        statusError = res?.error ?? "Upload failed";
      }
    } catch (e) {
      statusError = e instanceof Error ? e.message : "Upload failed";
    } finally {
      busy = false;
    }
  }

  function promptDownload() {
    showRestoreConfirm = true;
  }

  async function confirmDownload() {
    showRestoreConfirm = false;
    const token = await cloudAuth.getStoredToken();
    if (!token) return;
    busy = true;
    statusError = null;
    statusMessage = null;
    try {
      const res = (await browser.runtime.sendMessage({
        type: "cloudSettingsDownload",
        token,
      })) as { success?: boolean; error?: string; notFound?: boolean };
      if (res?.success) {
        statusMessage = "Settings restored from the cloud. SEQTA tabs were reloaded.";
        lastDownloadAt = formatNow();
      } else {
        statusError = res?.error ?? "Download failed";
      }
    } catch (e) {
      statusError = e instanceof Error ? e.message : "Download failed";
    } finally {
      busy = false;
    }
  }
</script>

<div
  class="w-full rounded-xl border border-zinc-200/60 bg-zinc-50/80 px-4 py-2.5 dark:border-zinc-700/50 dark:bg-zinc-900/40"
>
  <h3 class="text-xs font-bold text-zinc-800 dark:text-zinc-100">Cloud settings backup</h3>
  <p class="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
    Upload copies this browser’s BetterSEQTA+ settings to your account. Download replaces local settings with the
    cloud copy (your sign-in stays on this device).
  </p>

  <div class="mt-2 flex flex-wrap gap-2">
    <Button
      text={busy ? "Please wait…" : "Upload to cloud"}
      onClick={upload}
      disabled={busy || !cloudState.isLoggedIn}
    />
    <Button
      text={busy ? "Please wait…" : "Download from cloud"}
      onClick={promptDownload}
      disabled={busy || !cloudState.isLoggedIn}
    />
  </div>

  {#if !cloudState.isLoggedIn}
    <p class="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
      Sign in from the BetterSEQTA Cloud header above to sync settings.
    </p>
  {/if}

  {#if statusMessage}
    <p class="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">{statusMessage}</p>
  {/if}
  {#if statusError}
    <p class="mt-2 text-[11px] text-red-600 dark:text-red-400">{statusError}</p>
  {/if}
  {#if lastUploadAt || lastDownloadAt}
    <p class="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
      {#if lastUploadAt}<span>Last upload: {lastUploadAt}</span>{/if}
      {#if lastUploadAt && lastDownloadAt}<span class="mx-1">·</span>{/if}
      {#if lastDownloadAt}<span>Last download: {lastDownloadAt}</span>{/if}
    </p>
  {/if}
</div>

{#if showRestoreConfirm}
  <DisclaimerModal
    title="Restore from cloud?"
    message="This will replace BetterSEQTA+ settings in this browser with your cloud backup. Your BetterSEQTA Cloud sign-in on this device will be kept. Continue?"
    onConfirm={confirmDownload}
    onCancel={() => (showRestoreConfirm = false)}
  />
{/if}
