<script lang="ts">
  let { width, height } = $props<{ width?: string; height?: string }>();
</script>

<div
  style="width: {width ? width : '100%'}; height: {height ? height : '100%'};"
  class="animate-pulse rounded-xl border border-zinc-200 bg-zinc-200 dark:border-zinc-700/80 dark:bg-zinc-800"
></div>
