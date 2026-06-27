<script lang="ts">
  import { onMount } from "svelte";
  import { fade, fly } from "svelte/transition";
  import browser from "webextension-polyfill";
  import { fetchTimetableForSync } from "@/seqta/utils/googleCalendar/fetchTimetable";
  import { syncLessonsToGoogleCalendar } from "@/seqta/utils/googleCalendar/syncEngine";
  import type { GoogleCalendarStatus, GoogleCalendarSyncResult } from "@/seqta/utils/googleCalendar/types";
  import CalendarDisconnectModal from "./CalendarDisconnectModal.svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import { syncCalendarSyncTheme } from "./calendarSyncTheme";

  type BusyPhase = "connect" | "sync" | "disconnect" | null;

  let status = $state<GoogleCalendarStatus>({ configured: true, connected: false });
  let busy = $state<BusyPhase>(null);
  let menuOpen = $state(false);
  let showDisconnect = $state(false);
  let toast = $state<{ message: string; error: boolean } | null>(null);

  let rootEl = $state<HTMLDivElement | null>(null);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let menuEl = $state<HTMLDivElement | null>(null);
  let menuStyle = $state("");
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  const isBusy = $derived(busy !== null);
  const accent = "var(--bsplus-cal-accent, var(--better-main, #3b82f6))";

  function showToastMessage(message: string, isError = false) {
    toast = { message, error: isError };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast = null;
    }, 4500);
  }

  async function refreshStatus() {
    status = (await browser.runtime.sendMessage({
      type: "googleCalendarStatus",
    })) as GoogleCalendarStatus;
  }

  async function getAccessTokenFromBackground(): Promise<string> {
    const res = (await browser.runtime.sendMessage({
      type: "googleCalendarGetAccessToken",
    })) as { success?: boolean; accessToken?: string; error?: string };
    if (!res?.success || !res.accessToken) {
      throw new Error(res?.error ?? "Could not get Google Calendar access token.");
    }
    return res.accessToken;
  }

  async function performSync(): Promise<boolean> {
    const lessons = await fetchTimetableForSync();
    const result = await syncLessonsToGoogleCalendar(
      { origin: location.origin, lessons },
      getAccessTokenFromBackground,
    );

    if (!result.success) {
      showToastMessage(result.error ?? "Calendar sync failed.", true);
      return false;
    }

    const created = result.created ?? 0;
    const updated = result.updated ?? 0;
    status = {
      ...status,
      connected: true,
      lastSyncAt: result.lastSyncAt ?? status.lastSyncAt,
    };
    showToastMessage(`Google Calendar updated (${created} new, ${updated} updated).`);
    return true;
  }

  async function connectGoogle() {
    if (!status.configured || isBusy) return;
    menuOpen = true;
    busy = "connect";
    try {
      const result = (await browser.runtime.sendMessage({
        type: "googleCalendarConnect",
      })) as GoogleCalendarSyncResult;
      if (!result.success) {
        showToastMessage(result.error ?? "Could not connect to Google Calendar.", true);
        return;
      }
      status = { ...status, connected: true };
      busy = "sync";
      await performSync();
    } catch (err) {
      showToastMessage(err instanceof Error ? err.message : "Could not connect.", true);
    } finally {
      busy = null;
    }
  }

  async function syncTimetable() {
    if (!status.configured || isBusy) return;
    if (!status.connected) {
      await connectGoogle();
      return;
    }

    busy = "sync";
    try {
      await performSync();
    } catch (err) {
      showToastMessage(err instanceof Error ? err.message : "Calendar sync failed.", true);
    } finally {
      busy = null;
    }
  }

  async function confirmDisconnect() {
    if (isBusy) return;
    busy = "disconnect";
    try {
      const result = (await browser.runtime.sendMessage({
        type: "googleCalendarDisconnect",
      })) as { success?: boolean };
      if (!result?.success) {
        showToastMessage("Could not disconnect Google Calendar.", true);
        return;
      }
      status = { ...status, connected: false, lastSyncAt: undefined };
      showDisconnect = false;
      menuOpen = false;
      showToastMessage("Disconnected from Google Calendar.");
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
    void refreshStatus();

    const themeKeys = [
      "selectedColor",
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
    class="bsplus-cal-trigger"
    bind:this={triggerEl}
    class:bsplus-cal-trigger--open={menuOpen}
    class:bsplus-cal-trigger--connected={status.connected}
    class:bsplus-cal-trigger--busy={isBusy}
    aria-haspopup="menu"
    aria-expanded={menuOpen}
    aria-busy={isBusy}
    aria-label={status.connected ? "Google Calendar sync options" : "Connect Google Calendar"}
    onclick={() => {
      if (!isBusy) toggleMenu();
    }}
  >
    <span class="bsplus-cal-trigger-label" aria-hidden="true">
      <span class="bsplus-google-word">
        <span class="bsplus-google-g">G</span><span class="bsplus-google-o1">o</span><span class="bsplus-google-o2">o</span><span class="bsplus-google-g2">g</span><span class="bsplus-google-l">l</span><span class="bsplus-google-e">e</span>
      </span>
      <span class="bsplus-cal-word">Calendar</span>
    </span>
    {#if status.connected}
      <span class="bsplus-cal-status-dot" aria-hidden="true"></span>
    {/if}
    <span class="bsplus-cal-chevron" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clip-rule="evenodd"
        />
      </svg>
    </span>
    {#if isBusy}
      <span class="bsplus-cal-spinner" aria-hidden="true"></span>
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
              {#if !status.configured}
                Not available in this build
              {:else if status.connected}
                Connected{formatLastSync(status.lastSyncAt) ? ` · ${formatLastSync(status.lastSyncAt)}` : ""}
              {:else}
                Not connected
              {/if}
            </span>
          </div>
        </div>

        <div class="bsplus-cal-provider-actions">
          {#if !status.connected}
            <button
              type="button"
              class="bsplus-cal-action bsplus-cal-action--primary"
              style:--bsplus-cal-accent={accent}
              role="menuitem"
              disabled={!status.configured || isBusy}
              onclick={() => void connectGoogle()}
            >
              {busy === "connect" ? "Connecting…" : "Connect"}
            </button>
          {:else}
            <button
              type="button"
              class="bsplus-cal-action bsplus-cal-action--primary"
              style:--bsplus-cal-accent={accent}
              role="menuitem"
              disabled={isBusy}
              onclick={() => void syncTimetable()}
            >
              {busy === "sync" ? "Syncing…" : "Sync now"}
            </button>
            <button
              type="button"
              class="bsplus-cal-action bsplus-cal-action--ghost"
              role="menuitem"
              disabled={isBusy}
              onclick={() => {
                showDisconnect = true;
              }}
            >
              Disconnect
            </button>
          {/if}
        </div>
      </div>

      <div class="bsplus-cal-coming-soon" role="none">
        <span class="bsplus-cal-coming-soon-label">More providers</span>
        <span class="bsplus-cal-coming-soon-hint">Outlook, Apple Calendar — coming soon</span>
      </div>
    </div>
  {/if}

  <CalendarDisconnectModal
    open={showDisconnect}
    busy={busy === "disconnect"}
    onCancel={() => {
      if (busy !== "disconnect") showDisconnect = false;
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
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: var(--bsplus-cal-text, var(--text-primary, #111));
  }

  .bsplus-cal-trigger {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 188px;
    height: 42px;
    padding: 0 12px 0 14px;
    border: 1px solid color-mix(in srgb, var(--bsplus-cal-text, #111) 14%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, var(--bsplus-cal-surface, #fff) 88%, transparent);
    color: var(--bsplus-cal-text, var(--text-primary, #111));
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  }

  .bsplus-cal-trigger-label {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1;
    white-space: nowrap;
  }

  .bsplus-google-word {
    display: inline-flex;
    font-size: 18px;
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

  .bsplus-cal-word {
    color: var(--bsplus-cal-text, var(--text-primary, #111));
    font-weight: 700;
  }

  .bsplus-cal-trigger:hover:not(.bsplus-cal-trigger--busy) {
    transform: scale(1.03);
    border-color: color-mix(in srgb, var(--bsplus-cal-accent, var(--better-main, #3b82f6)) 45%, transparent);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .bsplus-cal-trigger:active:not(.bsplus-cal-trigger--busy) {
    transform: scale(0.97);
  }

  .bsplus-cal-trigger:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--bsplus-cal-surface, #fff),
      0 0 0 4px var(--bsplus-cal-accent, var(--better-main, #3b82f6));
  }

  .bsplus-cal-trigger--open {
    border-color: color-mix(in srgb, var(--bsplus-cal-accent, var(--better-main, #3b82f6)) 55%, transparent);
    background: color-mix(in srgb, var(--bsplus-cal-accent, var(--better-main, #3b82f6)) 10%, transparent);
  }

  .bsplus-cal-trigger--connected {
    border-color: color-mix(in srgb, #22c55e 50%, transparent);
  }

  .bsplus-cal-trigger--busy {
    opacity: 0.85;
    cursor: wait;
  }

  .bsplus-cal-status-dot {
    position: absolute;
    top: 7px;
    right: 26px;
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #22c55e;
    box-shadow: 0 0 0 2px var(--bsplus-cal-surface, #fff);
  }

  .bsplus-cal-chevron {
    display: flex;
    flex: 0 0 auto;
    width: 16px;
    height: 16px;
    margin-left: auto;
    opacity: 0.6;
    pointer-events: none;
  }

  .bsplus-cal-chevron svg {
    width: 100%;
    height: 100%;
  }

  .bsplus-cal-spinner {
    position: absolute;
    right: 10px;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    border: 2px solid color-mix(in srgb, var(--bsplus-cal-accent, #3b82f6) 25%, transparent);
    border-top-color: var(--bsplus-cal-accent, #3b82f6);
    animation: bsplus-cal-spin 0.7s linear infinite;
  }

  @keyframes bsplus-cal-spin {
    to {
      transform: rotate(360deg);
    }
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
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
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

  .bsplus-cal-coming-soon {
    margin-top: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px dashed var(--bsplus-cal-border, color-mix(in srgb, var(--bsplus-cal-text) 18%, transparent));
  }

  .bsplus-cal-coming-soon-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: color-mix(in srgb, var(--bsplus-cal-text, #111) 70%, transparent);
  }

  .bsplus-cal-coming-soon-hint {
    display: block;
    margin-top: 2px;
    font-size: 10px;
    color: color-mix(in srgb, var(--bsplus-cal-text, #111) 50%, transparent);
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
