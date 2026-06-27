<script lang="ts">
  import { onMount } from "svelte";
  import { fade, fly } from "svelte/transition";
  import browser from "webextension-polyfill";
  import {
    GOOGLE_CALENDAR_SYNC_WEEKS_MAX,
    GOOGLE_CALENDAR_SYNC_WEEKS_MIN,
  } from "@/config/googleCalendar";
  import { maybeRunDueWeeklySync } from "@/seqta/utils/googleCalendar/calendarSyncListener";
  import { deleteSyncedEventsFromGoogleCalendar } from "@/seqta/utils/googleCalendar/syncEngine";
  import {
    formatOutlookSyncResultMessage,
    runOutlookCalendarSync,
  } from "@/seqta/utils/outlookCalendar/syncRunner";
  import {
    formatSyncResultMessage,
    runGoogleCalendarSync,
  } from "@/seqta/utils/googleCalendar/syncRunner";
  import type {
    GoogleCalendarStatus,
    GoogleCalendarSyncProgress,
    GoogleCalendarSyncResult,
  } from "@/seqta/utils/googleCalendar/types";
  import type { OutlookCalendarStatus } from "@/seqta/utils/outlookCalendar/types";
  import { deleteSyncedEventsFromOutlookCalendar } from "@/seqta/utils/outlookCalendar/syncEngine";
  import CalendarDeleteEventsModal from "./CalendarDeleteEventsModal.svelte";
  import CalendarDisconnectModal from "./CalendarDisconnectModal.svelte";
  import CalendarSyncProgress from "./CalendarSyncProgress.svelte";
  import OutlookCalendarIcon from "./OutlookCalendarIcon.svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import { syncCalendarSyncTheme } from "./calendarSyncTheme";

  type CalendarProvider = "google" | "outlook";
  type BusyPhase = "connect" | "sync" | "delete" | "disconnect" | null;
  type BusyState = { provider: CalendarProvider; phase: BusyPhase } | null;

  let googleStatus = $state<GoogleCalendarStatus>({ configured: true, connected: false });
  let outlookStatus = $state<OutlookCalendarStatus>({ configured: true, connected: false });
  let busy = $state<BusyState>(null);
  let menuOpen = $state(false);
  let modalProvider = $state<CalendarProvider | null>(null);
  let showDisconnect = $state(false);
  let showDeleteEvents = $state(false);
  let toast = $state<{ message: string; error: boolean } | null>(null);
  let syncProgress = $state<GoogleCalendarSyncProgress | null>(null);
  let syncWeeksAhead = $state(12);
  let autoSyncWeekly = $state(true);

  let rootEl = $state<HTMLDivElement | null>(null);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let menuEl = $state<HTMLDivElement | null>(null);
  let menuStyle = $state("");
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  const isBusy = $derived(busy !== null);
  const anyConnected = $derived(googleStatus.connected || outlookStatus.connected);
  const accent = "var(--bsplus-cal-accent, var(--better-main, #3b82f6))";

  function isProviderBusy(provider: CalendarProvider): boolean {
    return busy?.provider === provider;
  }

  function providerPhase(provider: CalendarProvider): BusyPhase {
    return busy?.provider === provider ? busy.phase : null;
  }

  function showToastMessage(message: string, isError = false) {
    toast = { message, error: isError };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast = null;
    }, 4500);
  }

  async function refreshStatus() {
    const [google, outlook] = await Promise.all([
      browser.runtime.sendMessage({ type: "googleCalendarStatus" }) as Promise<GoogleCalendarStatus>,
      browser.runtime.sendMessage({ type: "outlookCalendarStatus" }) as Promise<OutlookCalendarStatus>,
    ]);
    googleStatus = google;
    outlookStatus = outlook;
    syncWeeksAhead = google.syncWeeksAhead ?? 12;
    autoSyncWeekly = google.autoSyncWeekly !== false;
  }

  async function getAccessToken(provider: CalendarProvider): Promise<string> {
    const messageType =
      provider === "google" ? "googleCalendarGetAccessToken" : "outlookCalendarGetAccessToken";
    const res = (await browser.runtime.sendMessage({ type: messageType })) as {
      success?: boolean;
      accessToken?: string;
      error?: string;
    };
    if (!res?.success || !res.accessToken) {
      throw new Error(res?.error ?? "Could not get calendar access token.");
    }
    return res.accessToken;
  }

  function handleSyncProgress(progress: GoogleCalendarSyncProgress) {
    syncProgress = progress;
  }

  async function saveSyncSettings(patch: {
    syncWeeksAhead?: number;
    autoSyncWeekly?: boolean;
  }) {
    const result = (await browser.runtime.sendMessage({
      type: "googleCalendarUpdateSyncSettings",
      ...patch,
    })) as GoogleCalendarStatus & { success?: boolean };
    if (result.syncWeeksAhead != null) syncWeeksAhead = result.syncWeeksAhead;
    if (result.autoSyncWeekly != null) autoSyncWeekly = result.autoSyncWeekly;
    googleStatus = { ...googleStatus, ...result };
  }

  async function performSync(
    provider: CalendarProvider,
    mode: "full" | "incremental" = "full",
  ): Promise<boolean> {
    const run = provider === "google" ? runGoogleCalendarSync : runOutlookCalendarSync;
    const format = provider === "google" ? formatSyncResultMessage : formatOutlookSyncResultMessage;

    const result = await run({ mode, onProgress: handleSyncProgress });
    syncProgress = null;

    if (!result.success) {
      showToastMessage(result.error ?? "Calendar sync failed.", true);
      return false;
    }

    if (provider === "google") {
      googleStatus = {
        ...googleStatus,
        connected: true,
        lastSyncAt: result.lastSyncAt ?? googleStatus.lastSyncAt,
      };
    } else {
      outlookStatus = {
        ...outlookStatus,
        connected: true,
        lastSyncAt: result.lastSyncAt ?? outlookStatus.lastSyncAt,
      };
    }

    showToastMessage(format(result));
    return true;
  }

  async function connectProvider(provider: CalendarProvider) {
    const status = provider === "google" ? googleStatus : outlookStatus;
    if (!status.configured || isBusy) return;
    menuOpen = true;
    busy = { provider, phase: "connect" };
    const connectType =
      provider === "google" ? "googleCalendarConnect" : "outlookCalendarConnect";
    try {
      const result = (await browser.runtime.sendMessage({
        type: connectType,
      })) as GoogleCalendarSyncResult;
      if (!result.success) {
        const label = provider === "google" ? "Google" : "Outlook";
        showToastMessage(result.error ?? `Could not connect to ${label} Calendar.`, true);
        return;
      }
      if (provider === "google") {
        googleStatus = { ...googleStatus, connected: true };
      } else {
        outlookStatus = { ...outlookStatus, connected: true };
      }
      busy = { provider, phase: "sync" };
      await performSync(provider);
    } catch (err) {
      showToastMessage(err instanceof Error ? err.message : "Could not connect.", true);
    } finally {
      syncProgress = null;
      busy = null;
    }
  }

  async function syncProvider(provider: CalendarProvider) {
    const status = provider === "google" ? googleStatus : outlookStatus;
    if (!status.configured || isBusy) return;
    if (!status.connected) {
      await connectProvider(provider);
      return;
    }

    busy = { provider, phase: "sync" };
    try {
      await performSync(provider);
    } catch (err) {
      showToastMessage(err instanceof Error ? err.message : "Calendar sync failed.", true);
    } finally {
      syncProgress = null;
      busy = null;
    }
  }

  async function confirmDeleteEvents() {
    if (isBusy || !modalProvider) return;
    const provider = modalProvider;
    busy = { provider, phase: "delete" };
    syncProgress = {
      phase: "preparing",
      current: 0,
      total: 1,
      message: "Preparing removal…",
    };
    try {
      const deleteFn =
        provider === "google"
          ? deleteSyncedEventsFromGoogleCalendar
          : deleteSyncedEventsFromOutlookCalendar;
      const result = await deleteFn(location.origin, () => getAccessToken(provider), {
        onProgress: handleSyncProgress,
      });

      if (!result.success) {
        showToastMessage(result.error ?? "Could not remove calendar events.", true);
        return;
      }

      const removed = result.deleted ?? 0;
      showDeleteEvents = false;
      menuOpen = false;
      modalProvider = null;
      if (removed === 0) {
        showToastMessage("No synced events to remove.");
      } else {
        showToastMessage(`Removed ${removed} event${removed === 1 ? "" : "s"} from Google Calendar.`);
      }
    } catch (err) {
      showToastMessage(err instanceof Error ? err.message : "Remove failed.", true);
    } finally {
      syncProgress = null;
      busy = null;
    }
  }

  async function onWeeksAheadChange(event: Event) {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    await saveSyncSettings({ syncWeeksAhead: value });
  }

  async function onAutoSyncToggle(event: Event) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    autoSyncWeekly = checked;
    await saveSyncSettings({ autoSyncWeekly: checked });
  }

  async function confirmDisconnect() {
    if (isBusy || !modalProvider) return;
    const provider = modalProvider;
    busy = { provider, phase: "disconnect" };
    const disconnectType =
      provider === "google" ? "googleCalendarDisconnect" : "outlookCalendarDisconnect";
    const label = provider === "google" ? "Google" : "Outlook";
    try {
      const result = (await browser.runtime.sendMessage({
        type: disconnectType,
      })) as { success?: boolean };
      if (!result?.success) {
        showToastMessage(`Could not disconnect ${label} Calendar.`, true);
        return;
      }
      if (provider === "google") {
        googleStatus = { ...googleStatus, connected: false, lastSyncAt: undefined };
      } else {
        outlookStatus = { ...outlookStatus, connected: false, lastSyncAt: undefined };
      }
      showDisconnect = false;
      menuOpen = false;
      modalProvider = null;
      showToastMessage(`Disconnected from ${label} Calendar.`);
    } catch (err) {
      showToastMessage(err instanceof Error ? err.message : "Disconnect failed.", true);
    } finally {
      busy = null;
    }
  }

  function toggleMenu() {
    if (isBusy) return;
    menuOpen = !menuOpen;
    if (menuOpen) {
      queueMicrotask(() => syncMenuTheme());
    }
  }

  function formatLastSync(ts?: number): string | null {
    if (!ts) return null;
    const diff = Date.now() - ts;
    if (diff < 60_000) return "Synced just now";
    if (diff < 3_600_000) return `Synced ${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `Synced ${Math.floor(diff / 3_600_000)}h ago`;
    return `Synced ${new Date(ts).toLocaleDateString()}`;
  }

  function updateMenuPosition() {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    menuStyle = `top:${rect.bottom + 8}px;right:${window.innerWidth - rect.right}px;`;
    syncMenuTheme();
  }

  function syncMenuTheme() {
    if (!menuEl) return;
    syncCalendarSyncTheme(menuEl);
  }

  function syncMountedTheme() {
    const themeHost = rootEl?.closest(".bsplus-calendar-sync-mount") as HTMLElement | null;
    if (themeHost) syncCalendarSyncTheme(themeHost);
    if (menuOpen) syncMenuTheme();
  }

  function portalMenu(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      },
    };
  }

  $effect(() => {
    const host = rootEl?.closest(".timetable-calendar-controls");
    host?.classList.toggle("bsplus-cal-menu-open", menuOpen);
    return () => host?.classList.remove("bsplus-cal-menu-open");
  });

  $effect(() => {
    if (!menuOpen || !menuEl) return;
    syncMenuTheme();
    updateMenuPosition();
    const onLayout = () => updateMenuPosition();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  });

  onMount(() => {
    void refreshStatus().then(() => {
      void maybeRunDueWeeklySync((message, isError) => {
        showToastMessage(message, isError);
        void refreshStatus();
      });
    });

    const themeKeys = [
      "selectedColor",
      "selectedFont",
      "DarkMode",
      "adaptiveThemeColour",
      "adaptiveThemeGradient",
      "selectedTheme",
    ] as const;
    const onThemeChange = () => syncMountedTheme();
    for (const key of themeKeys) {
      settingsState.register(key, onThemeChange);
    }

    const themeObserver = new MutationObserver(onThemeChange);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    const onDocPointer = (event: PointerEvent) => {
      if (!menuOpen) return;
      const target = event.target as Node;
      if (rootEl?.contains(target)) return;
      if (menuEl?.contains(target)) return;
      menuOpen = false;
    };

    document.addEventListener("pointerdown", onDocPointer);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      for (const key of themeKeys) {
        settingsState.unregister(key, onThemeChange);
      }
      themeObserver.disconnect();
      if (toastTimer) clearTimeout(toastTimer);
    };
  });
</script>

<div class="bsplus-cal-sync" bind:this={rootEl}>
  <button
    type="button"
    class="uiButton bsplus-cal-trigger"
    bind:this={triggerEl}
    class:bsplus-cal-trigger--open={menuOpen}
    class:bsplus-cal-trigger--connected={anyConnected}
    class:bsplus-cal-trigger--busy={isBusy}
    aria-haspopup="menu"
    aria-expanded={menuOpen}
    aria-busy={isBusy}
    aria-label={anyConnected ? "Calendar sync options" : "Sync with Calendar"}
    onclick={() => {
      if (!isBusy) toggleMenu();
    }}
  >
    <span class="bsplus-cal-trigger-icon iconFamily" aria-hidden="true">&#xe9cd;</span>
    <span class="bsplus-cal-trigger-text">Sync with Calendar</span>
    {#if anyConnected}
      <span class="bsplus-cal-status-dot" aria-hidden="true"></span>
    {/if}
  </button>

  {#if menuOpen}
    <div
      class="bsplus-cal-menu"
      role="menu"
      bind:this={menuEl}
      style={menuStyle}
      use:portalMenu
      transition:fly={{ y: -6, duration: 160 }}
    >
      <div class="bsplus-cal-menu-header">
        <span class="bsplus-cal-menu-title">Calendar sync</span>
        <span class="bsplus-cal-menu-sub">Connect providers to sync your timetable</span>
      </div>

      <div class="bsplus-cal-provider" role="none">
        <div class="bsplus-cal-provider-row">
          <span class="bsplus-cal-provider-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22 12c0-.96-.08-1.88-.24-2.76H12v5.22h5.68c-.24 1.28-.96 2.44-2.04 3.18v2.64h3.3c1.92-1.76 3.06-4.36 3.06-7.28z"
              />
              <path
                fill="#34A853"
                d="M12 22c2.76 0 5.08-.92 6.78-2.5l-3.3-2.64c-.92.62-2.1.98-3.48.98-2.68 0-4.96-1.8-5.78-4.22H2.18v2.72A10 10 0 0 0 12 22z"
              />
              <path
                fill="#FBBC05"
                d="M6.22 13.62A5.98 5.98 0 0 1 5.82 12c0-.56.1-1.1.28-1.62V7.66H2.18A10 10 0 0 0 2 12c0 1.62.38 3.16 1.06 4.52l3.16-2.9z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.5 0 2.84.52 3.9 1.54l2.92-2.92C17.08 2.34 14.76 1.2 12 1.2 7.54 1.2 3.72 3.94 2.18 7.66l4.04 3.14c.82-2.42 3.1-4.22 5.78-4.22z"
              />
            </svg>
          </span>
          <div class="bsplus-cal-provider-copy">
            <span class="bsplus-cal-provider-name">
              <span class="bsplus-google-word bsplus-google-word--sm">
                <span class="bsplus-google-g">G</span><span class="bsplus-google-o1">o</span><span class="bsplus-google-o2">o</span><span class="bsplus-google-g2">g</span><span class="bsplus-google-l">l</span><span class="bsplus-google-e">e</span>
              </span>
              <span> Calendar</span>
            </span>
            <span class="bsplus-cal-provider-status">
              {#if !googleStatus.configured}
                Not available in this build
              {:else if googleStatus.connected}
                Connected{formatLastSync(googleStatus.lastSyncAt) ? ` · ${formatLastSync(googleStatus.lastSyncAt)}` : ""}
              {:else}
                Not connected
              {/if}
            </span>
          </div>
        </div>

        <div class="bsplus-cal-provider-actions">
          {#if !googleStatus.connected}
            <button
              type="button"
              class="bsplus-cal-action bsplus-cal-action--primary"
              style:--bsplus-cal-accent={accent}
              role="menuitem"
              disabled={!googleStatus.configured || isBusy}
              onclick={() => void connectProvider("google")}
            >
              {providerPhase("google") === "connect" ? "Connecting…" : "Connect"}
            </button>
          {:else}
            <button
              type="button"
              class="bsplus-cal-action bsplus-cal-action--primary"
              style:--bsplus-cal-accent={accent}
              role="menuitem"
              disabled={isBusy}
              onclick={() => void syncProvider("google")}
            >
              {providerPhase("google") === "sync" ? "Syncing…" : "Sync now"}
            </button>
            <button
              type="button"
              class="bsplus-cal-action bsplus-cal-action--ghost"
              role="menuitem"
              disabled={isBusy}
              onclick={() => {
                modalProvider = "google";
                showDeleteEvents = true;
              }}
            >
              {providerPhase("google") === "delete" ? "Removing…" : "Remove from calendar"}
            </button>
            <button
              type="button"
              class="bsplus-cal-action bsplus-cal-action--ghost"
              role="menuitem"
              disabled={isBusy}
              onclick={() => {
                modalProvider = "google";
                showDisconnect = true;
              }}
            >
              Disconnect
            </button>
          {/if}
        </div>
      </div>

      <div class="bsplus-cal-provider" role="none">
        <div class="bsplus-cal-provider-row">
          <span class="bsplus-cal-provider-icon" aria-hidden="true">
            <OutlookCalendarIcon />
          </span>
          <div class="bsplus-cal-provider-copy">
            <span class="bsplus-cal-provider-name">Outlook Calendar</span>
            <span class="bsplus-cal-provider-status">
              {#if !outlookStatus.configured}
                Set OUTLOOK_OAUTH_CLIENT_ID to enable
              {:else if outlookStatus.connected}
                Connected{formatLastSync(outlookStatus.lastSyncAt) ? ` · ${formatLastSync(outlookStatus.lastSyncAt)}` : ""}
              {:else}
                Not connected
              {/if}
            </span>
          </div>
        </div>

        <div class="bsplus-cal-provider-actions">
          {#if !outlookStatus.connected}
            <button
              type="button"
              class="bsplus-cal-action bsplus-cal-action--primary"
              style:--bsplus-cal-accent={accent}
              role="menuitem"
              disabled={!outlookStatus.configured || isBusy}
              onclick={() => void connectProvider("outlook")}
            >
              {providerPhase("outlook") === "connect" ? "Connecting…" : "Connect"}
            </button>
          {:else}
            <button
              type="button"
              class="bsplus-cal-action bsplus-cal-action--primary"
              style:--bsplus-cal-accent={accent}
              role="menuitem"
              disabled={isBusy}
              onclick={() => void syncProvider("outlook")}
            >
              {providerPhase("outlook") === "sync" ? "Syncing…" : "Sync now"}
            </button>
            <button
              type="button"
              class="bsplus-cal-action bsplus-cal-action--ghost"
              role="menuitem"
              disabled={isBusy}
              onclick={() => {
                modalProvider = "outlook";
                showDeleteEvents = true;
              }}
            >
              {providerPhase("outlook") === "delete" ? "Removing…" : "Remove from calendar"}
            </button>
            <button
              type="button"
              class="bsplus-cal-action bsplus-cal-action--ghost"
              role="menuitem"
              disabled={isBusy}
              onclick={() => {
                modalProvider = "outlook";
                showDisconnect = true;
              }}
            >
              Disconnect
            </button>
          {/if}
        </div>
      </div>

      {#if anyConnected}
        <div class="bsplus-cal-settings" role="group" aria-label="Sync settings">
            <label class="bsplus-cal-setting">
              <span class="bsplus-cal-setting-label">Weeks ahead</span>
              <input
                type="number"
                class="bsplus-cal-setting-input"
                min={GOOGLE_CALENDAR_SYNC_WEEKS_MIN}
                max={GOOGLE_CALENDAR_SYNC_WEEKS_MAX}
                value={syncWeeksAhead}
                disabled={isBusy}
                onchange={(e) => void onWeeksAheadChange(e)}
              />
            </label>
            <label class="bsplus-cal-setting bsplus-cal-setting--toggle">
              <span class="bsplus-cal-setting-label">Auto-sync weekly</span>
              <input
                type="checkbox"
                class="bsplus-cal-setting-checkbox"
                checked={autoSyncWeekly}
                disabled={isBusy}
                onchange={(e) => void onAutoSyncToggle(e)}
              />
            </label>
            <p class="bsplus-cal-setting-hint">
              Syncs {syncWeeksAhead} weeks ahead on connect and manual sync. Weekly auto-sync adds each new week forward.
            </p>
          </div>
        {/if}

        <CalendarSyncProgress progress={syncProgress} />
    </div>
  {/if}

  <CalendarDeleteEventsModal
    open={showDeleteEvents}
    busy={busy?.phase === "delete"}
    providerLabel={modalProvider === "outlook" ? "Outlook" : "Google"}
    onCancel={() => {
      if (busy?.phase !== "delete") showDeleteEvents = false;
    }}
    onConfirm={confirmDeleteEvents}
  />

  <CalendarDisconnectModal
    open={showDisconnect}
    busy={busy?.phase === "disconnect"}
    providerLabel={modalProvider === "outlook" ? "Outlook" : "Google"}
    onCancel={() => {
      if (busy?.phase !== "disconnect") showDisconnect = false;
    }}
    onConfirm={confirmDisconnect}
  />

  {#if toast}
    <div
      class="bsplus-cal-toast"
      class:bsplus-cal-toast--error={toast.error}
      role="status"
      transition:fade={{ duration: 150 }}
    >
      {toast.message}
    </div>
  {/if}
</div>

<style>
  .bsplus-cal-sync {
    position: relative;
    display: inline-flex;
    font-family: var(--bsplus-cal-font-family, var(--betterseqta-font-family, Rubik), sans-serif);
    color: var(--bsplus-cal-text, var(--text-primary, #111));
  }

  .bsplus-cal-trigger {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: auto;
    height: auto;
    padding: 0 10px;
    margin-left: 4px;
    border-radius: 16px !important;
    font-family: inherit;
    transition: all 0.2s ease;
  }

  .bsplus-cal-trigger-icon {
    font-family: "IconFamily" !important;
    font-size: 16px;
    line-height: 1;
    opacity: 0.9;
  }

  .bsplus-cal-trigger-text {
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
  }

  .bsplus-google-word {
    display: inline-flex;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .bsplus-google-word--sm {
    font-size: 13px;
  }

  .bsplus-google-g,
  .bsplus-google-g2 {
    color: #4285f4;
  }

  .bsplus-google-o1,
  .bsplus-google-e {
    color: #ea4335;
  }

  .bsplus-google-o2 {
    color: #fbbc05;
  }

  .bsplus-google-l {
    color: #34a853;
  }

  .bsplus-cal-trigger:hover:not(.bsplus-cal-trigger--busy) {
    transform: scale(1.03);
  }

  .bsplus-cal-trigger:active:not(.bsplus-cal-trigger--busy) {
    transform: scale(0.97);
  }

  .bsplus-cal-trigger--open {
    background: color-mix(in srgb, var(--bsplus-cal-accent, var(--better-main, #3b82f6)) 14%, transparent) !important;
  }

  .bsplus-cal-trigger--connected .bsplus-cal-status-dot {
    display: block;
  }

  .bsplus-cal-trigger--busy {
    opacity: 0.85;
    cursor: wait;
  }

  .bsplus-cal-status-dot {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #22c55e;
    box-shadow: 0 0 0 2px var(--bsplus-cal-surface, #fff);
    display: none;
  }

  .bsplus-cal-settings {
    margin: 8px 0 10px;
    padding: 10px;
    border-radius: 10px;
    border: 1px solid var(--bsplus-cal-border, color-mix(in srgb, var(--bsplus-cal-text) 12%, transparent));
    background: color-mix(in srgb, var(--bsplus-cal-surface, #fff) 92%, transparent);
    display: grid;
    gap: 8px;
  }

  .bsplus-cal-setting {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 12px;
  }

  .bsplus-cal-setting-label {
    font-weight: 600;
    color: var(--bsplus-cal-text, var(--text-primary, #111));
  }

  .bsplus-cal-setting-input {
    width: 64px;
    padding: 6px 8px;
    border-radius: 10px;
    border: 1px solid var(--bsplus-cal-border, color-mix(in srgb, var(--bsplus-cal-text) 18%, transparent));
    background: var(--bsplus-cal-surface, #fff);
    color: var(--bsplus-cal-text, var(--text-primary, #111));
    font-size: 12px;
    text-align: center;
  }

  .bsplus-cal-setting-checkbox {
    width: 16px;
    height: 16px;
    accent-color: var(--bsplus-cal-accent, var(--better-main, #3b82f6));
  }

  .bsplus-cal-setting-hint {
    margin: 0;
    font-size: 10px;
    line-height: 1.4;
    color: color-mix(in srgb, var(--bsplus-cal-text, #111) 58%, transparent);
  }

  .bsplus-cal-menu {
    position: fixed;
    z-index: 2147483647;
    width: min(320px, calc(100vw - 24px));
    padding: 10px;
    border-radius: 14px;
    background: var(--bsplus-cal-surface, #fff);
    color: var(--bsplus-cal-text, #18181b);
    border: 1px solid var(--bsplus-cal-border, color-mix(in srgb, var(--bsplus-cal-text) 12%, transparent));
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22);
    font-family: var(--bsplus-cal-font-family, var(--betterseqta-font-family, Rubik), sans-serif);
  }

  .bsplus-cal-menu.dark {
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  }

  .bsplus-cal-menu-header {
    padding: 6px 8px 10px;
    border-bottom: 1px solid var(--bsplus-cal-border, color-mix(in srgb, var(--bsplus-cal-text) 10%, transparent));
    margin-bottom: 8px;
  }

  .bsplus-cal-menu-title {
    display: block;
    font-size: 13px;
    font-weight: 700;
  }

  .bsplus-cal-menu-sub {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    color: color-mix(in srgb, var(--bsplus-cal-text, #111) 62%, transparent);
  }

  .bsplus-cal-provider {
    padding: 8px;
    border-radius: 10px;
    background: var(--bsplus-cal-surface-muted, color-mix(in srgb, var(--bsplus-cal-text) 4%, transparent));
    margin-bottom: 8px;
  }

  .bsplus-cal-provider-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .bsplus-cal-provider-icon {
    display: flex;
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
  }

  .bsplus-cal-provider-icon svg {
    width: 100%;
    height: 100%;
  }

  .bsplus-cal-provider-copy {
    min-width: 0;
  }

  .bsplus-cal-provider-name {
    display: block;
    font-size: 13px;
    font-weight: 600;
  }

  .bsplus-cal-provider-status {
    display: block;
    margin-top: 1px;
    font-size: 11px;
    color: color-mix(in srgb, var(--bsplus-cal-text, #111) 62%, transparent);
  }

  .bsplus-cal-provider-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .bsplus-cal-action {
    flex: 1 1 auto;
    min-width: 0;
    padding: 7px 10px;
    border: none;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .bsplus-cal-action:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .bsplus-cal-action--primary {
    background: var(--bsplus-cal-accent, var(--better-main, #3b82f6));
    color: #fff;
  }

  .bsplus-cal-action--primary:hover:not(:disabled) {
    filter: brightness(1.06);
    transform: scale(1.02);
  }

  .bsplus-cal-action--ghost {
    background: var(--bsplus-cal-surface-muted, color-mix(in srgb, var(--bsplus-cal-text) 8%, transparent));
    color: var(--bsplus-cal-text, #18181b);
  }

  .bsplus-cal-action--ghost:hover:not(:disabled) {
    background: color-mix(in srgb, var(--bsplus-cal-text) 14%, var(--bsplus-cal-surface));
  }

  .bsplus-cal-toast {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 100000;
    max-width: min(360px, calc(100vw - 32px));
    padding: 12px 14px;
    border-radius: 12px;
    background: rgba(20, 20, 20, 0.92);
    color: #fff;
    font-size: 13px;
    line-height: 1.4;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
    pointer-events: none;
  }

  .bsplus-cal-toast--error {
    background: rgba(120, 24, 24, 0.95);
  }
</style>
