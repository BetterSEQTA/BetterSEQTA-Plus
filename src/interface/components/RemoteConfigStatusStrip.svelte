<script lang="ts">
  import {
    getRemoteConfigSnapshot,
    isEffectiveBsplusEnabled,
    isRemoteKillActive,
    setLocalOverrideOnoff,
  } from "@/seqta/utils/remoteConfig/runtime";
  import { getRemoteStatusMessage } from "@/seqta/utils/remoteConfig/apply";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import { requestSettingsDestination } from "@/seqta/utils/settingsNavigation";
  import browser from "webextension-polyfill";
  import { onMount } from "svelte";

  let localOverride = $state(false);

  const snapshot = $derived(getRemoteConfigSnapshot());
  const killActive = $derived(isRemoteKillActive());
  const statusMessage = $derived(getRemoteStatusMessage(snapshot));
  const allowOverride = $derived(snapshot.global.allowLocalOverride !== false);
  const showStrip = $derived(
    killActive ||
      !!statusMessage ||
      !!snapshot.global.maintenance?.body ||
      !!snapshot.global.maintenance?.title,
  );

  onMount(() => {
    void browser.storage.local.get("bsplus_local_override_onoff").then((stored) => {
      localOverride = stored.bsplus_local_override_onoff === true;
    });
  });

  async function enableLocalRun() {
    await setLocalOverrideOnoff(true);
    localOverride = true;
    location.reload();
  }

  function openGeneralSettings() {
    requestSettingsDestination({ section: "general" });
  }
</script>

{#if showStrip}
  <div
    class="shrink-0 border-b border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-50"
    role="status"
  >
    <p class="leading-relaxed">
      {statusMessage ??
        "BetterSEQTA+ is temporarily limited. You can review settings for details."}
    </p>
    <div class="mt-2 flex flex-wrap items-center gap-2">
      {#if killActive && !isEffectiveBsplusEnabled() && allowOverride}
        <button
          type="button"
          class="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
          onclick={enableLocalRun}
        >
          Run locally anyway
        </button>
      {:else if killActive && localOverride && isEffectiveBsplusEnabled()}
        <span class="text-xs text-amber-800 dark:text-amber-200/90">
          Running locally (override). Reload SEQTA after the operator clears the kill switch.
        </span>
      {/if}
      <button
        type="button"
        class="rounded-lg border border-amber-300/80 px-3 py-1.5 text-xs font-medium transition-colors duration-200 hover:bg-amber-100/80 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:border-amber-800 dark:hover:bg-amber-900/50 dark:focus:ring-offset-zinc-900"
        onclick={openGeneralSettings}
      >
        General settings
      </button>
      {#if $settingsState.onoff === false}
        <span class="text-xs opacity-80">Master toggle is off in General.</span>
      {/if}
    </div>
  </div>
{/if}
