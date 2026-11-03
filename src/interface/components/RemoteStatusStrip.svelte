<script lang="ts">
  import { getRemoteStatus } from "@/seqta/utils/remoteStatus";

  const status = getRemoteStatus();
  const message = status.message ?? (status.off ? "BetterSEQTA+ is temporarily disabled." : null);
</script>

{#if message}
  <div
    class="shrink-0 border-b border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-50"
    role="status"
  >
    <p class="leading-relaxed">{message}</p>
  </div>
{/if}
