<script lang="ts">
  import type { Snippet } from "svelte";

  let { class: className = "", children }: { class?: string; children: Snippet } = $props();
</script>

<div class="border-none">
  <div
    class="p-1 my-1 from-white to-zinc-100 bg-gradient-to-br rounded-xl border shadow-sm border-zinc-200/50 dark:border-zinc-700/40 dark:to-zinc-900/50 dark:from-zinc-900/40 {className}"
  >
    {@render children()}
  </div>
</div>
