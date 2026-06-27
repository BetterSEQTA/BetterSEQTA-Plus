<script lang="ts">
  import { fade } from "svelte/transition";

  let {
    open = false,
    busy = false,
    onConfirm,
    onCancel,
  } = $props<{
    open?: boolean;
    busy?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
  }>();
</script>

{#if open}
  <div
    class="bsplus-cal-modal-backdrop"
    onclick={(e) => {
      if (e.target === e.currentTarget && !busy) onCancel();
    }}
    onkeydown={(e) => {
      if (e.key === "Escape" && !busy) onCancel();
    }}
    role="presentation"
    transition:fade={{ duration: 150 }}
  >
    <div
      class="bsplus-cal-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bsplus-cal-disconnect-title"
      transition:fade={{ duration: 180 }}
    >
      <h2 id="bsplus-cal-disconnect-title" class="bsplus-cal-modal-title">
        Disconnect Google Calendar?
      </h2>
      <p class="bsplus-cal-modal-body">
        Your synced timetable events will stay in Google Calendar, but BetterSEQTA+ will stop
        updating them until you connect again.
      </p>
      <div class="bsplus-cal-modal-actions">
        <button
          type="button"
          class="bsplus-cal-btn bsplus-cal-btn--ghost"
          disabled={busy}
          onclick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          class="bsplus-cal-btn bsplus-cal-btn--danger"
          disabled={busy}
          onclick={() => void onConfirm()}
        >
          {busy ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .bsplus-cal-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  }

  .bsplus-cal-modal {
    width: min(100%, 400px);
    padding: 20px;
    border-radius: 16px;
    background: var(--bsplus-cal-surface, #fff);
    color: var(--bsplus-cal-text, #111);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.22);
    border: 1px solid color-mix(in srgb, var(--bsplus-cal-text, #111) 12%, transparent);
  }

  .bsplus-cal-modal-title {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.3;
  }

  .bsplus-cal-modal-body {
    margin: 0 0 20px;
    font-size: 14px;
    line-height: 1.5;
    color: color-mix(in srgb, var(--bsplus-cal-text, #111) 72%, transparent);
  }

  .bsplus-cal-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .bsplus-cal-btn {
    padding: 8px 14px;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .bsplus-cal-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .bsplus-cal-btn--ghost {
    background: color-mix(in srgb, var(--bsplus-cal-text, #111) 8%, transparent);
    color: var(--bsplus-cal-text, #111);
  }

  .bsplus-cal-btn--ghost:hover:not(:disabled) {
    background: color-mix(in srgb, var(--bsplus-cal-text, #111) 14%, transparent);
  }

  .bsplus-cal-btn--danger {
    background: #dc2626;
    color: #fff;
  }

  .bsplus-cal-btn--danger:hover:not(:disabled) {
    background: #b91c1c;
  }
</style>
