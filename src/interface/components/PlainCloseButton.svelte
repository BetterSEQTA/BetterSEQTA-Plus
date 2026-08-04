<script lang="ts">
  let { onclick, label = "Close" } = $props<{
    onclick: () => void;
    label?: string;
  }>();
</script>

<button
  type="button"
  {onclick}
  class="flex h-10 w-10 shrink-0 items-center justify-center text-zinc-500 transition-[color,transform] duration-150 hover:text-zinc-950 active:scale-[0.96] focus:outline-none dark:text-zinc-400 dark:hover:text-white"
  aria-label={label}
>
  <svg
    class="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
</button>
