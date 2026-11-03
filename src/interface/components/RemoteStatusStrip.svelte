<script lang="ts">
  import { choosePause, getRemoteStatus, isPaused, pauseMessage } from "@/seqta/utils/remoteStatus";

  const status = getRemoteStatus();
  const message = status.off ? pauseMessage() : status.message;

  async function runAnyway() {
    await choosePause(true);
    location.reload();
  }
</script>

{#if message}
  <div
    class="flex shrink-0 items-center gap-3 border-b border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-50"
    role="status"
  >
    <p class="flex-1 leading-relaxed">{message}</p>
    {#if isPaused()}
      <button
        type="button"
        class="shrink-0 rounded-lg px-3 py-1.5 font-semibold ring-1 ring-current"
        onclick={runAnyway}>Run Anyway</button
      >
    {/if}
  </div>
{/if}
