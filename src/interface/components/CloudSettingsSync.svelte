<script lang="ts">
  import browser from "webextension-polyfill";
  import { cloudAuth } from "@/seqta/utils/CloudAuth";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import Button from "./Button.svelte";
  import Switch from "./Switch.svelte";

  let { showDisclaimer } = $props<{
    showDisclaimer: (onConfirm: () => void, onCancel: () => void) => void;
  }>();

  let cloudState = $state(cloudAuth.state);
  let busy = $state(false);
  let statusMessage = $state<string | null>(null);
  let statusError = $state<string | null>(null);

  $effect(() => {
    const unsub = cloudAuth.subscribe((s) => {
      cloudState = s;
    });
    return unsub;
  });

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
        statusMessage = "Settings uploaded.";
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
    showDisclaimer(confirmDownload, () => {});
  }

  async function confirmDownload() {
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
        statusMessage = "Settings restored.";
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

{#if cloudState.isLoggedIn}
  <div class="flex flex-col gap-2.5">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-[11px] font-semibold text-zinc-800 dark:text-zinc-100">Automatic sync</p>
        <p class="text-[10px] text-zinc-500 dark:text-zinc-400">Syncs settings when SEQTA loads and when you make changes</p>
      </div>
      <div class="shrink-0">
        <Switch
          state={$settingsState.autoCloudSettingsSync !== false}
          onChange={(isOn: boolean) => (settingsState.autoCloudSettingsSync = isOn)}
        />
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <Button
        text={busy ? "Please wait\u2026" : "Upload"}
        onClick={upload}
        disabled={busy}
      />
      <Button
        text={busy ? "Please wait\u2026" : "Download"}
        onClick={promptDownload}
        disabled={busy}
      />
    </div>

    {#if statusMessage}
      <p class="text-[11px] text-emerald-600 dark:text-emerald-400">{statusMessage}</p>
    {/if}
    {#if statusError}
      <p class="text-[11px] text-red-600 dark:text-red-400">{statusError}</p>
    {/if}

    <p class="text-[10px] text-zinc-400 dark:text-zinc-500">
      Passwords and tokens are never synced.
      <a
        href="https://betterseqta.org/privacy"
        target="_blank"
        rel="noopener noreferrer"
        class="font-medium text-emerald-600 underline decoration-emerald-600/50 underline-offset-2 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 rounded-sm"
      >Privacy policy</a>
    </p>
  </div>
{/if}
