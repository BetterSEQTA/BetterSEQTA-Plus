<script lang="ts">
  import Button from "@/interface/components/Button.svelte";
  import { cloudAuth } from "@/seqta/utils/CloudAuth";
  import { closeExtensionPopup } from "@/seqta/utils/Closers/closeExtensionPopup";
  import { runTimetableClassmatesSync } from "./syncOrchestrator";
  import { loadSession, resolveClassmatesScope } from "./rosterStore";
  import { pluginSettingsStore } from "@/interface/pages/settings/pluginSettingsState.svelte";
  import {
    openTimetableClassmatesOptInPopup,
    openTimetableClassmatesOptOutPopup,
  } from "./openTimetableClassmatesPopup";

  const PLUGIN_ID = "timetable-classmates";
  const SETTINGS_CLOSE_MS = 320;

  let busy = $state(false);
  let status = $state("");
  let error = $state("");
  let scopeLabel = $state("");
  let syncOptIn = $state(false);

  async function refreshStatus() {
    const scope = await resolveClassmatesScope();
    scopeLabel = scope ? scope.replace("#", " · student ") : "Open SEQTA on your school site";
    const session = await loadSession();
    syncOptIn = session.syncOptIn;
    if (session.lastSyncAt) {
      status = `Last sync ${new Date(session.lastSyncAt).toLocaleString()}${
        session.lastPeerCount != null ? ` · ${session.lastPeerCount} peers` : ""
      }`;
    } else {
      status = "";
    }
  }

  $effect(() => {
    void refreshStatus();
  });

  function afterSettingsClosed(run: () => void) {
    closeExtensionPopup();
    window.setTimeout(run, SETTINGS_CLOSE_MS);
  }

  function startOptIn() {
    error = "";
    afterSettingsClosed(() => {
      openTimetableClassmatesOptInPopup({
        onAccepted: async () => {
          await pluginSettingsStore.update(PLUGIN_ID, "enabled", true);
          await refreshStatus();
        },
      });
    });
  }

  function startOptOut() {
    error = "";
    afterSettingsClosed(() => {
      openTimetableClassmatesOptOutPopup({
        onConfirmed: async () => {
          await refreshStatus();
        },
      });
    });
  }

  async function syncNow() {
    error = "";
    busy = true;
    try {
      const res = await runTimetableClassmatesSync();
      if (!res.ok) error = res.error ?? "Sync failed";
      await refreshStatus();
    } finally {
      busy = false;
    }
  }
</script>

<div class="flex flex-col items-end gap-2 shrink-0 max-w-[14rem]">
  <p class="text-xs text-right text-zinc-500 dark:text-zinc-400">{scopeLabel}</p>

  {#if syncOptIn}
    <p class="text-xs font-medium text-green-600 dark:text-green-400">Opted in on this site</p>
    <div class="flex flex-wrap gap-2 justify-end">
      <Button text="Sync now" onClick={() => void syncNow()} disabled={busy} />
      <button
        type="button"
        class="px-3 py-1.5 text-[0.75rem] rounded-lg text-red-600 dark:text-red-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/50 disabled:opacity-50 transition-colors duration-200"
        disabled={busy}
        onclick={startOptOut}
      >
        Opt out…
      </button>
    </div>
  {:else}
    <p class="text-xs text-right text-zinc-500 dark:text-zinc-400">
      {cloudAuth.state.isLoggedIn
        ? "Not sharing yet"
        : "Sign in to Cloud in the opt-in guide"}
    </p>
    <Button text="Opt in…" onClick={startOptIn} disabled={busy} />
  {/if}

  {#if status}
    <p class="text-xs text-right text-zinc-500 dark:text-zinc-400">{status}</p>
  {/if}
  {#if error}
    <p class="text-xs text-right text-red-500">{error}</p>
  {/if}
</div>
