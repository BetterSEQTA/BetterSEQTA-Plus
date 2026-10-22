<script lang="ts">
  import { onMount } from "svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import { syncCalendarSyncTheme } from "@/plugins/built-in/timetable/calendarSyncUi";
  import { loadSession } from "./rosterStore";
  import { openTimetableClassmatesOptInPopup } from "./openTimetableClassmatesPopup";
  import { runTimetableClassmatesSync } from "./syncOrchestrator";

  let rootEl = $state<HTMLDivElement | null>(null);
  let busy = $state(false);

  function syncTheme() {
    const host = rootEl?.closest(".bsplus-friends-sync-mount");
    if (host instanceof HTMLElement) syncCalendarSyncTheme(host);
  }

  async function handleClick() {
    if (busy) return;
    const session = await loadSession();
    if (!session.syncOptIn) {
      openTimetableClassmatesOptInPopup({ onAccepted: () => {} });
      return;
    }

    busy = true;
    try {
      await runTimetableClassmatesSync();
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
    disabled={busy}
    aria-busy={busy}
    aria-label="Sync with Friends"
    onclick={() => void handleClick()}
  >
    <span class="bsplus-cal-trigger-content">
      <span class="bsplus-cal-trigger-icon iconFamily" aria-hidden="true">&#xed66;</span>
      <span class="bsplus-cal-trigger-text">Sync with Friends</span>
    </span>
  </button>
</div>
