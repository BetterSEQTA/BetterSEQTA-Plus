<script lang="ts">
  import type { GoogleCalendarSyncProgress } from "@/seqta/utils/googleCalendar/types";

  let {
    progress = null,
  } = $props<{
    progress?: GoogleCalendarSyncProgress | null;
  }>();

  const percent = $derived(
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : progress?.phase === "preparing"
        ? 8
        : 0,
  );
</script>

{#if progress && progress.phase !== "done"}
  <div class="bsplus-cal-progress" role="status" aria-live="polite" aria-busy="true">
    <div class="bsplus-cal-progress-label">{progress.message}</div>
    <div class="bsplus-cal-progress-track" aria-hidden="true">
      <div class="bsplus-cal-progress-bar" style:width={`${percent}%`}></div>
    </div>
    {#if progress.total > 0}
      <div class="bsplus-cal-progress-meta">{progress.current} / {progress.total}</div>
    {/if}
  </div>
{/if}

<style>
  .bsplus-cal-progress {
    margin-top: 8px;
    padding: 10px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--bsplus-cal-accent, var(--better-main, #3b82f6)) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--bsplus-cal-accent, var(--better-main, #3b82f6)) 22%, transparent);
  }

  .bsplus-cal-progress-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--bsplus-cal-text, var(--text-primary, #111));
    margin-bottom: 8px;
  }

  .bsplus-cal-progress-track {
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    background: color-mix(in srgb, var(--bsplus-cal-text, #111) 10%, transparent);
  }

  .bsplus-cal-progress-bar {
    height: 100%;
    border-radius: 999px;
    background: var(--bsplus-cal-accent, var(--better-main, #3b82f6));
    transition: width 0.25s ease;
  }

  .bsplus-cal-progress-meta {
    margin-top: 6px;
    font-size: 10px;
    color: color-mix(in srgb, var(--bsplus-cal-text, #111) 62%, transparent);
    text-align: right;
  }
</style>
