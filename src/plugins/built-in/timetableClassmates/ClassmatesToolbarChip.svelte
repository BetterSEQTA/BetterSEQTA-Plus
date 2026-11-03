<script lang="ts">
  import { onMount } from "svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import { syncCalendarSyncTheme } from "@/plugins/built-in/timetable/calendarSyncUi";
  import { loadSession } from "./rosterStore";
  import { openTimetableClassmatesOptInPopup } from "./openTimetableClassmatesPopup";
  import { runTimetableClassmatesSync } from "./syncOrchestrator";
  import { accountsAvailability } from "./accountsAvailability";

  let rootEl = $state<HTMLDivElement | null>(null);
  let busy = $state(false);
  let error = $state("");

  function syncTheme() {
    const host = rootEl?.closest(".bsplus-friends-sync-mount");
    if (host instanceof HTMLElement) syncCalendarSyncTheme(host);
  }

  async function handleClick() {
    if (busy || !$accountsAvailability.available) return;
    error = "";
    busy = true;
    try {
      const session = await loadSession();
      if (!session.syncOptIn) {
        openTimetableClassmatesOptInPopup({ onAccepted: () => {} });
        return;
      }
      const result = await runTimetableClassmatesSync();
      if (!result.ok) error = result.error ?? "Sync failed";
    } catch (err) {
      error = err instanceof Error ? err.message : "Sync failed";
    } finally {
      busy = false;
    }
  }

  onMount(() => {
    const themeKeys = ["selectedColor", "selectedFont", "DarkMode", "adaptiveThemeColour"] as const;
    const onThemeChange = () => syncTheme();
    for (const key of themeKeys) {
      settingsState.register(key, onThemeChange);
    }

    const themeObserver = new MutationObserver(onThemeChange);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    syncTheme();

    return () => {
      for (const key of themeKeys) {
        settingsState.unregister(key, onThemeChange);
      }
      themeObserver.disconnect();
    };
  });
</script>

<div class="bsplus-friends-sync" bind:this={rootEl}>
  <button
    type="button"
    class="uiButton bsplus-cal-trigger"
    class:bsplus-cal-trigger--busy={busy}
    disabled={busy || !$accountsAvailability.available}
    aria-busy={busy}
    aria-label={error || $accountsAvailability.message || "Sync with Friends"}
    title={error || $accountsAvailability.message || "Sync with Friends"}
    onclick={() => void handleClick()}
  >
    <span class="bsplus-cal-trigger-content">
      <span class="bsplus-cal-trigger-icon iconFamily" aria-hidden="true">&#xed66;</span>
      <span class="bsplus-cal-trigger-text">
        {busy ? "Syncing…" : error ? "Sync failed" : "Sync with Friends"}
      </span>
    </span>
  </button>
</div>
