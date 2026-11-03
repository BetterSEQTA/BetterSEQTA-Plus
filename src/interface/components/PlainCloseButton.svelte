<script lang="ts">
  import XIcon from "@lucide/svelte/icons/x";
  let {
    onclick,
    label = "Close",
  }: {
    onclick: () => void;
    label?: string;
  } = $props();
</script>

<button
  type="button"
  {onclick}
  class="flex h-10 w-10 shrink-0 items-center justify-center text-zinc-500 transition-[color,transform] duration-150 hover:text-zinc-950 active:scale-[0.96] dark:text-zinc-400 dark:hover:text-white"
  aria-label={label}
>
  <XIcon class="h-6 w-6" />
</button>
