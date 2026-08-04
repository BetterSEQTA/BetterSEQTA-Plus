<script lang="ts">
  let {
    label,
    active = false,
    nested = false,
    emphasized = false,
    trackId,
    onclick,
  } = $props<{
    label: string;
    active?: boolean;
    nested?: boolean;
    emphasized?: boolean;
    trackId?: string;
    onclick: () => void;
  }>();
</script>

<button
  type="button"
  data-nav-section={trackId}
  {onclick}
  class="relative z-10 rounded-lg text-left transition-[color,background-color] duration-200
    {nested
      ? 'ml-4 w-[calc(100%-1rem)] px-3 py-2 text-base'
      : 'w-full px-3 py-2.5 text-lg'}
    {active || emphasized
    ? 'font-medium text-zinc-900 dark:text-white'
    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'}"
  aria-current={active ? "page" : undefined}
>
  {label}
</button>
