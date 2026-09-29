<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    open = false,
    busy = false,
    maxWidthClass = "max-w-lg",
    labelledBy,
    onClose,
    children,
  }: {
    open?: boolean;
    busy?: boolean;
    maxWidthClass?: string;
    labelledBy?: string;
    onClose: () => void;
    children: Snippet;
  } = $props();
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget && !busy) onClose();
    }}
  >
    <div
      class="max-h-[90dvh] w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-800 {maxWidthClass}"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      {@render children()}
    </div>
  </div>
{/if}
